import { Controller, Get, Post, Headers, Body, Param, CACHE_MANAGER, Inject } from "@nestjs/common";
import { AppService, Prompt } from "./app.service";
import { IsNotEmpty,IsUUID, IsOptional } from 'class-validator';
import { interpret } from "xstate";
import { Language } from "./language";
import { ConfigService } from "@nestjs/config";
import { AiToolsService } from "./modules/aiTools/ai-tools.service";
import { formatStringsToTable, removeLinks, wordToNumber } from "./common/utils";
import { ConversationService } from "./modules/conversation/conversation.service";
import { PrismaService } from "./global-services/prisma.service";
import { CustomLogger } from "./common/logger";
import { MonitoringService } from "./modules/monitoring/monitoring.service";
import { PromptServices } from "./xstate/prompt/prompt.service";
import { TelemetryService } from "./modules/telemetry/telemetry.service";
import { Cache } from 'cache-manager'
const uuid = require('uuid');
const path = require('path');
const filePath = path.resolve(__dirname, './common/en.json');
const engMessage = require(filePath);
const argon2 = require('argon2');

export class PromptDto {
  @IsNotEmpty()
  type: "Text"|"Audio" ;
  @IsNotEmpty()
  text: string;
  @IsNotEmpty()
  @IsUUID()
  userId: string;
  @IsOptional()
  inputLanguage?: string;
  @IsOptional()
  media?: string;
  @IsOptional()
  appId?: string;
  @IsOptional()
  channel?: string;
  @IsOptional()
  @IsUUID()
  from?: string;
  @IsOptional()
  context?: string;
  @IsOptional()
  to?: string;
  @IsOptional()
  @IsUUID()
  messageId?: string;
  @IsOptional()
  @IsUUID()
  conversationId?: string;
  @IsOptional()
  identifier?: string;
}

@Controller()
export class AppController {
  private configService : ConfigService
  private aiToolsService: AiToolsService
  private conversationService: ConversationService
  private prismaService: PrismaService
  private promptService: PromptServices
  private logger: CustomLogger
  
  constructor(
    private readonly appService: AppService,
    private readonly monitoringService: MonitoringService,
    private readonly telemetryService: TelemetryService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache
  ) {
    this.prismaService = new PrismaService()
    this.configService = new ConfigService()
    this.aiToolsService = new AiToolsService(this.configService,this.monitoringService, this.cacheManager)
    this.conversationService = new ConversationService(this.prismaService,this.configService)
    this.promptService = new PromptServices(this.prismaService,this.configService,this.aiToolsService, this.monitoringService)
    this.logger = new CustomLogger("AppController");
  }

  @Get("/")
  getHello(): string {
    return this.appService.getHello();
  }

  @Post("/prompt/:configid")
  async prompt(@Body() promptDto: any, @Headers() headers, @Param("configid") configid: string): Promise<any> {
    let startTime = Date.now()
    //get userId from headers
    const userId = headers["user-id"]
    const sessionId = headers["session-id"]
    console.log("userId =",userId)
    console.log("sessionId =", sessionId)
    if(!userId){
      return {
        "text":"",
        "error": "'user-id' should not be empty"
      }
    }
    if(!sessionId) {
      return {
        "text": "",
        "error": "'session-id' should not be empty"
      }
    }
    let messageType = 'intermediate_response'
    //setup loggers
    let verboseLogger = this.logger.logWithCustomFields({
      userId: userId,
      flowId: configid
    },"verbose")
    let errorLogger = this.logger.logWithCustomFields({
      userId: userId,
      flowId: configid
    },"error")
    // verboseLogger("User input", promptDto)
    //create or get user and conversation
    let user;
    try{
      user = await this.prismaService.user.findUnique({
        where:{
          id: userId
        }
      })
    }catch{
      this.monitoringService.incrementTotalSessionsCount()
      // verboseLogger("creating new user with id =",userId)
      await this.telemetryService.capture({
        eventName: "Conversation start",
        eventType: "START_CONVERSATION",
        producer:{
          channel: "Bot",
          deviceID: null,
          producerID: userId,
          platform: "nodejs",
        },
        platform: "nodejs",
        sessionId: userId,
        context: {
          userID: userId,
          conversationID: userId,
          pageID: null,
          rollup: undefined,
        },
        eventData:{
          duration: `${Date.now() - startTime}`,
          audioURL: null,
          questionGenerated: null,
          questionSubmitted: promptDto.text,
          comparisonScore: 0,
          answer: null,
          logData: undefined,
          errorData: undefined,
        },
        errorType: null,
        tags: ['bot','conversation_start']     
      })
    }
    if(!user) {
      user = await this.prismaService.user.create({
        data:{
          id: userId
        }
      })
    }

    //input setup
    let prompt: Prompt = {
      input: promptDto
    }
    let userInput = promptDto.text;
    let type = "text"

    let defaultContext = {
      sessionId,
      userId,
      userQuestion:'',
      query: '',
      queryType: '',
      response: '',
      userAadhaarNumber: user.identifier && configid=='3' ? user.identifier : '',
      otp: '',
      error: '',
      currentState: "getUserQuestion",
      type: '',
      inputType: type,
      inputLanguage: prompt.inputLanguage,
      lastAadhaarDigits:'',
      state:'onGoing',
      isOTPVerified: false
    }

    let conversation = await this.conversationService.getConversationState(
      sessionId,
      userId,
      defaultContext,
      configid
    )
    
    //handle text and audio
    if(promptDto.text){
      type = "Text"
      let detectLanguageStartTime = Date.now();
      if(/^\d+$/.test(userInput)){
        prompt.inputLanguage = Language.en
      } else {
        try {
          let response = await this.aiToolsService.detectLanguage(userInput)
          prompt.inputLanguage = response["language"] as Language 
        } catch (error) {
          await this.telemetryService.capture({
            eventName: "Detect language error",
            eventType: "DETECT_LANGUAGE",
            producer:{
              channel: "Bot",
              deviceID: null,
              producerID: userId,
              platform: "nodejs",
            },
            platform: "nodejs",
            sessionId: userId,
            context: {
              userID: userId,
              conversationID: userId,
              pageID: null,
              rollup: undefined,
            },
            eventData:{
              duration: `${Date.now() - detectLanguageStartTime}`,
              audioURL: null,
              questionGenerated: null,
              questionSubmitted: promptDto.text,
              comparisonScore: 0,
              answer: prompt.inputLanguage,
              logData: undefined,
              errorData: {
                input: userInput,
                error: error
              },
            },
            errorType: "DETECT_LANGUAGE",
            tags: ['bot','detect_language','error']     
          })
        }
        //@ts-ignore
        if(prompt.inputLanguage == 'unk'){
          prompt.inputLanguage = prompt.input.inputLanguage as Language
        }
        // verboseLogger("Detected Language =", prompt.inputLanguage)
      }
      await this.telemetryService.capture({
        eventName: "Detect language",
        eventType: "DETECT_LANGUAGE",
        producer:{
          channel: "Bot",
          deviceID: null,
          producerID: userId,
          platform: "nodejs",
        },
        platform: "nodejs",
        sessionId: userId,
        context: {
          userID: userId,
          conversationID: userId,
          pageID: null,
          rollup: undefined,
        },
        eventData:{
          duration: `${Date.now() - detectLanguageStartTime}`,
          audioURL: null,
          questionGenerated: null,
          questionSubmitted: promptDto.text,
          comparisonScore: 0,
          answer: prompt.inputLanguage,
          logData: undefined,
          errorData: undefined
        },
        errorType: null,
        tags: ['bot','detect_language']   
      })
    } else if (promptDto.media){
      let audioStartTime = Date.now();
      if(promptDto.media.category=="base64audio" && promptDto.media.text){
        type = "Audio"
        prompt.inputLanguage = promptDto.inputLanguage as Language
        let response;
        if(['askingAadhaarNumber','askingOTP','askLastAaadhaarDigits','confirmInput2','confirmInput3','confirmInput4'].indexOf(conversation?.currentState) != -1) 
          response = await this.aiToolsService.speechToText(promptDto.media.text,Language.en)
        else
          response = await this.aiToolsService.speechToText(promptDto.media.text,prompt.inputLanguage)

        if(response.error) {
          await this.telemetryService.capture({
            eventName: "Speech to text error",
            eventType: "SPEECH_TO_TEXT_ERROR",
            producer:{
              channel: "Bhashini",
              deviceID: null,
              producerID: userId,
              platform: "nodejs",
            },
            platform: "nodejs",
            sessionId: userId,
            context: {
              userID: userId,
              conversationID: userId,
              pageID: null,
              rollup: undefined,
            },
            eventData:{
              duration: `${Date.now() - audioStartTime}`,
              audioURL: null,
              questionGenerated: null,
              questionSubmitted: promptDto.text,
              comparisonScore: 0,
              answer: null,
              logData: undefined,
              errorData: {
                language: prompt.inputLanguage,
                error: response.error
              },
            },
            errorType: "SPEECH_TO_TEXT",
            tags: ['bot','speech_to_text','error']     
          })
          errorLogger(response.error)
          this.monitoringService.incrementTotalFailureSessionsCount()
          this.monitoringService.incrementSomethingWentWrongTryAgainCount()
          return{
            text:"",
            error: "Something went wrong, please try again.",
            conversationId: conversation?.id
          }
        }
        userInput = response["text"]
        // verboseLogger("speech to text =",userInput)
        await this.telemetryService.capture({
          eventName: "Speech to text",
          eventType: "SPEECH_TO_TEXT",
          producer:{
            channel: "Bhashini",
            deviceID: null,
            producerID: userId,
            platform: "nodejs",
          },
          platform: "nodejs",
          sessionId: userId,
          context: {
            userID: userId,
            conversationID: userId,
            pageID: null,
            rollup: undefined,
          },
          eventData:{
            duration: `${Date.now() - audioStartTime}`,
            audioURL: null,
            questionGenerated: userInput,
            questionSubmitted: userInput,
            comparisonScore: 0,
            answer: null,
            logData: undefined,
            errorData: null
          },
          errorType: "SPEECH_TO_TEXT",
          tags: ['bot','speech_to_text']     
        })
      } else {
        this.monitoringService.incrementUnsupportedMediaCount()
        errorLogger("Unsupported media")
        return {
          text: "",
          media: promptDto.media,
          mediaCaption: "",
          error: "Unsupported media",
          conversationId: conversation?.id
        }
      }
    }

    conversation.inputType = type;

    //get flow
    let botFlowMachine;
    switch(configid){
      case '1':
        botFlowMachine = this.promptService.getXstateMachine("botFlowMachine1")
        break
      case '2':
        botFlowMachine = this.promptService.getXstateMachine("botFlowMachine2")
        break
      case '3':
        botFlowMachine = this.promptService.getXstateMachine("botFlowMachine3")
        break
      default:
        botFlowMachine = this.promptService.getXstateMachine("botFlowMachine3")
    }

    

    let botFlowService = interpret(botFlowMachine.withContext(conversation || defaultContext)).start();
    // verboseLogger("current state when API hit =", botFlowService.state.context.currentState)
    if((botFlowService.state.context.currentState == "askingAadhaarNumber" || botFlowService.state.context.currentState == "confirmInput2") && type=="Text" ){
      let hashedAadhaar = await argon2.hash(promptDto.text);
      console.log("you have entered aadhaar", hashedAadhaar)
      await this.prismaService.message.create({
        data:{
          text: hashedAadhaar,
          // audio: type=="Audio"?promptDto.media.text:null,
          audio: null,
          type: "User",
          userId,
          flowId: configid || '3',
          messageType
        }
      })
    }else {
      await this.prismaService.message.create({
        data:{
          text: type=="Text"?promptDto.text:null,
          // audio: type=="Audio"?promptDto.media.text:null,
          audio: null,
          type: "User",
          userId,
          flowId: configid || '3',
          messageType
        }
      })
    }
    let isNumber = false;

    if(type == 'Audio' && (botFlowService.state.context.currentState == 'confirmInput1' || botFlowService.state.context.currentState == 'getUserQuestion')) {
      let audioStartTime = Date.now();
      let res =  {
        text: userInput,
        textInEnglish: "",
        error: null
      }
      res['audio'] = await this.aiToolsService.textToSpeech(res.text,prompt.inputLanguage)
      if(res['audio']['error']){
        await this.telemetryService.capture({
          eventName: "Text to speech error",
          eventType: "TEXT_TO_SPEECH_ERROR",
          producer:{
            channel: "Bhashini",
            deviceID: null,
            producerID: userId,
            platform: "nodejs",
          },
          platform: "nodejs",
          sessionId: userId,
          context: {
            userID: userId,
            conversationID: userId,
            pageID: null,
            rollup: undefined,
          },
          eventData:{
            duration: `${Date.now() - audioStartTime}`,
            audioURL: null,
            questionGenerated: null,
            questionSubmitted: res.text,
            comparisonScore: 0,
            answer: prompt.inputLanguage,
            logData: undefined,
            errorData: {
              input:res.text,
              language: prompt.inputLanguage,
              error: res['audio']['error']
            },
          },
          errorType: "TEXT_TO_SPEECH",
          tags: ['bot','text_to_speech','error']     
        })
      } else {
        await this.telemetryService.capture({
          eventName: "Text to speech",
          eventType: "TEXT_TO_SPEECH",
          producer:{
            channel: "Bhashini",
            deviceID: null,
            producerID: userId,
            platform: "nodejs",
          },
          platform: "nodejs",
          sessionId: userId,
          context: {
            userID: userId,
            conversationID: userId,
            pageID: null,
            rollup: undefined,
          },
          eventData:{
            duration: `${Date.now() - audioStartTime}`,
            audioURL: null,
            questionGenerated: null,
            questionSubmitted: res.text,
            comparisonScore: 0,
            answer: prompt.inputLanguage,
            logData: undefined,
            errorData: undefined,
          },
          errorType: "TEXT_TO_SPEECH",
          tags: ['bot','text_to_speech']     
        })
      }
      res['messageId'] = uuid.v4()
      res['conversationId'] = conversation?.id
      return res
    } else {
      //translate to english
      let translateStartTime = Date.now();
      if(userInput == 'resend OTP'){
        this.monitoringService.incrementResentOTPCount()
      }
      if(prompt.inputLanguage != Language.en && userInput != 'resend OTP') {
        try {
          let response = await this.aiToolsService.translate(
            prompt.inputLanguage as Language,
            Language.en,
            userInput
          )
          if(!response['text']) {
            await this.telemetryService.capture({
              eventName: "Translate error",
              eventType: "TRANSLATE_ERROR",
              producer:{
                channel: "Bhashini",
                deviceID: null,
                producerID: userId,
                platform: "nodejs",
              },
              platform: "nodejs",
              sessionId: userId,
              context: {
                userID: userId,
                conversationID: userId,
                pageID: null,
                rollup: undefined,
              },
              eventData:{
                duration: `${Date.now() - translateStartTime}`,
                audioURL: null,
                questionGenerated: null,
                questionSubmitted: userInput,
                comparisonScore: 0,
                answer: null,
                logData: undefined,
                errorData: {
                  input:userInput,
                  language: prompt.inputLanguage,
                  error: response['error']
                },
              },
              errorType: "TRANSLATE",
              tags: ['bot','translate','error']     
            })
            errorLogger("Sorry, We are unable to translate given input, please try again")
            this.monitoringService.incrementTotalFailureSessionsCount()
            this.monitoringService.incrementUnableToTranslateCount()
            return { 
              error: "Sorry, We are unable to translate given input, please try again",
              conversationId: conversation?.id
            }
          }
          prompt.inputTextInEnglish = response["text"]
          // verboseLogger("translated english text =", prompt.inputTextInEnglish)
          await this.telemetryService.capture({
            eventName: "Translate",
            eventType: "TRANSLATE",
            producer:{
              channel: "Bhashini",
              deviceID: null,
              producerID: userId,
              platform: "nodejs",
            },
            platform: "nodejs",
            sessionId: userId,
            context: {
              userID: userId,
              conversationID: userId,
              pageID: null,
              rollup: undefined,
            },
            eventData:{
              duration: `${Date.now() - translateStartTime}`,
              audioURL: null,
              questionGenerated: null,
              questionSubmitted: userInput,
              comparisonScore: 0,
              answer: prompt.inputTextInEnglish,
              logData: undefined,
              errorData: undefined
            },
            errorType: null,
            tags: ['bot','translate']     
          })
        } catch(error){
          await this.telemetryService.capture({
            eventName: "Translate error",
            eventType: "TRANSLATE_ERROR",
            producer:{
              channel: "Bhashini",
              deviceID: null,
              producerID: userId,
              platform: "nodejs",
            },
            platform: "nodejs",
            sessionId: userId,
            context: {
              userID: userId,
              conversationID: userId,
              pageID: null,
              rollup: undefined,
            },
            eventData:{
              duration: `${Date.now() - translateStartTime}`,
              audioURL: null,
              questionGenerated: null,
              questionSubmitted: userInput,
              comparisonScore: 0,
              answer: null,
              logData: undefined,
              errorData: {
                input:userInput,
                language: prompt.inputLanguage,
                error: error
              },
            },
           errorType: "TRANSLATE",
            tags: ['bot','translate','error']     
          })
          errorLogger("Sorry, We are unable to translate given input, please try again")
          this.monitoringService.incrementTotalFailureSessionsCount()
          this.monitoringService.incrementUnableToTranslateCount()
          return { 
            error: "Sorry, We are unable to translate given input, please try again",
            conversationId: conversation?.id
          }
        }
      } else {
        prompt.inputTextInEnglish = userInput
      }

      if(type == 'Audio' && ['askingAadhaarNumber','askingOTP','askLastAaadhaarDigits','confirmInput2','confirmInput3','confirmInput4'].indexOf(botFlowService.state.context.currentState) != -1) {
        let isOTP = ['askingOTP','askLastAaadhaarDigits','confirmInput3','confirmInput4'].indexOf(botFlowService.state.context.currentState) != -1
        let number = wordToNumber(prompt.inputTextInEnglish, isOTP ? 'otp':'benId')
        // let number = prompt.inputTextInEnglish.replace(/\s/g, '')
        prompt.inputTextInEnglish = number.toUpperCase()
        if(prompt.inputTextInEnglish == "") prompt.inputTextInEnglish = isOTP ? '1111' : 'AB123123123'
        isNumber = true
        // if(/\d/.test(number)){
        //   isNumber = true
        //   prompt.inputTextInEnglish = number.toUpperCase()
        //   verboseLogger("english text to numbers conversion =",prompt.inputTextInEnglish)
        // }
      }
    }


    const currentContext = botFlowService.state.context;
    let updatedContext = {
      ...currentContext,
      inputType: type,
      type:""
    };
    botFlowService.state.context = updatedContext;

    botFlowService.send('USER_INPUT', { data: prompt.inputTextInEnglish });

    await new Promise((resolve) => {
      botFlowService.subscribe((state) => {
        // verboseLogger('Current state:', state.value);
        updatedContext = {
          ...state.context,
          //@ts-ignore
          currentState: state.value
        };
        botFlowService.state.context = updatedContext;
        // console.log('Current context:', state.context);
        if(state.context.type=="pause"){
          // verboseLogger("paused state", state.value)
          resolve(state)
        }
      });
      botFlowService.onDone((state)=>{
        const currentContext = botFlowService.state.context;
        let updatedContext = {
          ...currentContext,
          state:'Done'
        };
        botFlowService.state.context = updatedContext;
        // verboseLogger("state done")
        resolve(state)
      })
    });

    // verboseLogger("final response",botFlowService.getSnapshot().context.response)
    // verboseLogger("final error",botFlowService.getSnapshot().context.error)
    let result = {
      textInEnglish: botFlowService.getSnapshot().context.response,
      text: botFlowService.getSnapshot().context.response,
      error: null,
      audio: null,
    }
    if(botFlowService.getSnapshot().context.error){
      const currentContext = botFlowService.state.context;
      let updatedContext = {
        ...currentContext,
        state:'Done'
      };
      botFlowService.state.context = updatedContext;
      result.textInEnglish = null
      result.text = null
      result.error = botFlowService.getSnapshot().context.error
    }
    prompt.inputLanguage = promptDto.inputLanguage

    if(result.text){
      let placeholder;
      if(
        result.text==engMessage["label.popUpTitle"] || 
        result.text==engMessage["label.popUpTitleValid"] ||
        result.text==engMessage["label.noRecordsFound"]
      ){
        placeholder = engMessage["label.popUpTitle.short"]
      } else if(
        result.text==engMessage["label.popUpTitle2"]
      ){
        placeholder = engMessage["label.popUpTitle2.short"]
      }else if(
        result.text==engMessage["label.popUpTitle3"]
      ){
        placeholder = engMessage["label.popUpTitle3.short"]
      }else if(
        result.text==engMessage["label.invalid_question"]
      ){
        placeholder = engMessage["label.popUpTitle.short"]
      }
      if(prompt.inputLanguage != Language.en && !isNumber) {
        let translateStartTime = Date.now();
        try {
          let inp = result.text
          let response = await this.aiToolsService.translate(
            Language.en,
            prompt.inputLanguage as Language,
            result.text
          )
          if(!response['text']){
            await this.telemetryService.capture({
              eventName: "Translate error",
              eventType: "TRANSLATE_ERROR",
              producer:{
                channel: "Bhashini",
                deviceID: null,
                producerID: userId,
                platform: "nodejs",
              },
              platform: "nodejs",
              sessionId: userId,
              context: {
                userID: userId,
                conversationID: userId,
                pageID: null,
                rollup: undefined,
              },
              eventData:{
                duration: `${Date.now() - translateStartTime}`,
                audioURL: null,
                questionGenerated: null,
                questionSubmitted: result.text,
                comparisonScore: 0,
                answer: null,
                logData: undefined,
                errorData: {
                  input:userInput,
                  language: prompt.inputLanguage,
                  error: response['error']
                },
              },
             errorType: "TRANSLATE",
              tags: ['bot','translate','error']     
            })
            errorLogger("Sorry, We are unable to translate given input, please try again")
            this.monitoringService.incrementTotalFailureSessionsCount()
            this.monitoringService.incrementUnableToTranslateCount()
            result.error = "Sorry, We are unable to translate given input, please try again"
          }
          result.text = response["text"]
          // verboseLogger("input language translated text =",result.text)
          await this.telemetryService.capture({
            eventName: "Translate",
            eventType: "TRANSLATE",
            producer:{
              channel: "Bhashini",
              deviceID: null,
              producerID: userId,
              platform: "nodejs",
            },
            platform: "nodejs",
            sessionId: userId,
            context: {
              userID: userId,
              conversationID: userId,
              pageID: null,
              rollup: undefined,
            },
            eventData:{
              duration: `${Date.now() - translateStartTime}`,
              audioURL: null,
              questionGenerated: null,
              questionSubmitted: inp,
              comparisonScore: 0,
              answer: result.text,
              logData: undefined,
              errorData: undefined
            },
            errorType: null,
            tags: ['bot','translate']     
          })
        } catch(error){
          await this.telemetryService.capture({
            eventName: "Translate error",
            eventType: "TRANSLATE_ERROR",
            producer:{
              channel: "Bhashini",
              deviceID: null,
              producerID: userId,
              platform: "nodejs",
            },
            platform: "nodejs",
            sessionId: userId,
            context: {
              userID: userId,
              conversationID: userId,
              pageID: null,
              rollup: undefined,
            },
            eventData:{
              duration: `${Date.now() - translateStartTime}`,
              audioURL: null,
              questionGenerated: null,
              questionSubmitted: userInput,
              comparisonScore: 0,
              answer: null,
              logData: undefined,
              errorData: {
                input:userInput,
                language: prompt.inputLanguage,
                error: error
              },
            },
            errorType: "TRANSLATE",
            tags: ['bot','translate','error']     
          })
          errorLogger(error)
          this.monitoringService.incrementTotalFailureSessionsCount()
          this.monitoringService.incrementUnableToTranslateCount()
          return { 
            error: "Sorry, We are unable to translate given input, please try again",
            conversationId: conversation?.id
          }
        }
      }
      if(prompt.inputLanguage != Language.en && placeholder){
        let translateStartTime = Date.now();
        try {
          let response = await this.aiToolsService.translate(
            Language.en,
            prompt.inputLanguage as Language,
            placeholder
          )
          if(!response['text']){
            await this.telemetryService.capture({
              eventName: "Translate error",
              eventType: "TRANSLATE_ERROR",
              producer:{
                channel: "Bhashini",
                deviceID: null,
                producerID: userId,
                platform: "nodejs",
              },
              platform: "nodejs",
              sessionId: userId,
              context: {
                userID: userId,
                conversationID: userId,
                pageID: null,
                rollup: undefined,
              },
              eventData:{
                duration: `${Date.now() - translateStartTime}`,
                audioURL: null,
                questionGenerated: null,
                questionSubmitted: placeholder,
                comparisonScore: 0,
                answer: null,
                logData: undefined,
                errorData: {
                  input:userInput,
                  language: prompt.inputLanguage,
                  error: response['error']
                },
              },
              errorType: "TRANSLATE",
              tags: ['bot','translate','error']     
            })
            errorLogger("Sorry, We are unable to translate given input, please try again")
            this.monitoringService.incrementTotalFailureSessionsCount()
            this.monitoringService.incrementUnableToTranslateCount()
            result.error = "Sorry, We are unable to translate given input, please try again"
          }
          result['placeholder'] = response["text"]
          await this.telemetryService.capture({
            eventName: "Translate",
            eventType: "TRANSLATE",
            producer:{
              channel: "Bhashini",
              deviceID: null,
              producerID: userId,
              platform: "nodejs",
            },
            platform: "nodejs",
            sessionId: userId,
            context: {
              userID: userId,
              conversationID: userId,
              pageID: null,
              rollup: undefined,
            },
            eventData:{
              duration: `${Date.now() - translateStartTime}`,
              audioURL: null,
              questionGenerated: null,
              questionSubmitted: placeholder,
              comparisonScore: 0,
              answer: result['placeholder'],
              logData: undefined,
              errorData: undefined
            },
            errorType: null,
            tags: ['bot','translate']     
          })
        } catch(error){
          await this.telemetryService.capture({
            eventName: "Translate error",
            eventType: "TRANSLATE_ERROR",
            producer:{
              channel: "Bhashini",
              deviceID: null,
              producerID: userId,
              platform: "nodejs",
            },
            platform: "nodejs",
            sessionId: userId,
            context: {
              userID: userId,
              conversationID: userId,
              pageID: null,
              rollup: undefined,
            },
            eventData:{
              duration: `${Date.now() - translateStartTime}`,
              audioURL: null,
              questionGenerated: null,
              questionSubmitted: placeholder,
              comparisonScore: 0,
              answer: null,
              logData: undefined,
              errorData: {
                input:userInput,
                language: prompt.inputLanguage,
                error: error
              },
            },
            errorType: "TRANSLATE",
            tags: ['bot','translate','error']     
          })
          errorLogger(error)
          this.monitoringService.incrementTotalFailureSessionsCount()
          this.monitoringService.incrementUnableToTranslateCount()
          return { 
            error: "Sorry, We are unable to translate given input, please try again",
            conversationId: conversation?.id
          }
        }
      } else if(placeholder) {
        result['placeholder'] = placeholder
      }
      try{
        let textToaudio = result.text
        if(botFlowService.state.context.currentState == 'endFlow'){
          this.monitoringService.incrementTotalSuccessfullSessionsCount();
          switch(prompt.inputLanguage){
            case Language.hi:
              this.monitoringService.incrementTotalSessionsInHindiCount();
              break;
            case Language.ta:
              this.monitoringService.incrementTotalSessionsInTamilCount();
              break;
            case Language.or:
              this.monitoringService.incrementTotalSessionsInOdiaCount();
              break;  
            case Language.te:
              this.monitoringService.incrementTotalSessionsInTeluguCount();
              break;
            case Language.mr:
              this.monitoringService.incrementTotalSessionsInMarathiCount();
              break;
            case Language.bn:
              this.monitoringService.incrementTotalSessionsInBanglaCount();
              break;
            case Language.en:
              this.monitoringService.incrementTotalSessionsInEnglishCount();
              break;
            default:
              this.monitoringService.incrementTotalSessionsInEnglishCount();
              break;
          }
          messageType = botFlowService.state.context.queryType == "convo" ? "convo_response" : "final_response"
          if(botFlowService.state.context.isWadhwaniResponse == 'false'){
            let resArray = result.text.split("\n")
            let compareText = result.textInEnglish.split('\n')
            if(compareText[compareText.length-1].slice(0,12)=="Registration"){
              textToaudio = ""
            } else {
              textToaudio = resArray.pop() 
            }
            // verboseLogger("Array to convert",resArray)
            result.text = `${formatStringsToTable(resArray)}\n${textToaudio}`
          }
        }
        // verboseLogger("textToaudio =",textToaudio)
        let audioStartTime = Date.now();
        textToaudio = removeLinks(textToaudio)
        result['audio'] = await this.aiToolsService.textToSpeech(textToaudio,isNumber ? Language.en : prompt.inputLanguage)
        if(result['audio']['error']){
          await this.telemetryService.capture({
            eventName: "Text to speech error",
            eventType: "TEXT_TO_SPEECH_ERROR",
            producer:{
              channel: "Bhashini",
              deviceID: null,
              producerID: userId,
              platform: "nodejs",
            },
            platform: "nodejs",
            sessionId: userId,
            context: {
              userID: userId,
              conversationID: userId,
              pageID: null,
              rollup: undefined,
            },
            eventData:{
              duration: `${Date.now() - audioStartTime}`,
              audioURL: null,
              questionGenerated: null,
              questionSubmitted: textToaudio,
              comparisonScore: 0,
              answer: null,
              logData: undefined,
              errorData: {
                input:textToaudio,
                language: prompt.inputLanguage,
                error: result['audio']['error']
              },
            },
            errorType: "TEXT_TO_SPEECH",
            tags: ['bot','text_to_speech','error']     
          })
        } else {
          await this.telemetryService.capture({
            eventName: "Text to speech",
            eventType: "TEXT_TO_SPEECH",
            producer:{
              channel: "Bhashini",
              deviceID: null,
              producerID: userId,
              platform: "nodejs",
            },
            platform: "nodejs",
            sessionId: userId,
            context: {
              userID: userId,
              conversationID: userId,
              pageID: null,
              rollup: undefined,
            },
            eventData:{
              duration: `${Date.now() - audioStartTime}`,
              audioURL: null,
              questionGenerated: null,
              questionSubmitted: textToaudio,
              comparisonScore: 0,
              answer: null,
              logData: undefined,
              errorData: undefined
            },
            errorType: null,
            tags: ['bot','text_to_speech']     
          })
        }
      } catch(error){
        result['audio'] = {text: "",error: error.message}
      }
    }

    conversation = await this.conversationService.saveConversation(
      sessionId,
      userId,
      botFlowService.getSnapshot().context,
      botFlowService.state.context.state,
      configid
    )

    let msg = await this.prismaService.message.create({
      data:{
        text: result?.text ? result?.text : result.error? result.error : null,
        // audio: result?.audio?.text ? result?.audio?.text : null,
        audio: null,
        type: "System",
        userId,
        flowId: configid || '3',
        messageType
      }
    })
    result["messageId"] = msg.id
    result["messageType"] = messageType
    result["conversationId"] = conversation.id
    verboseLogger("current state while returning response =", botFlowService.state.context.currentState)
    switch(botFlowService.state.context.currentState){
      case 'askingAadhaarNumber':
        this.monitoringService.incrementStage3Count()
        break;
      case 'askingOTP':
        this.monitoringService.incrementStage4Count()
        break;
      case 'endFlow':
        if(!result.error){
          this.monitoringService.incrementStage5Count()
        }
        break;
      default:
        break;
    }
    
    // verboseLogger("response text", result.text)
    // verboseLogger("response textInEnglish", result.textInEnglish)
    // verboseLogger("response error", result.error)
    return result;
  }
}
