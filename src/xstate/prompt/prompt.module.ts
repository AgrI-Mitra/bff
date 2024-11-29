import { HttpModule } from "@nestjs/axios";
import { CacheModule, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "src/global-services/prisma.service";
import { AiToolsService } from "src/modules/aiTools/ai-tools.service";
import { UserService } from "src/modules/user/user.service";

@Module({
  imports: [CacheModule.register(),HttpModule],
  providers: [
    PrismaService,
    ConfigService,
    AiToolsService,
    UserService
  ],
  controllers: [],
})
export class PromptModule {}