import { Module } from '@nestjs/common';
import { HttpModule, HttpService } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LokiLogger } from './loki-logger.service';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [
    {
      provide: LokiLogger,
      useFactory: (httpService: HttpService, configService: ConfigService) => {
        return new LokiLogger('YourAppName', httpService, configService);
      },
      inject: [HttpService, ConfigService],
    },
  ],
  exports: [LokiLogger],
})
export class LokiLoggerModule {}