import { Module } from '@nestjs/common';
import { TelemetryService } from './telemetry.service';
import { TelemetryController } from './telemetry.controller';
import { PrismaService } from '../../global-services/prisma.service';

@Module({
  imports: [],
  controllers: [TelemetryController],
  providers: [TelemetryService, PrismaService],
})
export class TelemetryModule {}