import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../global-services/prisma.service";
import { ConfigService } from "@nestjs/config";
import { LokiLogger } from '../loki-logger/loki-logger.service';
import axios from "axios";
import { decryptRequest, encryptRequest } from "../../common/utils";
import { Message } from "@prisma/client";
import { MonitoringService } from "../monitoring/monitoring.service";
import { HttpService } from "@nestjs/axios";

@Injectable()
export class UserService {
  private logger: LokiLogger;
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private monitoringService: MonitoringService
  ) {
    this.logger = new LokiLogger(
      'main',
      new HttpService(),
      this.configService,
    );
  }

  async sendOTP(mobileNumber: string, type: string = "Mobile"): Promise<any> {
    try {
      let encryptedData = await encryptRequest(
        `{\"Types\":\"${type}\",\"Values\":\"${mobileNumber}\",\"Token\":\"${this.configService.get(
          "PM_KISSAN_TOKEN"
        )}\"}`
      );
      this.logger.log("encrypted data: ", encryptedData);
      let data = JSON.stringify({
        EncryptedRequest: `${encryptedData.d.encryptedvalu}@${encryptedData.d.token}`,
      });

      let config = {
        method: "post",
        maxBodyLength: Infinity,
        url: `${this.configService.get("PM_KISAN_BASE_URL")}/chatbototp`,
        headers: {
          "Content-Type": "application/json",
        },
        data: data,
      };

      let response: any = await axios.request(config);
      this.logger.log("sendOTP", response.status);
      if (response.status >= 200 && response.status < 300) {
        response = await response.data;
        let decryptedData: any = await decryptRequest(
          response.d.output,
          encryptedData.d.token
        );
        response.d.output = JSON.parse(decryptedData.d.decryptedvalue);
        response["status"] =
          response.d.output.Rsponce != "False" ? "OK" : "NOT_OK";
        return response;
      } else {
        return {
          d: {
            output: {
              status: "False",
              Message: "Try again",
            },
          },
        };
      }
    } catch (error) {
      this.logger.error(error);
      return {
        d: {
          output: {
            status: "False",
            Message: "Try again",
          },
        },
      };
    }
  }

  async verifyOTP(
    mobileNumber: string,
    otp: string,
    type: string = "Mobile"
  ): Promise<any> {
    try {
      let encryptedData = await encryptRequest(
        `{\"Types\":\"${type}\",\"Values\":\"${mobileNumber}\",\"OTP\":\"${otp}\",\"Token\":\"${this.configService.get(
          "PM_KISSAN_TOKEN"
        )}\"}`
      );
      let data = JSON.stringify({
        EncryptedRequest: `${encryptedData.d.encryptedvalu}@${encryptedData.d.token}`,
      });

      let config = {
        method: "post",
        maxBodyLength: Infinity,
        url: `${this.configService.get(
          "PM_KISAN_BASE_URL"
        )}/ChatbotOTPVerified`,
        headers: {
          "Content-Type": "application/json",
        },
        data: data,
      };

      let response: any = await axios.request(config);
      this.logger.log("verifyOTP", response.status);
      if (response.status >= 200 && response.status < 300) {
        response = await response.data;
        let decryptedData: any = await decryptRequest(
          response.d.output,
          encryptedData.d.token
        );
        this.logger.log(decryptedData);
        response.d.output = JSON.parse(decryptedData.d.decryptedvalue);
        response["status"] =
          response.d.output.Rsponce != "False" ? "OK" : "NOT_OK";
        return response;
      } else {
        return {
          d: {
            output: {
              status: "False",
              Message: "Try again",
            },
          },
        };
      }
    } catch (error) {
      this.logger.error(error);
      return {
        d: {
          output: {
            status: "False",
            Message: "Try again",
          },
        },
      };
    }
  }

  async getUserData(
    mobileNumber: string,
    type: string = "Mobile"
  ): Promise<any> {
    let res: any;
    try {
      let encryptedData = await encryptRequest(
        `{\"Types\":\"${type}\",\"Values\":\"${mobileNumber}\",\"Token\":\"${this.configService.get(
          "PM_KISSAN_TOKEN"
        )}\"}`
      );
      let data = JSON.stringify({
        EncryptedRequest: `${encryptedData.d.encryptedvalu}@${encryptedData.d.token}`,
      });

      let config = {
        method: "post",
        maxBodyLength: Infinity,
        url: `${this.configService.get(
          "PM_KISAN_BASE_URL"
        )}/ChatbotUserDetails`,
        headers: {
          "Content-Type": "application/json",
        },
        data: data,
      };
      res = await axios.request(config);
      this.logger.log("getUserData", res.status);
      if (res.status >= 200 && res.status < 300) {
        res = await res.data;
        let decryptedData: any = await decryptRequest(
          res.d.output,
          encryptedData.d.token
        );
        res.d.output = JSON.parse(decryptedData.d.decryptedvalue);
        res["status"] = res.d.output.Rsponce != "False" ? "OK" : "NOT_OK";
      } else {
        this.monitoringService.incrementUnableToGetUserDetailsCount();
        res = {
          d: {
            output: {
              status: "False",
              Message: "Unable to get user details",
            },
          },
        };
      }
    } catch (error) {
      this.monitoringService.incrementUnableToGetUserDetailsCount();
      return {
        d: {
          output: {
            status: "False",
            Message: "Unable to get user details",
          },
        },
      };
    }
    return res;
  }

  async likeQuery(id): Promise<Message> {
    // try {
    await this.prisma.$queryRawUnsafe(`
        UPDATE "Message" SET 
        "reaction" = 1
        WHERE "id" = '${id}'`);
    // } catch {
    //   return null;
    // }
    this.monitoringService.incrementPositveFeedbackCount();
    return this.prisma.$queryRawUnsafe(`
      SELECT * from "Message" where id = '${id}'
    `);
  }

  async dislikeQuery(id): Promise<Message> {
    try {
      await this.prisma.$queryRawUnsafe(`
        UPDATE "Message" SET 
        "reaction" = -1
        WHERE "id" = '${id}'`);
      this.monitoringService.incrementNegativeFeedbackCount();
    } catch {
      return null;
    }
    return this.prisma.$queryRawUnsafe(`
      SELECT * from "Message" where id = '${id}'
    `);
  }

  async removeReactionOnQuery(id): Promise<Message> {
    try {
      await this.prisma.$queryRawUnsafe(`
        UPDATE "Message" SET 
        "reaction" = 0
        WHERE "id" = '${id}'`);
    } catch {
      return null;
    }
    return this.prisma.$queryRawUnsafe(`
      SELECT * from "Message" where id = '${id}'
    `);
  }
}
