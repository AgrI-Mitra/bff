import { Controller, Get, Post } from '@nestjs/common';
import { MetricsService } from './metrics.service';

@Controller('metric')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  async getMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }

  @Post('update')
  async updateMetrics(): Promise<string> {
    await this.metricsService.forceUpdate();
    return 'Metrics updated';
  }
}