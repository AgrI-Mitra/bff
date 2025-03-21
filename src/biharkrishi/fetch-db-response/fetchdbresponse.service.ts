import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/global-services/prisma.service";

@Injectable()
export class QuestionsService {
  constructor(private prisma: PrismaService) {}

  async fetchResponse(userQuestion: string): Promise<{ question: string; response: string; intent: string; schemeId: number; schemeName: string }> {
    // Step 1: Check if the question matches a MainQuestion
    const mainQuestion = await this.prisma.mainQuestion.findFirst({
      where: { question: userQuestion },
      select: { 
        question: true, 
        response: true, 
        intent: true,         // Include intent
        schemeId: true,       // Include schemeId
        scheme: {             // Include related scheme name
          select: { name: true }
        }
      },
    });

    if (mainQuestion && mainQuestion.scheme) {
      return {
        question: mainQuestion.question,
        response: mainQuestion.response,
        intent: mainQuestion.intent,
        schemeId: mainQuestion.schemeId,
        schemeName: mainQuestion.scheme.name
      };
    }

    // Step 2: Check if the question matches a Variation
    const variation = await this.prisma.variations.findFirst({
      where: { variation: userQuestion },
      select: { 
        mainQuestion: { 
          select: { 
            question: true, 
            response: true, 
            intent: true,      // Include intent
            schemeId: true,    // Include schemeId
            scheme: {          // Include related scheme name
              select: { name: true }
            }
          } 
        } 
      },
    });

    if (variation && variation.mainQuestion && variation.mainQuestion.scheme) {
      const mq = variation.mainQuestion;
      return {
        question: mq.question,
        response: mq.response,
        intent: mq.intent,
        schemeId: mq.schemeId,
        schemeName: mq.scheme.name
      };
    }

    // Step 3: If no match, throw an error
    throw new NotFoundException('No matching question found in the database.');
  }
}
