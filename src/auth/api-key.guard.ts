import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/global-services/prisma.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException('API key is missing');
    }

    const validKey = await this.prisma.apiKey.findFirst({
      where:
              {
                apiKey, isActive: true 
              },
    });

    // const validKey = await this.prisma.ApiKey.findFirst({
    //   where: { apiKey, isActive: true },
    // });

    if (!validKey) {
      throw new UnauthorizedException('Invalid or inactive API key');
    }

    return true;
  }
}
