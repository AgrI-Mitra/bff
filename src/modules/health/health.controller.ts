import { Controller, Get, Post } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HealthService } from './health.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { HealthCheckResponse } from './types/health.types';
import { Logger } from '@nestjs/common';
import { firstValueFrom, timeout } from 'rxjs';


@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);
  constructor(private healthService: HealthService,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  @Get()
  async checkHealth(): Promise<HealthCheckResponse> {
    return this.healthService.checkAllServices();
  }

  @Post()
  async checkHealthPost(): Promise<HealthCheckResponse> {
    return this.healthService.checkAllServices();
  }

  @Get('ping')
  async ping() {
    return this.doPing();
  }

  @Post('ping')
  async pingPost() {
    return this.doPing();
  }

  private async doPing() {
    try {
      const port = this.configService.get('PORT') || 3000;
      const baseUrl = `http://0.0.0.0:${port}`;
      
      this.logger.log('Checking service health at:', baseUrl);
      
      const response = await firstValueFrom(
        this.httpService.get(baseUrl).pipe(timeout(5000))
      );

      this.logger.log('Service health check response:', {
        status: response.status,
        data: response.data
      });

      if (response.status === 200) {
        return {
          status: 'ok',
          details: {
            bff: {
              status: 'up',
              timestamp: new Date().toISOString(),
              responseTime: `${response.status}ms`,
            }
          }
        };
      } else {
        throw new Error(`Service returned status ${response.status}`);
      }
    } catch (error) {
      this.logger.error('Service health check failed:', error.message);
      
      return {
        status: 'error',
        details: {
          bff: {
            status: 'down',
            error: error.message,
            timestamp: new Date().toISOString()
          }
        }
      };
    }
  }

  @Cron(CronExpression.EVERY_3_HOURS)
  async handleCron() {
    this.logger.log('Running scheduled health check');
    try {
      const healthStatus = await this.healthService.checkAllServices();
      const pingStatus = await this.ping();
      this.logger.log(`Health check completed with status: ${healthStatus.status}`);
      this.logger.log(`Ping check completed with status: ${pingStatus.status}`);
    } catch (error) {
      this.logger.error('Health check failed:', error);
    }
  }
}