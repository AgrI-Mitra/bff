// src/middlewares/telemetry-processor.ts
import { PrismaService } from '../global-services/prisma.service';
import { Logger } from "@nestjs/common";

const prisma = new PrismaService();
const logger = new Logger('TelemetryProcessor');

const telemetryBatch: any[] = [];
const BATCH_INTERVAL = 60000; // 60 seconds

export function addToTelemetryBatch(deviceInfo: any) {
  telemetryBatch.push(deviceInfo);
}

async function processTelemetryBatch() {
    try {
      if (telemetryBatch.length === 0) return;
  
      const batchToProcess = [...telemetryBatch];
  
      const userIds = [...new Set(batchToProcess.map(info => info.userId))];
  
      const existingUsers = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true },
      });
  
      const existingUserIds = new Set(existingUsers.map(user => user.id));
      const validTelemetryData = batchToProcess.filter(info => existingUserIds.has(info.userId));
  
      if (validTelemetryData.length > 0) {
        await prisma.deviceMetrics.createMany({ data: validTelemetryData });
        logger.log(`Processed batch of ${validTelemetryData.length} telemetry entries`);
      }
  
      telemetryBatch.length = 0;
  
    } catch (error) {
      logger.error('Error processing telemetry batch', error.stack || error);
     
    }
  }
  
// Kick off background batch processor
setInterval(processTelemetryBatch, BATCH_INTERVAL);
