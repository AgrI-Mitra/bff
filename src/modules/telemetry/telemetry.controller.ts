
import { Controller, Get, Post, Query, Body, ParseIntPipe } from '@nestjs/common';
import { TelemetryService } from './telemetry.service';
import { telemetry_logs } from '@prisma/client';

@Controller('telemetry')
export class TelemetryController {
  constructor(private telemetryLogsService: TelemetryService) {}

  @Post('/capture')
  async createLog(@Body() data: telemetry_logs): Promise<telemetry_logs> {
    return this.telemetryLogsService.capture(data);
  }

  @Get('/events')
  async getEvents(
    @Query('errorType') errorType?: string,
    @Query('sessionId') sessionId?: string,
    @Query('eid') eid?: string,
    @Query('platform') platform?: string,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '10',
  ): Promise<telemetry_logs[]> {
    const filters = {
      errorType,
      sessionId,
      eid,
      platform
    };

    return this.telemetryLogsService.getEvents(filters, parseInt(page), parseInt(pageSize));
  }
}






