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
import { LokiLoggerModule } from "./modules/loki-logger/loki-logger.module";
import { HttpModule } from "@nestjs/axios";

@Module({
  imports: [
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
      ttl: 60, // Time in seconds for the window (e.g., 60 seconds)
      limit: 10, // Maximum requests per window
    }),
    CacheModule.register(),
    LokiLoggerModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService,
    ConfigService,
    ConversationService,
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