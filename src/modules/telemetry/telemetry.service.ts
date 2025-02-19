import { Injectable } from '@nestjs/common';
import { Prisma, telemetry_logs } from '@prisma/client';
import { PrismaService } from '../../global-services/prisma.service';

@Injectable()
export class TelemetryService {
  constructor(private prisma: PrismaService) {}

  async capture(data: Prisma.telemetry_logsCreateInput): Promise<telemetry_logs> {
    return this.prisma.telemetry_logs.create({ data });
  }

  async getEvents(
    filters: {
      errorType?: string;
      sessionId?: string;
      eid?: string;
      platform?: string
    },
    page: number,
    pageSize: number,
  ): Promise<telemetry_logs[]> {
    const { errorType, sessionId, eid, platform } = filters;

    return this.prisma.telemetry_logs.findMany({
      where: {
        errorType: errorType || undefined,
        sessionId: sessionId || undefined,
        eid: eid || undefined,
        platform: platform || undefined
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }
}