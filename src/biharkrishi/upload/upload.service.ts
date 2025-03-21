import { Injectable, Logger } from '@nestjs/common';
import * as csv from 'csv-parser';
import { PrismaService } from 'src/global-services/prisma.service';
import { Readable } from 'stream';
import { UploadMetrics } from './interfaces/upload-metrics.interface';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private uploadStartTime: number;

  constructor(private prisma: PrismaService) {}

  async processCsv(fileStream: Readable, schemeName: string, fileName: string) {
    this.uploadStartTime = Date.now();
    const results: any[] = [];
    const metrics: UploadMetrics = {
      status: 'STARTED',
      fileName,
      schemeName,
      mainQuestionsCount: 0,
      variationsCount: 0,
      uploadDate: new Date(),
      processingTimeMs: 0,
      errorMessage: undefined
    };

    // Create initial summary record
    await this.prisma.summary.create({
      data: {
        fileName,
        schemeName,
        status: 'STARTED',
        mainQuestionsCount: 0,
        variationsCount: 0,
      }
    });
    
    try {
      return new Promise((resolve, reject) => {
        fileStream.pipe(csv())
          .on('headers', (headers) => {
            this.logger.log(`Processing CSV file: ${fileName} with headers: ${headers.join(', ')}`);
          })
          .on('data', (data: any) => {
            if (this.isValidRow(data)) {
              results.push(data);
            } else {
              this.logger.warn(`Invalid data row in ${fileName}:`, JSON.stringify(data));
            }
          })
          .on('error', async (error) => {
            metrics.status = 'FAILED';
            metrics.errorMessage = error.message;
            metrics.processingTimeMs = Date.now() - this.uploadStartTime;
            await this.updateSummary(metrics);
            this.logMetrics(metrics);
            reject(error);
          })
          .on('end', async () => {
            try {
              const uniqueMainQuestions = this.getUniqueMainQuestions(results);
              
              // Start transaction for the main data processing
              await this.prisma.$transaction(async (prisma) => {
                // Create or find the scheme first
                const scheme = await prisma.scheme.upsert({
                  where: { name: schemeName },
                  update: {},
                  create: {
                    name: schemeName,
                  }
                });

                let processedVariations = 0;
                
                for (const mainQ of uniqueMainQuestions) {
                  // Create main question with schemeId
                  const mainQuestion = await prisma.mainQuestion.create({
                    data: {
                      intent: mainQ.intent,
                      question: mainQ.question,
                      response: mainQ.response,
                      schemeId: scheme.id,
                    }
                  });

                  const relatedRows = results.filter(row => 
                    row['Main Question'] === mainQ.question
                  );

                  // Process variations in batch
                  const variations = relatedRows
                    .filter(row => row['Alternate Questions'])
                    .map(row => ({
                      variation: row['Alternate Questions'].trim(),
                      mainQuestionId: mainQuestion.id,
                    }));

                  if (variations.length > 0) {
                    await prisma.variations.createMany({
                      data: variations,
                    });
                    processedVariations += variations.length;
                  }
                }

                // Update metrics for successful processing
                metrics.status = 'COMPLETED';
                metrics.mainQuestionsCount = uniqueMainQuestions.length;
                metrics.variationsCount = processedVariations;
                metrics.processingTimeMs = Date.now() - this.uploadStartTime;
              });

              // Update summary after successful transaction
              await this.updateSummary(metrics);

              // Log final metrics
              this.logMetrics(metrics);

              resolve({
                message: 'CSV processing completed successfully',
                metrics
              });
            } catch (error) {
              // If transaction fails, nothing is committed to database
              metrics.status = 'FAILED';
              metrics.errorMessage = error.message;
              metrics.processingTimeMs = Date.now() - this.uploadStartTime;
              metrics.mainQuestionsCount = 0;
              metrics.variationsCount = 0;
              
              await this.updateSummary(metrics);
              this.logMetrics(metrics);
              reject(error);
            }
          });
      });
    } catch (error) {
      metrics.status = 'FAILED';
      metrics.errorMessage = error.message;
      metrics.processingTimeMs = Date.now() - this.uploadStartTime;
      await this.updateSummary(metrics);
      this.logMetrics(metrics);
      throw error;
    }
  }

  private async updateSummary(metrics: UploadMetrics) {
    try {
      await this.prisma.summary.updateMany({
        where: {
          fileName: metrics.fileName,
          schemeName: metrics.schemeName,
        },
        data: {
          status: metrics.status,
          mainQuestionsCount: metrics.mainQuestionsCount,
          variationsCount: metrics.variationsCount,
          errorMessage: metrics.errorMessage,
          updatedAt: new Date(),
        }
      });
    } catch (error) {
      this.logger.error('Failed to update summary', error.stack);
    }
  }

  private logMetrics(metrics: UploadMetrics) {
    this.logger.log({
      message: 'CSV Upload Metrics',
      ...metrics,
      timestamp: new Date().toISOString()
    });
  }

  private getUniqueMainQuestions(results: any[]) {
    const uniqueQuestions = new Map();
    
    results.forEach(row => {
      if (!uniqueQuestions.has(row['Main Question'])) {
        uniqueQuestions.set(row['Main Question'], {
          intent: row['Query Intent'],
          question: row['Main Question'],
          response: row['English response (Current tallied from Production)']
        });
      }
    });

    return Array.from(uniqueQuestions.values());
  }

  private isValidRow(data: any): boolean {
    const requiredFields = [
      'Query Intent', 
      'Main Question', 
      'English response (Current tallied from Production)'
    ];
    
    for (const field of requiredFields) {
      const value = data[field] || '';
      if (!value.trim()) {
        this.logger.error(`Invalid or missing data for field: ${field}`, JSON.stringify(data));
        return false;
      }
    }
    return true;
  }
} 