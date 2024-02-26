import { ConfigService } from "@nestjs/config";
import { AiToolsService } from "../../modules/aiTools/ai-tools.service";
import { AADHAAR_GREETING_MESSAGE } from "../../common/constants";
import { UserService } from "../../modules/user/user.service";
import axios from "axios";
import { decryptRequest, encryptRequest, titleCase } from "../../common/utils";
import { PrismaService } from "src/global-services/prisma.service";
import { Injectable } from "@nestjs/common";
import { botFlowMachine1, botFlowMachine2, botFlowMachine3 } from "./prompt.machine";
import { createMachine } from "xstate";
import { promptActions } from "./prompt.actions";
import { promptGuards } from "./prompt.gaurds";
import { MonitoringService } from "src/modules/monitoring/monitoring.service";
const path = require('path');
const filePath = path.resolve(__dirname, '../../common/kisanPortalErrors.json');
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
    ){
        this.userService = new UserService(this.prismaService, this.configService, this.monitoringService)
    }

    async getInput (context) {
        return context
    }

    async questionClassifier (context) {
        try{
            let response: any = await this.aiToolsService.getResponseViaWadhwani(context.sessionId, context.userId, context.query)
            if (response.error) throw new Error(`${response.error}, please try again.`)
            if (response == `"Invalid"`) return "convo"
            if (response == `"convo_starter"`) return "convo"
            if (response == `"convo_ender"`) return "convo"
            if (response == `"Installment Not Received"`) return "payment"
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

    async logError (_, event) {
        console.log("logError")
        console.log(event.data)
        return event.data
    }

    async validateAadhaarNumber (context, event) {
        try{
            const userIdentifier = `${context.userAadhaarNumber}${context.lastAadhaarDigits}`;
            let res;
            if(/^[6-9]\d{9}$/.test(userIdentifier)) {
                this.monitoringService.incrementMobileNumberCount()
                res = await this.userService.sendOTP(userIdentifier,"Mobile")
            } else if(userIdentifier.length==14 && /^[6-9]\d{9}$/.test(userIdentifier.substring(0,10))){
                res = await this.userService.sendOTP(userIdentifier,"MobileAadhar")
            } else if(userIdentifier.length==12 && /^\d+$/.test(userIdentifier)){
                this.monitoringService.incrementAadhaarCount()
                res = await this.userService.sendOTP(userIdentifier,"Aadhar")
            } else if(userIdentifier.length == 11) { 
                this.monitoringService.incrementRegistrationIdCount()
                res = await this.userService.sendOTP(userIdentifier,"Ben_id")
            } else {
                return Promise.resolve('Please enter a valid Beneficiary ID/Aadhaar Number/Phone number');
            }
            if(res) {
                if(res.d.output.Message == `No Record Found for this (${context.userAadhaarNumber}) Aadhar/Ben_id/Mobile.`){
                    this.monitoringService.incrementNoUserRecordsFoundCount()
                }
                return Promise.resolve(res.d.output.Message);
            }
            this.monitoringService.incrementSomethingWentWrongCount()
            throw new Error('Something went wrong.')
        } catch (error) {
            console.log(error)
            return Promise.reject(new Error('Something went wrong.'))
        }
        
    }

    async validateOTP (context, event) {
        const userIdentifier = `${context.userAadhaarNumber}${context.lastAadhaarDigits}`;
        const otp = context.otp;
        let res;
        // Perform OTP validation logic here
        if(/^[6-9]\d{9}$/.test(userIdentifier)) {
            res = await this.userService.verifyOTP(userIdentifier,otp,"Mobile")
        } else if(userIdentifier.length==14 && /^[6-9]\d{9}$/.test(userIdentifier.substring(0,10))){
            res = await this.userService.verifyOTP(userIdentifier,otp,"MobileAadhar")
        } else if(userIdentifier.length==12 && /^\d+$/.test(userIdentifier)){
            res = await this.userService.verifyOTP(userIdentifier,otp,"Aadhar")
        } else if(userIdentifier.length == 11) { 
            res = await this.userService.verifyOTP(userIdentifier,otp,"Ben_id")
        } else {
            return Promise.reject(new Error('Something went wrong, Please try again by asking your question.'));
        }
        if(res){
            return Promise.resolve(res.d.output.Message);
        } else {
            return Promise.reject(new Error('Something went wrong, Please try again by asking your question.'));
        }
    }

    async fetchUserData (context, event) {
        const userIdentifier = `${context.userAadhaarNumber}${context.lastAadhaarDigits}`;
        let res;
        let type='Mobile'
        if(/^[6-9]\d{9}$/.test(userIdentifier)) {
            type='Mobile'
            res = await this.userService.getUserData(userIdentifier,"Mobile")
        } else if(userIdentifier.length==14 && /^[6-9]\d{9}$/.test(userIdentifier.substring(0,10))){
            type='MobileAadhar'
            res = await this.userService.getUserData(userIdentifier,"MobileAadhar")
        } else if(userIdentifier.length==12 && /^\d+$/.test(userIdentifier)){
            type = "Aadhar"
            res = await this.userService.getUserData(userIdentifier,"Aadhar")
        } else if(userIdentifier.length == 11) { 
            type = "Ben_id"
            res = await this.userService.getUserData(userIdentifier,"Ben_id")
        }else {
            return Promise.reject(new Error('Please enter a valid Beneficiary ID/Aadhaar Number/Phone number'));
        }
        if(res.d.output.Message=='Unable to get user details'){
            return Promise.reject(new Error(res.d.output.Message))
        }
        let userDetails = AADHAAR_GREETING_MESSAGE(
            titleCase(res.d.output['BeneficiaryName']),
            titleCase(res.d.output['FatherName']),
            res.d.output['DOB'],
            res.d.output['Address'],
            res.d.output['DateOfRegistration'],
            res.d.output['LatestInstallmentPaid'],
            res.d.output['Reg_No'],
            titleCase(res.d.output['StateName']),
            titleCase(res.d.output['DistrictName']),
            titleCase(res.d.output['SubDistrictName']),
            titleCase(res.d.output['VillageName']),
            res.d.output['eKYC_Status']
        )

        console.log("ChatbotBeneficiaryStatus")
        console.log("using...",userIdentifier, type)
        let userErrors = [];
        try {
        let encryptedData = await encryptRequest(`{\"Types\":\"${type}",\"Values\":\"${userIdentifier}\",\"Token\":\"${this.configService.get("PM_KISSAN_TOKEN")}\"}`)
        let data = JSON.stringify({
            "EncryptedRequest": `${encryptedData.d.encryptedvalu}@${encryptedData.d.token}`
        });
        console.log("body", data)
        
        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: `${this.configService.get("PM_KISAN_BASE_URL")}/ChatbotBeneficiaryStatus`,
            headers: { 
            'Content-Type': 'application/json'
            },
            data : data
        };

        let errors: any = await axios.request(config)
        errors = await errors.data
        console.log("related issues",errors)
        let decryptedData: any = await decryptRequest(errors.d.output,encryptedData.d.token)
        errors = JSON.parse(decryptedData.d.decryptedvalue)
        if(errors.Rsponce == "True"){
            Object.entries(errors).forEach(([key, value]) => {
            if(key!="Rsponce" && key != "Message"){
                if(value && PMKissanProtalErrors[`${value}`] && PMKissanProtalErrors[`${value}`]["types"].indexOf(context.queryType)!=-1){
                    console.log(`ERRORVALUE: ${key} ${value}`);
                    userErrors.push(PMKissanProtalErrors[`${value}`]["text"].replace('{{farmer_name}}',titleCase(res.d.output['BeneficiaryName'])))
                }
            }
            });
        }
        if(!userErrors.length){
            userErrors.push(PMKissanProtalErrors["No Errors"]["text"]
                .replace('{{farmer_name}}',titleCase(res.d.output['BeneficiaryName']))
                .replace('{{latest_installment_paid}}',res.d.output['LatestInstallmentPaid'])
                .replace('{{Reg_Date (DD-MM-YYYY)}}', moment(res.d.output['DateOfRegistration']).format('DD-MM-YYYY'))
            )
        }
        } catch (error) {
            console.log("ChatbotBeneficiaryStatus error")
            console.log(error)
        }
        return `${userDetails}${userErrors.join("\n")}`
    }

    async wadhwaniClassifier (context) {
        try{
            let response: any = await this.aiToolsService.getResponseViaWadhwani(context.sessionId, context.userId,context.query)
            if (response.error) throw new Error(`${response.error}, please try again.`)
            return response;
        } catch (error){
            return Promise.reject(error)
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
        }
    }

    getXstateMachine(name:string){
        let machine
        switch(name){
            case "botFlowMachine1":
                machine = createMachine(
                    botFlowMachine1,{
                    actions: promptActions,
                    services: this.allFunctions(),
                    guards: promptGuards
                })
                break
            case "botFlowMachine2":
                machine = createMachine(
                    botFlowMachine2,{
                    actions: promptActions,
                    services: this.allFunctions(),
                    guards: promptGuards
                })
                break
            case "botFlowMachine3":
                machine = createMachine(
                    botFlowMachine3,{
                    actions: promptActions,
                    services: this.allFunctions(),
                    guards: promptGuards
                })
                break
            default:
                machine = createMachine(
                    botFlowMachine3,{
                    actions: promptActions,
                    services: this.allFunctions(),
                    guards: promptGuards
                })
        }
        return machine
    }
}