import { Controller, Post, Req, BadRequestException } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { UploadService } from './upload.service';
import { MultipartFile } from '@fastify/multipart';

interface MultipartFields {
  [key: string]: string | MultipartFile | (string | MultipartFile)[];
}

@Controller('upload-csv')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  async uploadFile(@Req() req: FastifyRequest) {
    try {
      const data = await req.file();
      
      if (!data) {
        throw new BadRequestException('No file uploaded');
      }

      // Get scheme name from form data
      const fields = await data.fields as MultipartFields;
      const schemeField = fields['scheme-name'];
      
      // Extract the actual value from the field
      let schemeName: string | undefined;
      
      if (typeof schemeField === 'string') {
        schemeName = schemeField;
      } else if (Array.isArray(schemeField)) {
        const firstField = schemeField[0];
        schemeName = typeof firstField === 'string' ? firstField : (firstField as any).value;
      } else if (schemeField) {
        // Cast to any to access the value property
        schemeName = (schemeField as any).value;
      }

      if (!schemeName) {
        throw new BadRequestException('Scheme name is required');
      }
      
      return this.uploadService.processCsv(
        data.file, 
        schemeName,
        data.filename || 'unknown-file'
      );
    } catch (error) {
      console.error('Error in uploadFile:', error);
      throw error;
    }
  }
} 