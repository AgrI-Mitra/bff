import { CacheModule, Module, ValidationPipe } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaService } from "./global-services/prisma.service";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { UserModule } from "./modules/user/user.module";
import { APP_GUARD, APP_PIPE } from "@nestjs/core";
import { ConversationService } from "./modules/conversation/conversation.service";
import { ConversationModule } from "./modules/conversation/conversation.module";
import { PrometheusModule } from "@willsoto/nestjs-prometheus";
import { RateLimiterGuard } from './rate-limiter.guard';
import { ThrottlerModule } from '@nestjs/throttler';
import { MonitoringModule } from "./modules/monitoring/monitoring.module";
import { PromptModule } from "./xstate/prompt/prompt.module";
import { MonitoringController } from "./modules/monitoring/monitoring.controller";
import { CacheProvider } from "./modules/cache/cache.provider";
import { HttpModule } from "@nestjs/axios";
import { LoggerModule } from 'nestjs-pino';
import { HealthModule } from "./modules/health/health.module";
import { MetricsModule } from './metrics/metrics.module';
import { QuestionsController } from "./biharkrishi/fetch-db-response/fetchdbresponse.controller";
import { QuestionsService } from "./biharkrishi/fetch-db-response/fetchdbresponse.service";
import { UploadModule } from './biharkrishi/upload/upload.module';


@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        name: 'Telemetry',
        transport: {
          targets: [
            {
              target: 'pino-pretty'
            },
            {
              level: process.env.NODE_ENV !== 'production' ? 'debug' : 'warn',
              target: 'pino-loki',
              options: {
                batching: true,
                interval: 5,
                host: process.env.LOKI_INTERNAL_BASE_URL,
                labels: {
                  app: 'Telemetry',
                  namespace: process.env.NODE_ENV || 'development',
                },
              },
            }
          ]
        }
      },
    }),
    HttpModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    UserModule,
    ConversationModule,
    MonitoringModule,
    PrometheusModule.register({
      defaultMetrics:{
        enabled: false
      }
    }),
    PromptModule,
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 10,
    }),
    CacheModule.register(),
    HealthModule,
    MetricsModule,
    UploadModule,
  ],
  controllers: [AppController, QuestionsController],
  providers: [
    AppService,
    PrismaService,
    ConfigService,
    ConversationService,
    QuestionsService,
    MonitoringController,
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
    {
      provide: APP_GUARD,
      useClass: RateLimiterGuard,
    },
    CacheProvider
  ],
  exports: [CacheProvider],
})
export class AppModule {}