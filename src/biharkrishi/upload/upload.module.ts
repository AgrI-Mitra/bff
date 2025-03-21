import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { PrismaService } from 'src/global-services/prisma.service';

@Module({
  controllers: [UploadController],
  providers: [UploadService, PrismaService],
})
export class UploadModule {} 