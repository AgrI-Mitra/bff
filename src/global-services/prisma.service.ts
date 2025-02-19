import { HttpService } from "@nestjs/axios";
import {
  INestApplication,
  Injectable,
  Logger,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly configService = new ConfigService(); 
  private readonly logger = new Logger('main');
  async onModuleInit() {
    this.logger.verbose("Initialized and Connected 🎉");
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    this.$on("beforeExit", async () => {
      await app.close();
      this.logger.warn("DB: Graceful Shutdown 🎉");
    });
  }
}
