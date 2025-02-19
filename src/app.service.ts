import { Injectable } from "@nestjs/common";
import { PromptDto } from "./app.controller";
import { Language } from "./language";
import { PrismaService } from "./global-services/prisma.service";
// Overlap between LangchainAI and Prompt-Engine
const cron = require('node-cron');
export interface Prompt {
  input: PromptDto;
  output?: string;
  inputLanguage?: Language;
  inputTextInEnglish?: string;
  maxTokens?: number;
  outputLanguage?: Language;
  similarDocs?: any;

  // More output metadata
  timeTaken?: number;
  timestamp?: number;
  responseType?: string;
}
@Injectable()
export class AppService {
  constructor(
    private prismaService: PrismaService
  ){}
  getHello(): string {
    return "Hello World!";
  }

  onApplicationBootstrap() {
    // Schedule the task to run every hour (adjust as needed)
    console.log("scheduling cron for every 30min")
    cron.schedule('*/30 * * * *', () => {
      this.clearAadhaarNumbers();
    });
  }

  async clearAadhaarNumbers() {
    const currentTime = new Date();
    currentTime.setMinutes(currentTime.getMinutes() - 30);
    try {
      const conversations = await this.prismaService.conversation.findMany({
        where: {
          updatedAt: {
            lte: currentTime,
          },
          context: {
            path: ["userAadhaarNumber"],
            not: ''
          },
        },
      });
  
      for (const conversation of conversations) {
        const context: any = conversation.context
        await this.prismaService.conversation.update({
          where: { id: conversation.id },
          data: {
            context: {
              ...context,
              userAadhaarNumber: "",
              lastAadhaarDigits: "",
              isOTPVerified: false,
              type: '',
              query: '',
              state: `${context.currentState}(terminated)`,
              currentState: 'getUserQuestion',
              response: '',
            },
          },
        });
      }
  
      console.log('Cleared userAadhaarNumber in conversations older than 30 minutes.');
    } catch (error) {
      console.error('Error clearing Aadhaar numbers:', error);
    }
  }
}