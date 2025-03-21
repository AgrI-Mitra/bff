import { Controller, BadRequestException, UseGuards, Body, Post, Req, Get, Query } from '@nestjs/common';
import { QuestionsService } from './fetchdbresponse.service';
import { ApiKeyGuard } from 'src/auth/api-key.guard';
import { MonitoringService } from 'src/modules/monitoring/monitoring.service';

@Controller('questions')
export class QuestionsController {
  constructor(
    private readonly questionsService: QuestionsService,
    private readonly monitoringService: MonitoringService,
  ) {}

  @UseGuards(ApiKeyGuard)
  @Post('fetchdbresponse')
  async fetchDbResponse(
    @Body() body: { question: string, schemeName: string },
    @Req() request: any
  ) {
    const { question, schemeName } = body;
    const apiKey = request.headers['x-api-key'];

    if (!question) {
      await this.monitoringService.logBiharKrishiMetric({
        apiKey,
        question,
        schemeName,
        status: 'FAILURE',
      });
      throw new BadRequestException('The question field in the body is required.');
    }

    try {
      // Keep the existing prometheus metrics
      this.monitoringService.incrementBiharKrishiQuestionsCount();
      this.monitoringService.incrementBiharKrishiSchemeCount(schemeName);
      this.monitoringService.incrementBiharKrishiApiKeyUsage(apiKey);

      const response = await this.questionsService.fetchResponse(question, schemeName);
      
      // Log success metric
      await this.monitoringService.logBiharKrishiMetric({
        apiKey,
        question,
        schemeName,
        status: 'SUCCESS',
      });
      
      this.monitoringService.incrementBiharKrishiSuccessCount();
      return response;
    } catch (error) {
      // Log failure metric
      await this.monitoringService.logBiharKrishiMetric({
        apiKey,
        question,
        schemeName,
        status: 'FAILURE',
      });
      
      this.monitoringService.incrementBiharKrishiFailureCount();
      throw error;
    }
  }

  @UseGuards(ApiKeyGuard)
  @Get('metrics')
  async getBiharKrishiMetrics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('schemeName') schemeName?: string,
    @Query('apiKey') apiKey?: string,
    @Query('status') status?: string,
  ) {
    return await this.monitoringService.getBiharKrishiMetrics({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      schemeName,
      apiKey,
      status,
    });
  }
}