import { HttpModule } from "@nestjs/axios";
import { CacheModule, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "src/global-services/prisma.service";
import { AiToolsService } from "src/modules/aiTools/ai-tools.service";
import { PmfbyModule } from "src/modules/pmfby/pmfby.module";
import { PmfbyService } from "src/modules/pmfby/pmfby.service";
import { SoilhealthcardService } from "src/modules/soilhealthcard/soilhealthcard.service";
import { UserService } from "src/modules/user/user.service";
import { UserModule } from "src/modules/user/user.module";
import { PromptServices } from "./prompt.service";

@Module({
  imports: [
    CacheModule.register(),
    HttpModule,
    UserModule,
  ],
  providers: [
    PrismaService,
    ConfigService,
    AiToolsService,
    UserService,
    SoilhealthcardService,
    PmfbyService,
    PromptServices,
  ],
  controllers: [],
  exports: [PromptServices]
})
export class PromptModule {}