import { Injectable, CACHE_MANAGER, Inject } from "@nestjs/common";
import { Cache } from "cache-manager";
import { ConfigService } from "@nestjs/config";
import { Language } from "../../language";
import { isMostlyEnglish } from "../../common/utils";
import { MonitoringService } from "../monitoring/monitoring.service";
const fetch = require("../../common/fetch");
const nodefetch = require("node-fetch");
const { Headers } = require("node-fetch");
const path = require("path");
const filePath = path.resolve(__dirname, "../../common/en.json");
const engMessage = require(filePath);

@Injectable()
export class AiToolsService {
  constructor(
    private configService: ConfigService,
    private readonly monitoringService: MonitoringService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache
  ) {}
  async detectLanguage(text: string, userId: string, sessionId: string): Promise<any> {
    // console.log("DETECTING LANGUAGE....")
    try {
      let input = {
        input: [
          {
            source: text,
          },
        ],
      };
  
      let response: any = await this.computeBhashini(
        this.configService.get('BHASHINI_DHRUVA_AUTHORIZATION'),
        'txt-lang-detection',
        'bhashini/iiiith/indic-lang-detection-all',
        this.configService.get('BHASHINI_DHRUVA_ENDPOINT'),
        {},
        input,
        userId,
        sessionId
      )
      if(response["error"]){
        console.log(response["error"])
        throw new Error(response["error"])
      }
      let language: Language;
      if(response.output && response.output.length){
        language = response.data?.pipelineResponse[0]?.output[0]?.langPrediction[0]?.langCode as Language
        this.monitoringService.incrementBhashiniSuccessCount()
        return {
          language: language || 'unk',
          error: null
        }
      } else {
        this.monitoringService.incrementBhashiniFailureCount()
        return {
          language: 'unk',
          error: null
        }
      }
    } catch (error) {
      this.monitoringService.incrementBhashiniFailureCount();
      if (isMostlyEnglish(text?.replace("?", "")?.trim())) {
        return {
          language: Language.en,
          error: error.message,
        };
      } else {
        return {
          language: "unk",
          error: error.message,
        };
      }
    }
  }

  async translate(
    source: Language,
    target: Language,
    text: string,
    userId: string,
    sessionId: string
  ) {
    try {
      const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/g;
      const urls = text.match(urlRegex) || [];

      const placeHolder = "9814567092798090023722437987555212294"; //placeholder which stays the same across languages after translation
      const textWithoutUrls = text.replace(urlRegex, placeHolder);
      let config = {
        "language": {
            "sourceLanguage": source,
            "targetLanguage": target
        }
      }
      let bhashiniConfig: any = await this.getBhashiniConfig('translation',config,userId,sessionId)
      
      let textArray = textWithoutUrls.split("\n")
      for(let i=0;i<textArray.length;i++){
        let response: any = await this.computeBhashini(
          bhashiniConfig?.pipelineInferenceAPIEndPoint?.inferenceApiKey?.value,
          "translation",
          bhashiniConfig?.pipelineResponseConfig[0].config[0].serviceId,
          bhashiniConfig?.pipelineInferenceAPIEndPoint?.callbackUrl,
          config,
          {
            input: [
              {
                // "source": text?.replace("\n",".")
                "source": textArray[i]
              }
            ]
          },
          userId,
          sessionId
        )
        if(response["error"]){
          console.log(response["error"])
          throw new Error(response["error"])
        }
        textArray[i] = response?.pipelineResponse[0]?.output[0]?.target;
      }
      const translatedText = textArray
        .join("\n")
        .replace(new RegExp(placeHolder, "g"), () => urls.shift() || "");
      return {
        text: translatedText,
        error: null,
      };
    } catch (error) {
      console.log(error);
      return {
        text: "",
        error: error,
      };
    }
  }

  async speechToText(
    base64audio: string,
    language: Language,
    userId: string,
    sessionId: string
  ) {
    try {
      let config: any = await this.getBhashiniConfig('asr',{
        "language": {
            "sourceLanguage": language
        }
      },userId,sessionId)
      let requestConfig = {
        language: {
          sourceLanguage: language,
        },
      };
      if (["kn", "ur", "ml", "gu", "pa"].indexOf(`${language}`) == -1) {
        requestConfig["postProcessors"] = ["itn"];
      }

      let response: any = await this.computeBhashini(
        config?.pipelineInferenceAPIEndPoint?.inferenceApiKey?.value,
        "asr",
        config?.pipelineResponseConfig[0].config[0].serviceId,
        config?.pipelineInferenceAPIEndPoint?.callbackUrl,
        requestConfig,
        {
          audio: [
            {
              "audioContent": base64audio
            }
          ]
        },
        userId,
        sessionId
      )
      if(response["error"]){
        console.log(response["error"])
        throw new Error(response["error"])
      }
      return {
        text: response?.pipelineResponse[0]?.output[0]?.source,
        error: null,
      };
    } catch (error) {
      console.log(error);
      return {
        text: "",
        error: error,
      };
    }
  }

  async textToSpeech(
    text: string,
    language: Language,
    audioGender: string = 'male',
    userId: string,
    sessionId: string
  ) {
    try {
      let config: any = await this.getBhashiniConfig('tts',{
        "language": {
            "sourceLanguage": language
        }
      },userId,sessionId)
  
      let response: any = await this.computeBhashini(
        config?.pipelineInferenceAPIEndPoint?.inferenceApiKey?.value,
        "tts",
        config?.pipelineResponseConfig[0].config[0].serviceId,
        config?.pipelineInferenceAPIEndPoint?.callbackUrl,
        {
          language: {
            sourceLanguage: language,
          },
          gender: audioGender
        },
        {
          input: [
            {
              "source": text
            }
          ]
        },
        userId,
        sessionId
      )
      if(response["error"]){
        console.log(response["error"])
        throw new Error(response["error"])
      }
      return {
        text: response?.pipelineResponse[0]?.audio[0]?.audioContent,
        error: null,
      };
    } catch (error) {
      console.log(error);
      return {
        text: "",
        error: error,
      };
    }
  }

  async textClassification(text: string) {
    try {
      var myHeaders = new Headers();
      myHeaders.append("accept", "application/json");
      myHeaders.append("X-API-Key", this.configService.get("WADHWANI_API_KEY"));
      // let body = {
      //   text: text
      // }
      // let response: any = await fetch(`${this.configService.get("HUGGINGFACE_TEXT_CLASSIFICATION_BASE_URL")}`, {
      //   headers: myHeaders,
      //   "body": JSON.stringify(body),
      //   "method": "POST",
      //   "mode": "cors",
      //   "credentials": "omit"
      // });
      let response: any = await fetch(
        `${this.configService.get(
          "WADHWANI_BASE_URL"
        )}/detect_query_intent?query=${text}`,
        {
          headers: myHeaders,
          method: "GET",
          mode: "cors",
          credentials: "omit",
        }
      );
      response = await response.text();
      return response;
    } catch (error) {
      console.log(error);
      return {
        error,
      };
    }
  }

  async getResponseViaWadhwani(
    sessionId: string,
    userId: string,
    text: string,
    schemeName: string
  ) {
    try {
      var myHeaders = new Headers();
      myHeaders.append("accept", "application/json");
      myHeaders.append("X-API-Key", this.configService.get("WADHWANI_API_KEY"));
      let startDate = new Date();
      console.log(`${startDate}: userId: ${userId} sessionId: ${sessionId} Waiting for ${this.configService.get("WADHWANI_BASE_URL")}/get_bot_response?query=${text}&user_id=${userId}&session_id=${sessionId}&scheme_name=${schemeName} to respond ...`)
      let response: any = await fetch(`${this.configService.get("WADHWANI_BASE_URL")}/get_bot_response?query=${text}&user_id=${userId}&session_id=${sessionId}&scheme_name=${schemeName}`, {
        headers: myHeaders,
        "method": "GET",
        "mode": "cors",
        "credentials": "omit"
      });
      let endDate = new Date();
      response = await response.json()
      console.log(`${endDate}: userId: ${userId} sessionId: ${sessionId} URL: ${this.configService.get("WADHWANI_BASE_URL")}/get_bot_response?query=${text}&user_id=${userId}&session_id=${sessionId} Responded succesfully in ${endDate.getTime()-startDate.getTime()} ms.`)
      return response
    } catch(error){
      console.log(error)
      return {
        error,
      };
    }
  }

  async getBhashiniConfig(task,config,userId, sessionId) {
    const cacheKey = `getBhashiniConfig:${JSON.stringify({ task, config })}`;

    const cachedData = await this.cacheManager.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }
    var myHeaders = new Headers();
    myHeaders.append("userID", this.configService.get("ULCA_USER_ID"));
    myHeaders.append("ulcaApiKey", this.configService.get("ULCA_API_KEY"));
    myHeaders.append("Content-Type", "application/json");

    var raw = JSON.stringify({
      pipelineTasks: [
        {
          taskType: task,
          config: config,
        },
      ],
      pipelineRequestConfig: {
        pipelineId: "64392f96daac500b55c543cd",
      },
    });

    var requestOptions: any = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow",
      retry: 4,
      pause: 0,
      url: this.configService.get("ULCA_CONFIG_URL"),
      userId,
      sessionId,
      callback: null,
      timeout: this.configService.get("BHASHINI_API_TIMEOUT") || 30000
    };

    requestOptions.callback = function (retry) {
      const elapsed = Date.now() - this.startTime;
      console.log(`userId: ${this.userId} sessionId: ${this.sessionId} URL: ${this.url} (config API) Re-Trying: ${retry}, Previous failed call Time Taken: ${elapsed}ms`);
    }.bind(requestOptions);

    try{
      this.monitoringService.incrementBhashiniCount()
      let startDate = new Date();
      console.log(`${startDate}: userId: ${userId} sessionId: ${sessionId} Waiting for ${this.configService.get("ULCA_CONFIG_URL")} (config API) to respond ...`)
      let response  = await fetch(this.configService.get("ULCA_CONFIG_URL"), requestOptions)
      if(response.status != 200){
        console.log(response)
        throw new Error(`${new Date()}: API call to '${this.configService.get("ULCA_CONFIG_URL")}' with config '${JSON.stringify(config,null,3)}' failed with status code ${response.status}`)
      }
      let endDate = new Date();
      response = await response.json()
      console.log(`${endDate}: userId: ${userId} sessionId: ${sessionId} URL: ${this.configService.get("ULCA_CONFIG_URL")} (config API) Responded succesfully in ${endDate.getTime()-startDate.getTime()} ms.`)
      this.monitoringService.incrementBhashiniSuccessCount()
      await this.cacheManager.set(cacheKey, response, 86400);
      return response;
    } catch (error) {
      this.monitoringService.incrementBhashiniFailureCount();
      console.log(error);
      return {
        error,
      };
    }
  }

  async computeBhashini(authorization, task, serviceId, url, config, input, userId, sessionId) {
    const cacheKey = `computeBhashini:${JSON.stringify({ task, serviceId, url, config, input })}`;
    if(task != 'asr'){
      const cachedData = await this.cacheManager.get(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }
    var myHeaders = new Headers();
    myHeaders.append("Accept", " */*");
    myHeaders.append("Authorization", authorization);
    myHeaders.append("Content-Type", "application/json");
    config["serviceId"] = serviceId;
    if (task == "tts") {
      if(!config["gender"]){
        config["gender"] = "male";
      }
      config["samplingRate"] = 8000;
    }
    var raw = JSON.stringify({
      pipelineTasks: [
        {
          taskType: task,
          config: config,
        },
      ],
      inputData: input,
    });

    var requestOptions: any = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: 'follow',
      retry: 4, 
      pause:0,
      startTime: Date.now(),
      url,
      task,
      userId,
      sessionId,
      callback: null,
      timeout: this.configService.get("BHASHINI_API_TIMEOUT") || 30000
    };

    requestOptions.callback = function (retry) {
      const elapsed = Date.now() - this.startTime;
      console.log(`userId: ${this.userId} sessionId: ${this.sessionId} URL: ${this.url} for task (${this.task}) Re-Trying: ${retry}, Previous failed call Time Taken: ${elapsed}ms`);
    }.bind(requestOptions);

    try{
      this.monitoringService.incrementBhashiniCount()
      let startDate = new Date();
      console.log(`${startDate}: userId: ${userId} sessionId: ${sessionId} Waiting for ${url} for task (${task}) to respond ...`)
      let response  = await fetch(url, requestOptions)
      if(response.status != 200){
        console.log(response)
        throw new Error(`${new Date()}: API call to '${url}' with config '${JSON.stringify(config,null,3)}' failed with status code ${response.status}`)
      }
      let endDate = new Date();
      response = await response.json()
      console.log(`${endDate}: userId: ${userId} sessionId: ${sessionId} URL: ${url} for task (${task}) Responded succesfully in ${endDate.getTime()-startDate.getTime()} ms.`)
      this.monitoringService.incrementBhashiniSuccessCount()
      if(task != 'asr') {
        await this.cacheManager.set(cacheKey, response, 7200);
      }
      return response;
    } catch (error) {
      this.monitoringService.incrementBhashiniFailureCount();
      console.log(error);
      return {
        error,
      };
    }
  }
}
