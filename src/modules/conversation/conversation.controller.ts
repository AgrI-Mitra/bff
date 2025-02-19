import { Controller, Post, Body, Get } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';

@ApiTags('Conversation')
@Controller('conversation')
export class ConversationController {
  constructor(private conversationService: ConversationService) {}

  @ApiOperation({ summary: 'Create or update feedback' })
  @ApiBody({ 
    description: 'Feedback data',
    schema: {
      type: 'object',
      properties: {
        // Add properties based on your feedback structure
        feedback: { type: 'string' },
        rating: { type: 'number' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Feedback successfully created/updated' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @Post('/feedback')
  async createOrUpdateFeedback(@Body() body: any){
    return this.conversationService.createOrUpdateFeedback(body)
  }
}