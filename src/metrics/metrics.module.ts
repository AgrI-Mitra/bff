import { Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { HealthModule } from 'src/modules/health/health.module';

@Module({
  imports: [HealthModule], // Import the HealthModule to inject HealthService into MetricsService
  providers: [MetricsService], // Provide the MetricsService
  controllers: [MetricsController], // Add the MetricsController
})
export class MetricsModule {}
