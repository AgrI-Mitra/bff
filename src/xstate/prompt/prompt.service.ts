import { ConfigService } from "@nestjs/config";
import { AiToolsService } from "../../modules/aiTools/ai-tools.service";
import { AADHAAR_GREETING_MESSAGE } from "../../common/constants";
import { UserService } from "../../modules/user/user.service";
import axios from "axios";
import { decryptRequest, encryptRequest, getUniqueKey, titleCase, encrypt } from "../../common/utils";
import { PrismaService } from "src/global-services/prisma.service";
import { Injectable } from "@nestjs/common";
import {
  botFlowMachine1,
  botFlowMachine2,
  botFlowMachine3,
} from "./prompt.machine";
import { createMachine } from "xstate";
import { promptActions } from "./prompt.actions";
import { promptGuards } from "./prompt.gaurds";
import { MonitoringService } from "src/modules/monitoring/monitoring.service";
const path = require("path");
const filePath = path.resolve(__dirname, "../../common/kisanPortalErrors.json");
const PMKissanProtalErrors = require(filePath);
import * as moment from "moment";


@Injectable()
export class PromptServices {
  private userService: UserService;
  constructor(
    private prismaService: PrismaService,
    private configService: ConfigService,
    private aiToolsService: AiToolsService,
    private monitoringService: MonitoringService
  ) {
    this.userService = new UserService(
      this.prismaService,
      this.configService,
      this.monitoringService
    );
  }

  async getInput(context) {
    return context;
  }

    async questionClassifier (context) {
        // console.log("IN questionclassifier")
        try{
            let response: any = await this.aiToolsService.getResponseViaWadhwani(context.sessionId, context.userId, context.query, context.schemeName)
            if (response.error) throw new Error(`${response.error}, please try again.`)
            // {
            //     "user_id": "19877818",
            //     "session_id": "123456",
            //     "query": "Installment not received",
            //     "query_intent": "Installment not received",
            //     "language": "English",
            //     "response": "Dear Beneficiary, You can check your status using Know Your Status (KYS) module at https://pmkisan.gov.in/BeneficiaryStatus_New.aspx. \nIf you are not satisfied with the status, please contact the PM Kisan officer Shri ABC on 9809898989 or you can also visit the Officer at PM Kisan Officer, 193310 village, 868 block, 965 sub-district, 123 district, 9, Pincode: . \nFor further assistant, please contact on the PM Kisan Samman Nidhi helpline number: 155261 / 011-24300606. The helpline is available on all working days from 9:30 AM to 6:00 PM."
            //   }
            let intent;
            if (response.query_intent == "Invalid") intent = "convo"
            if (response.query_intent == "convo_starter") intent =  "convo"
            if (response.query_intent == "convo_ender") intent =  "convo"
            if (response.query_intent == "Installment Not Received") intent = "payment"
            else {
                intent = "invalid"
            }
            return {
                class: intent,
                response: response.response
            }
        } catch (error){
            return Promise.reject(error)
        }
    }

  async logError(_, event) {
    console.log("logError");
    console.log(event.data);
    return event.data;
  }

  async validateAadhaarNumber(context, event) {
    console.log("validate aadhar");
    try {
      const userIdentifier = `${context.userAadhaarNumber}${context.lastAadhaarDigits}`;
      let res;
      if (/^[6-9]\d{9}$/.test(userIdentifier)) {
        this.monitoringService.incrementMobileNumberCount();
        res = await this.userService.sendOTP(userIdentifier, "Mobile");
      } else if (
        userIdentifier.length == 14 &&
        /^[6-9]\d{9}$/.test(userIdentifier.substring(0, 10))
      ) {
        res = await this.userService.sendOTP(userIdentifier, "MobileAadhar");
      } else if (userIdentifier.length == 12 && /^\d+$/.test(userIdentifier)) {
        this.monitoringService.incrementAadhaarCount();
        res = await this.userService.sendOTP(userIdentifier, "Aadhar");
      } else if (userIdentifier.length == 11) {
        this.monitoringService.incrementRegistrationIdCount();
        res = await this.userService.sendOTP(userIdentifier, "Ben_id");
      } else {
        return Promise.resolve(
          "Please enter a valid Beneficiary ID/Aadhaar Number/Phone number"
        );
      }
      if (res) {
        if (
          res.d.output.Message ==
          `No Record Found for this (${context.userAadhaarNumber}) Aadhar/Ben_id/Mobile.`
        ) {
          this.monitoringService.incrementNoUserRecordsFoundCount();
        }
        return Promise.resolve(res.d.output.Message);
      }
      this.monitoringService.incrementSomethingWentWrongCount();
      throw new Error("Something went wrong.");
    } catch (error) {
      console.log(error);
      return Promise.reject(new Error("Something went wrong."));
    }
  }

  async validateOTP(context, event) {
    console.log("Validate OTP");
    const userIdentifier = `${context.userAadhaarNumber}${context.lastAadhaarDigits}`;
    const otp = context.otp;
    let res;
    // Perform OTP validation logic here
    if (/^[6-9]\d{9}$/.test(userIdentifier)) {
      res = await this.userService.verifyOTP(userIdentifier, otp, "Mobile");
    } else if (
      userIdentifier.length == 14 &&
      /^[6-9]\d{9}$/.test(userIdentifier.substring(0, 10))
    ) {
      res = await this.userService.verifyOTP(
        userIdentifier,
        otp,
        "MobileAadhar"
      );
    } else if (userIdentifier.length == 12 && /^\d+$/.test(userIdentifier)) {
      res = await this.userService.verifyOTP(userIdentifier, otp, "Aadhar");
    } else if (userIdentifier.length == 11) {
      res = await this.userService.verifyOTP(userIdentifier, otp, "Ben_id");
    } else {
      return Promise.reject(
        new Error(
          "Something went wrong, Please try again by asking your question."
        )
      );
    }
    if (res) {
      return Promise.resolve(res.d.output.Message);
    } else {
      return Promise.reject(
        new Error(
          "Something went wrong, Please try again by asking your question."
        )
      );
    }
  }

  async fetchUserData(context, event) {
    console.log("Fetch user data");
    const userIdentifier = `${context.userAadhaarNumber}${context.lastAadhaarDigits}`;
    let res;
    let type = "Mobile";
    if (/^[6-9]\d{9}$/.test(userIdentifier)) {
      type = "Mobile";
      res = await this.userService.getUserData(userIdentifier, "Mobile");
    } else if (
      userIdentifier.length == 14 &&
      /^[6-9]\d{9}$/.test(userIdentifier.substring(0, 10))
    ) {
      type = "MobileAadhar";
      res = await this.userService.getUserData(userIdentifier, "MobileAadhar");
    } else if (userIdentifier.length == 12 && /^\d+$/.test(userIdentifier)) {
      type = "Aadhar";
      res = await this.userService.getUserData(userIdentifier, "Aadhar");
    } else if (userIdentifier.length == 11) {
      type = "Ben_id";
      res = await this.userService.getUserData(userIdentifier, "Ben_id");
    } else {
      return Promise.reject(
        new Error(
          "Please enter a valid Beneficiary ID/Aadhaar Number/Phone number"
        )
      );
    }
    if (res.d.output.Message == "Unable to get user details") {
      return Promise.reject(new Error(res.d.output.Message));
    }
        let userDetails = AADHAAR_GREETING_MESSAGE(
      titleCase(res.d.output["BeneficiaryName"]),
      titleCase(res.d.output["FatherName"]),
      res.d.output["DOB"],
      res.d.output["Address"],
      res.d.output["DateOfRegistration"],
      res.d.output["LatestInstallmentPaid"],
      res.d.output["Reg_No"],
      titleCase(res.d.output["StateName"]),
      titleCase(res.d.output["DistrictName"]),
      titleCase(res.d.output["SubDistrictName"]),
      titleCase(res.d.output["VillageName"]),
      res.d.output["eKYC_Status"]
    );

    console.log("ChatbotBeneficiaryStatus");
    console.log("using...", userIdentifier, type);
    let userErrors = [];
    try {
      // let encryptedData = await encryptRequest(
      //   `{\"Types\":\"${type}",\"Values\":\"${userIdentifier}\",\"Token\":\"${this.configService.get(
      //     "PM_KISSAN_TOKEN"
      //   )}\"}`
      // );
      var token = getUniqueKey();
      // const requestData = JSON.stringify({
      //   Types: type,
      //   Values: userIdentifier,
      //   Token: token
      // });
      let requestData = `{\"Types\":\"${type}\",\"Values\":\"${userIdentifier}\",\"Token\":\"${this.configService.get("PM_KISSAN_TOKEN")}\"}`;

      let encrypted_text = await encrypt(requestData, token); //without @
      // let data = JSON.stringify({
      //   EncryptedRequest: `${encryptedData.d.encryptedvalu}@${encryptedData.d.token}`,
      // });
      // console.log("body", data);
      let data = {
        "EncryptedRequest":`${encrypted_text}@${token}`
       };

      let config = {
        method: "post",
        maxBodyLength: Infinity,
        url: `${this.configService.get(
          "PM_KISAN_BASE_URL"
        )}/ChatbotBeneficiaryStatus`,
        headers: {
          "Content-Type": "application/json",
        },
        data: data,
      };

      let errors: any = await axios.request(config);
      errors = await errors.data;
      console.log("related issues", errors);
      let decryptedData: any = await decryptRequest(
        errors.d.output,
        token
      );
      errors = JSON.parse(decryptedData);
      if (errors.Rsponce == "True") {
        const queryType = typeof context.queryType === 'object' 
          ? context.queryType.class 
          : context.queryType;
        Object.entries(errors).forEach(([key, value]) => {
          if (key != "Rsponce" && key != "Message") {
            if (
              value &&
              PMKissanProtalErrors[`${value}`] &&
              PMKissanProtalErrors[`${value}`]["types"].indexOf(
                queryType
              ) != -1
            ) {
              console.log(`ERRORVALUE: ${key} ${value}`);
              userErrors.push(
                PMKissanProtalErrors[`${value}`]["text"].replace(
                  "{{farmer_name}}",
                  titleCase(res.d.output["BeneficiaryName"])
                )
              );
            }
          }
        });
      }
      if (!userErrors.length) {
        userErrors.push(
          PMKissanProtalErrors["No Errors"]["text"]
            .replace(
              "{{farmer_name}}",
              titleCase(res.d.output["BeneficiaryName"])
            )
            .replace(
              "{{latest_installment_paid}}",
              res.d.output["LatestInstallmentPaid"]
            )
            .replace(
              "{{Reg_Date (DD-MM-YYYY)}}",
              moment(res.d.output["DateOfRegistration"]).format("DD-MM-YYYY")
            )
        );
      }
    } catch (error) {
      console.log("ChatbotBeneficiaryStatus error");
      console.log(error);
    }
    return `${userDetails}${userErrors.join("\n")}`;
  }

  async wadhwaniClassifier(context) {
    console.log("Wadhwani Classifierrr");
    try {
      let response: any = await this.aiToolsService.getResponseViaWadhwani(
        context.sessionId,
        context.userId,
        context.query,
        context.schemeName
      );
      if (response.error)
        throw new Error(`${response.error}, please try again.`);
      return response;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  allFunctions() {
    return {
      getInput: this.getInput.bind(this),
      questionClassifier: this.questionClassifier.bind(this),
      logError: this.logError.bind(this),
      validateAadhaarNumber: this.validateAadhaarNumber.bind(this),
      validateOTP: this.validateOTP.bind(this),
      fetchUserData: this.fetchUserData.bind(this),
      wadhwaniClassifier: this.wadhwaniClassifier.bind(this),
    };
  }

  getXstateMachine(name: string) {
    let machine;
    switch (name) {
      case "botFlowMachine1":
        machine = createMachine(botFlowMachine1, {
          actions: promptActions,
          services: this.allFunctions(),
          guards: promptGuards,
        });
        break;
      case "botFlowMachine2":
        machine = createMachine(botFlowMachine2, {
          actions: promptActions,
          services: this.allFunctions(),
          guards: promptGuards,
        });
        break;
      case "botFlowMachine3":
        machine = createMachine(botFlowMachine3, {
          actions: promptActions,
          services: this.allFunctions(),
          guards: promptGuards,
        });
        break;
      default:
        machine = createMachine(botFlowMachine3, {
          actions: promptActions,
          services: this.allFunctions(),
          guards: promptGuards,
        });
    }
    return machine;
  }
}
