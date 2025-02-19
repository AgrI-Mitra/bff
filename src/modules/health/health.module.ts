import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
// import { PrismaService } from '../global-services/prisma.service';
import { PrismaService } from 'src/global-services/prisma.service';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/common';
import { healthConfig } from './config/health.config';
// import { CacheProvider } from '../modules/cache/cache.provider';
import { CacheProvider } from '../cache/cache.provider';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    TerminusModule,
    HttpModule,
    ConfigModule.forFeature(healthConfig),
    CacheModule.register(),
    ScheduleModule.forRoot(),
  ],
  controllers: [HealthController],
  providers: [
    HealthService,
    PrismaService,
    CacheProvider
  ],
  exports: [HealthService],
})
export class HealthModule {}