
import { Controller, Post, Body, Get } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';

@Controller('custom/metrics')
export class MonitoringController {
  constructor(private monitoringService: MonitoringService) {}

  @Post('/increment')
  async incrementmetics(@Body() metric: String): Promise<any> {
    console.log(metric)
    let count;
    if(metric){
        switch(metric){
            case 'bhashiniCount':
                this.monitoringService.incrementBhashiniCount();
                count = await this.monitoringService.getBhashiniCount();
                break;
            case 'bhashiniSuccessCount':
                this.monitoringService.incrementBhashiniSuccessCount();
                count = await this.monitoringService.getBhashiniSuccessCount();
                break;
            case 'bhashiniFailureCount':
                this.monitoringService.incrementBhashiniFailureCount();
                count = await this.monitoringService.getBhashiniFailureCount();
                break;
            case 'totalSessions':
                this.monitoringService.incrementTotalSessionsCount();
                count = await this.monitoringService.getTotalSessionsCount();
                break;
            case 'totalSuccessfullSessions':
                this.monitoringService.incrementTotalSuccessfullSessionsCount();
                count = await this.monitoringService.getTotalSuccessfullSessionsCount();
                break;
            case 'totalFailureSessions' :
                this.monitoringService.incrementTotalFailureSessionsCount();
                count = await this.monitoringService.getTotalFailureSessionsCount();
                break;
            case 'totalIncompleteSessions' :
                this.monitoringService.incrementTotalIncompleteSessionsCount();
                count = await this.monitoringService.getTotalIncompleteSessionsCount();
                break;
            case 'totalSessionsInHindi':
                this.monitoringService.incrementTotalSessionsInHindiCount();
                count = await this.monitoringService.getTotalSessionsInHindiCount();
                break;
            case 'totalSessionsInTamil':
                this.monitoringService.incrementTotalSessionsInTamilCount();
                count = await this.monitoringService.getTotalSessionsInTamilCount();
                break;
            case 'totalSessionsInOdia':
                this.monitoringService.incrementTotalSessionsInOdiaCount();
                count = await this.monitoringService.getTotalSessionsInOdiaCount();
                break;
            case 'totalSessionsInTelugu':
                this.monitoringService.incrementTotalSessionsInTeluguCount();
                count = await this.monitoringService.getTotalSessionsInTeluguCount();
                break;
            case 'totalSessionsInMarathi':
                this.monitoringService.incrementTotalSessionsInMarathiCount();
                count = await this.monitoringService.getTotalSessionsInMarathiCount();
                break;
            case 'totalSessionsInBangla':
                this.monitoringService.incrementTotalSessionsInBanglaCount();
                count = await this.monitoringService.getTotalSessionsInBanglaCount();
                break;
            case 'totalSessionsInEnglish':
                this.monitoringService.incrementTotalSessionsInEnglishCount();
                count = await this.monitoringService.getTotalSessionsInEnglishCount();
                break;
            case "aadhaarCount":
                this.monitoringService.incrementAadhaarCount();
                count = await this.monitoringService.getAadhaarCount();
                break;
            case "registrationIdCount":
                this.monitoringService.incrementRegistrationIdCount();
                count = await this.monitoringService.getRegistrationIdCount();
                break;
            case "mobileNumberCount":
                this.monitoringService.incrementMobileNumberCount();
                count = await this.monitoringService.getMobileNumberCount();
                break;
            case "positveFeedbackCount":
                this.monitoringService.incrementPositveFeedbackCount();
                count = await this.monitoringService.getPositveFeedbackCount();
                break;
            case "negativeFeedbackCount":
                this.monitoringService.incrementNegativeFeedbackCount();
                count = await this.monitoringService.getNegativeFeedbackCount();
                break;
            case "micUsedCount":
                this.monitoringService.incrementMicUsedCount();
                count = await this.monitoringService.getMicUsedCount();
                break;
            case "directMessageTypedCount":
                this.monitoringService.incrementDirectMessageTypedCount();
                count = await this.monitoringService.getDirectMessageTypedCount();
                break;
            case "sampleQueryUsedCount":
                this.monitoringService.incrementSampleQueryUsedCount();
                count = await this.monitoringService.getSampleQueryUsedCount();
                break;
            case "internalServerError":
                this.monitoringService.incrementInternalServerErrorCount();
                count = await this.monitoringService.getInternalServerErrorCount();
                break;
            case "badGateway":
                this.monitoringService.incrementBadGatewayCount();
                count = await this.monitoringService.getBadGatewayCount();
                break;
            case "gatewayTimeoutCount":
                this.monitoringService.incrementGatewayTimeoutCount();
                count = await this.monitoringService.getGatewayTimeoutCount();
                break;
            case "somethingWentWrongCount":
                this.monitoringService.incrementSomethingWentWrongCount();
                count = await this.monitoringService.getSomethingWentWrongCount();
                break;
            case "unsupportedMediaCount":
                this.monitoringService.incrementUnsupportedMediaCount();
                count = await this.monitoringService.getUnsupportedMediaCount();
                break;
            case "unableToTranslateCount":
                this.monitoringService.incrementUnableToTranslateCount();
                count = await this.monitoringService.getUnableToTranslateCount();
                break;
            case "somethingWentWrongTryAgainCount":
                this.monitoringService.incrementSomethingWentWrongTryAgainCount();
                count = await this.monitoringService.getSomethingWentWrongTryAgainCount();
                break;
            case "unableToGetUserDetailsCount":
                this.monitoringService.incrementUnableToGetUserDetailsCount();
                count = await this.monitoringService.getUnableToGetUserDetailsCount();
                break;
            case "noUserRecordsFoundCount":
                this.monitoringService.incrementNoUserRecordsFoundCount();
                count = await this.monitoringService.getNoUserRecordsFoundCount();
                break;
            case "untrainedQueryCount":
                this.monitoringService.incrementUntrainedQueryCount();
                count = await this.monitoringService.getUntrainedQueryCount();
                break;
            case "resentOTPCount":
                this.monitoringService.incrementResentOTPCount();
                count = await this.monitoringService.getResentOTPCount();
                break;
            case "stage1Count":
                this.monitoringService.incrementStage1Count();
                count = await this.monitoringService.getStage1Count();
                break;
            case "stage2Count":
                this.monitoringService.incrementStage2Count();
                count = await this.monitoringService.getStage2Count();
                break;
            case "stage3Count":
                this.monitoringService.incrementStage3Count();
                count = await this.monitoringService.getStage3Count();
                break;
            case "stage4Count":
                this.monitoringService.incrementStage4Count();
                count = await this.monitoringService.getStage4Count();
                break;
            case "stage5Count":
                this.monitoringService.incrementStage5Count();
                count = await this.monitoringService.getStage5Count();
                break;
            default:
                count = `'${metric}' metric does not exist`
                break;
        }
    }
    return count;
  }

  @Post('/save')
  async save(): Promise<any> {
    await this.monitoringService.onExit()
    return 'metrics saved'
  }

  @Post('/set')
  async set(@Body() metrics: any): Promise<any> {
    await this.monitoringService.setMetrics(metrics)
    return 'metrics set'
  }

}






