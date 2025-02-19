import { Controller, Post, Body, Get } from '@nestjs/common';
import { ConversationService } from './conversation.service';

@Controller('conversation')
export class ConversationController {
  constructor(private conversationService: ConversationService) {}
  @Post('/feedback')
  async createOrUpdateFeedback(@Body() body: any){
    return this.conversationService.createOrUpdateFeedback(body)
  }
}