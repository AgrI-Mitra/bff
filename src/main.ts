import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { PrismaService } from "./global-services/prisma.service";
import { ConfigService } from "@nestjs/config";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import compression from "@fastify/compress";
import { join } from "path";
import { MonitoringService } from "./modules/monitoring/monitoring.service";
import { LokiLogger } from "./modules/loki-logger/loki-logger.service";
import { HttpService } from "@nestjs/axios";
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0'

  /** Fastify Application */
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ bodyLimit: 10048576 })
  );

  /** Register Prismaservice LifeCycle hooks */
  const prismaService: PrismaService = app.get(PrismaService);
  prismaService.enableShutdownHooks(app);

  /** Global prefix: Will result in appending of keyword 'admin' at the start of all the request */
  const configService = app.get<ConfigService>(ConfigService);
  const logger = new LokiLogger(
    'main',
    new HttpService(),
    configService,
  );

  // Setup Swagger
  const config = new DocumentBuilder()
    .setTitle('PM Kisan API Documentation')
    .setDescription('The PM Kisan API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: [`'self'`],
        styleSrc: [`'self'`, `'unsafe-inline'`],
        imgSrc: [`'self'`, "data:", "validator.swagger.io"],
        scriptSrc: [`'self'`, `https: 'unsafe-inline'`],
      },
    },
  });

  process.on('exit', (code) => {
    logger.log(`Process is exiting with code: ${code}`);
  })

  process.on('beforeExit', async () => {
    logger.log("process exit...")
    const monitoringService = app.get<MonitoringService>(MonitoringService);
    await monitoringService.onExit();
  });

  process.on('SIGINT', async () => {
    logger.log('Received SIGINT signal. Gracefully shutting down...');
    const monitoringService = app.get<MonitoringService>(MonitoringService);
    await monitoringService.onExit();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.log('Received SIGTERM signal. Gracefully shutting down...');
    const monitoringService = app.get<MonitoringService>(MonitoringService);
    await monitoringService.onExit();
    process.exit(0);
  });

  app.enableCors({
    origin: configService.get<string>('CORS_ALLOWED_ORIGINS', '').split(','),
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    credentials: true,
  });
  await app.register(multipart);
  await app.register(compression, { encodings: ["gzip", "deflate"] });
  app.useStaticAssets({ root: join(__dirname, "../../fileUploads") });
  await app.listen(3001, "0.0.0.0");
}

bootstrap();
