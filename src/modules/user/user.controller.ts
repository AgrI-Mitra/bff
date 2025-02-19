import { Body, Controller, Get, Param, Post, Headers } from '@nestjs/common';
import { UserService } from './user.service';
import { CustomLogger } from 'src/common/logger';
import { PrismaService } from 'src/global-services/prisma.service';
import { Message } from '@prisma/client';
const { v5: uuidv5 } = require('uuid');

@Controller('user')
export class UserController {
  private logger: CustomLogger;
  constructor(
    private readonly userService: UserService,
    private readonly prismaService: PrismaService
  ) {
    this.logger = new CustomLogger("UserService");
    this.prismaService = new PrismaService();
  }

  @Get("/sendotp/:identifier")
  async getOtp(@Param("identifier") identifier: string) {
    if(/^[6-9]\d{9}$/.test(identifier)) {
      return this.userService.sendOTP(identifier,"Mobile")
    } else if(identifier.length==14 && /^[6-9]\d{9}$/.test(identifier.substring(0,10))){
      return this.userService.sendOTP(identifier,"MobileAadhar")
    } else if(identifier.length==12 && /^\d+$/.test(identifier)){
      return this.userService.sendOTP(identifier,"Aadhar")
    } else if(identifier.length == 11) { 
      return this.userService.sendOTP(identifier,"Ben_id")
    } else {
      return {
        "status": "NOT_OK",
        "error": "Please enter a valid Beneficiary ID/Aadhaar Number/Phone number"
      }
    }
  }

  @Post("/verifyotp")
  async verifyOtp(@Body() body: any ) {
    if(/^[6-9]\d{9}$/.test(body.identifier)) {
      return this.userService.verifyOTP(body.identifier,body.otp,"Mobile")
    } else if(body.identifier.length==14 && /^[6-9]\d{9}$/.test(body.identifier.substring(0,10))){
      return this.userService.verifyOTP(body.identifier,body.otp,"MobileAadhar")
    } else if(body.identifier.length==12 && /^\d+$/.test(body.identifier)){
      return this.userService.verifyOTP(body.identifier,body.otp,"Aadhar")
    } else if(body.identifier.length == 11) { 
      return this.userService.verifyOTP(body.identifier,body.otp,"Ben_id")
    }else {
      return {
        "status": "NOT_OK",
        "error": "Please enter a valid Beneficiary ID/Aadhaar Number/Phone number"
      }
    }
  }

  @Get("/getUserData/:identifier")
  async getUserData(@Param("identifier") identifier: string) {
    if(/^[6-9]\d{9}$/.test(identifier)) {
      return this.userService.getUserData(identifier,"Mobile")
    } else if(identifier.length==14 && /^[6-9]\d{9}$/.test(identifier.substring(0,10))){
      return this.userService.getUserData(identifier,"MobileAadhar")
    } else if(identifier.length==12 && /^\d+$/.test(identifier)){
      return this.userService.getUserData(identifier,"Aadhar")
    } else if(identifier.length == 11) { 
      return this.userService.getUserData(identifier,"Ben_id")
    }else {
      return {
        "status": "NOT_OK",
        "error": "Please enter a valid Beneficiary ID/Aadhaar Number/Phone number"
      }
    }
  }

  @Post('/generateUserId/:identifier')
  async generateUserId(@Param("identifier") identifier: string) {
    const uuid = uuidv5(identifier, uuidv5.DNS);
    return uuid
  }

  @Get("/history/:flowId")
  async prompt(@Headers() headers,@Param("flowId") flowId: string): Promise<any> {
    const userId = headers["user-id"]
    if(!userId){
      return {
        "status": "NOT_OK",
        "error": "Invalid userId."
      }
    }
    let user;
    try{
      user = await this.prismaService.user.findUnique({
        where:{
          id: userId
        },
        select: {
          messages: {
            where: {
              flowId: flowId || '3'
            }
          }
        }
      })
    }catch{
      return {
        "status": "NOT_OK",
        "error": "Invalid userId."
      }
    }
    if(!user) {
      return {
        "status": "NOT_OK",
        "error": "Invalid userId."
      }
    }
    return {
      "status": "OK",
      "data": user.messages
    }
  }

  @Get("message/like/:id")
  async likeQuery(@Param('id') id: string): Promise<Message> {
    return this.userService.likeQuery(id);
  }

  @Get("message/dislike/:id")
  async dislikeQuery(@Param('id') id: string): Promise<Message> {
    return this.userService.dislikeQuery(id);
  }

  @Get("message/removelike/:id")
  async removeLike(@Param('id') id: string): Promise<Message> {
    return this.userService.removeReactionOnQuery(id);
  }
}