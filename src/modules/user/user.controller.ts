import { Body, Controller, Get, Param, Post, Headers } from '@nestjs/common';
import { UserService } from './user.service';
import { PrismaService } from 'src/global-services/prisma.service';
import { Message } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { LokiLogger } from '../loki-logger/loki-logger.service';
import { HttpService } from '@nestjs/axios';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiHeader } from '@nestjs/swagger';
const { v5: uuidv5 } = require('uuid');

@ApiTags('User')
@Controller('user')
export class UserController {
  private logger: LokiLogger;
  constructor(
    private readonly userService: UserService,
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService
  ) {
    this.logger = new LokiLogger(
      'main',
      new HttpService(),
      this.configService,
    );
  }

  @ApiOperation({ summary: 'Generate user ID' })
  @ApiParam({ name: 'identifier', description: 'Unique identifier to generate UUID' })
  @ApiResponse({ status: 200, description: 'User ID generated successfully' })
  @Post('/generateUserId/:identifier')
  async generateUserId(@Param("identifier") identifier: string) {
    const uuid = uuidv5(identifier, uuidv5.DNS);
    return uuid
  }

  @ApiOperation({ summary: 'Like a message' })
  @ApiParam({ name: 'id', description: 'Message ID to like' })
  @ApiResponse({ status: 200, description: 'Message liked successfully' })
  @Get("message/like/:id")
  async likeQuery(@Param('id') id: string): Promise<Message> {
    return this.userService.likeQuery(id);
  }

  @ApiOperation({ summary: 'Dislike a message' })
  @ApiParam({ name: 'id', description: 'Message ID to dislike' })
  @ApiResponse({ status: 200, description: 'Message disliked successfully' })
  @Get("message/dislike/:id")
  async dislikeQuery(@Param('id') id: string): Promise<Message> {
    return this.userService.dislikeQuery(id);
  }

  @ApiOperation({ summary: 'Remove reaction from message' })
  @ApiParam({ name: 'id', description: 'Message ID to remove reaction from' })
  @ApiResponse({ status: 200, description: 'Reaction removed successfully' })
  @Get("message/removelike/:id")
  async removeLike(@Param('id') id: string): Promise<Message> {
    return this.userService.removeReactionOnQuery(id);
  }
}