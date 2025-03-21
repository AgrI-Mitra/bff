import { Controller, BadRequestException, UseGuards, Body, Post } from '@nestjs/common';
import { QuestionsService } from './fetchdbresponse.service';
import { ApiKeyGuard } from 'src/auth/api-key.guard';

@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @UseGuards(ApiKeyGuard)
  @Post('fetchdbresponse')
  async fetchDbResponse(@Body() body: { question: string }) {
    const { question } = body;
    if (!question) {
      throw new BadRequestException('The question field in the body is required.');
    }

    return await this.questionsService.fetchResponse(question);
  }
}