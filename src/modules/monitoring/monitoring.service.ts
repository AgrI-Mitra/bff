import { Injectable } from '@nestjs/common';
import { Counter, Registry } from 'prom-client';
import { PrismaService } from '../../global-services/prisma.service';
import { CacheProvider } from '../cache/cache.provider';
import { BiharKrishiMetrics } from '@prisma/client';
@Injectable()
export class MonitoringService {
  // Initialize registry inline so it's available for field initializers
  private readonly registry: Registry = new Registry();

  constructor(private prismaService: PrismaService, private cache: CacheProvider) {
    // No need to reinitialize the registry here
  }

  private getOrCreateCounter(name: string, help: string, labelNames: string[] = []): Counter<string> {
    const existingMetric = this.registry.getSingleMetric(name);
    
    if (existingMetric) {
      return existingMetric as Counter<string>;
    }

    const counter = new Counter({
      name,
      help,
      labelNames,
      registers: [this.registry]  // Important: Register the counter with our registry
    });

    return counter;
  }

  // Initialize counters in constructor
  private biharKrishiQuestionsCounter = this.getOrCreateCounter(
    'biharKrishiQuestionsCount',
    'Total number of questions asked to Bihar Krishi API'
  );

  private biharKrishiSuccessCounter = this.getOrCreateCounter(
    'biharKrishiSuccessCount',
    'Total number of successful Bihar Krishi API responses'
  );

  private biharKrishiFailureCounter = this.getOrCreateCounter(
    'biharKrishiFailureCount',
    'Total number of failed Bihar Krishi API responses'
  );

  private biharKrishiSchemeCounter = this.getOrCreateCounter(
    'bihar_krishi_scheme_total',
    'Total number of questions per scheme',
    ['scheme']
  );

  // Add the missing counter for API key usage
  private biharKrishiApiKeyCounter = this.getOrCreateCounter(
    'bihar_krishi_api_key_total',
    'Total number of requests per API key',
    ['api_key']
  );

  async initializeAsync() {
    const metricsToUpsert: any = [
      { name: 'bhashiniCount' },
      { name: 'bhashiniSuccessCount' },
      { name: 'bhashiniFailureCount' },
      { name: 'totalSessions' },
      { name: 'totalSuccessfullSessions' },
      { name: 'totalFailureSessions' },
      { name: 'totalIncompleteSessions' },
      { name: 'totalSessionsInHindi' },
      { name: 'totalSessionsInTamil' },
      { name: 'totalSessionsInOdia' },
      { name: 'totalSessionsInTelugu' },
      { name: 'totalSessionsInMarathi' },
      { name: 'totalSessionsInBangla' },
      { name: 'totalSessionsInEnglish' },
      { name: "aadhaarCount" },
      { name: "registrationIdCount" },
      { name: "mobileNumberCount" },
      { name: "positveFeedbackCount" },
      { name: "negativeFeedbackCount" },
      { name: "micUsedCount" },
      { name: "directMessageTypedCount" },
      { name: "sampleQueryUsedCount" },
      { name: "internalServerErrorCount" },
      { name: "badGatewayCount" },
      { name: "gatewayTimeoutCount" },
      { name: "somethingWentWrongCount" },
      { name: "unsupportedMediaCount" },
      { name: "unableToTranslateCount" },
      { name: "somethingWentWrongTryAgainCount" },
      { name: "unableToGetUserDetailsCount" },
      { name: "noUserRecordsFoundCount" },
      { name: "untrainedQueryCount" },
      { name: "resentOTPCount" },
      { name: "stage1Count" },
      { name: "stage2Count" },
      { name: "stage3Count" },
      { name: "stage4Count" },
      { name: "stage5Count" },
      { name: 'biharKrishiQuestionsCount' },
      { name: 'biharKrishiSuccessCount' },
      { name: 'biharKrishiFailureCount' },
    ];
    for (const metric of metricsToUpsert) {
      const existingMetric: any = await this.prismaService.metrics.findUnique({
        where: { name: metric.name },
      });
      if (existingMetric) {
        switch (existingMetric.name) {
          case 'bhashiniCount':
            this.bhashiniCounter.inc(parseInt((await this.cache.get('bhashiniCount')) || '0'));
            break;
          case 'bhashiniSuccessCount':
            this.bhashiniSuccessCounter.inc(parseInt((await this.cache.get('bhashiniSuccessCount')) || '0'));
            break;
          case 'bhashiniFailureCount':
            this.bhashiniFailureCounter.inc(parseInt((await this.cache.get('bhashiniFailureCount')) || '0'));
            break;
          case 'totalSessions':
            this.totalSessionsCounter.inc(parseInt((await this.cache.get('totalSessions')) || '0'));
            break;
          case 'totalSuccessfullSessions':
            this.totalSuccessfullSessionsCounter.inc(parseInt((await this.cache.get('totalSuccessfullSessions')) || '0'));
            break;
          case 'totalFailureSessions':
            this.totalFailureSessionsCounter.inc(parseInt((await this.cache.get('totalFailureSessions')) || '0'));
            break;
          case 'totalIncompleteSessions':
            this.totalIncompleteSessionsCounter.inc(parseInt((await this.cache.get('totalIncompleteSessions')) || '0'));
            break
          case 'totalSessionsInHindi':
            this.totalSessionsInHindiCounter.inc(parseInt((await this.cache.get('totalSessionsInHindi')) || '0'));
            break;
          case 'totalSessionsInTamil':
            this.totalSessionsInTamilCounter.inc(parseInt((await this.cache.get('totalSessionsInTamil')) || '0'));
            break;
          case 'totalSessionsInOdia':
            this.totalSessionsInOdiaCounter.inc(parseInt((await this.cache.get('totalSessionsInOdia')) || '0'));
            break;
          case 'totalSessionsInTelugu':
            this.totalSessionsInTeluguCounter.inc(parseInt((await this.cache.get('totalSessionsInTelugu')) || '0'));
            break;
          case 'totalSessionsInMarathi':
            this.totalSessionsInMarathiCounter.inc(parseInt((await this.cache.get('totalSessionsInMarathi')) || '0'));
            break;
          case 'totalSessionsInBangla':
            this.totalSessionsInBanglaCounter.inc(parseInt((await this.cache.get('totalSessionsInBangla')) || '0'));
            break;
          case 'totalSessionsInEnglish':
            this.totalSessionsInEnglishCounter.inc(parseInt((await this.cache.get('totalSessionsInEnglish')) || '0'));
            break;
          case "aadhaarCount":
            this.aadhaarCounter.inc(parseInt((await this.cache.get('aadhaarCount')) || '0'));
            break;
          case "registrationIdCount":
            this.registrationIdCounter.inc(parseInt((await this.cache.get('registrationIdCount')) || '0'));
            break;
          case "mobileNumberCount":
            this.mobileNumberCounter.inc(parseInt((await this.cache.get('mobileNumberCount')) || '0'));
            break;
          case "positveFeedbackCount":
            this.positveFeedbackCounter.inc(parseInt((await this.cache.get('positveFeedbackCount')) || '0'));
            break;
          case "negativeFeedbackCount":
            this.negativeFeedbackCounter.inc(parseInt((await this.cache.get('negativeFeedbackCount')) || '0'));
            break;
          case "micUsedCount":
            this.micUsedCounter.inc(parseInt((await this.cache.get('micUsedCount')) || '0'));
            break;
          case "directMessageTypedCount":
            this.directMessageTypedCounter.inc(parseInt((await this.cache.get('directMessageTypedCount')) || '0'));
            break;
          case "sampleQueryUsedCount":
            this.sampleQueryUsedCounter.inc(parseInt((await this.cache.get('sampleQueryUsedCount')) || '0'));
            break;
          case "internalServerErrorCount":
            this.internalServerErrorCounter.inc(parseInt((await this.cache.get('internalServerErrorCount')) || '0'));
            break;
          case "badGatewayCount":
            this.badGatewayCounter.inc(parseInt((await this.cache.get('badGatewayCount')) || '0'));
            break;
          case "gatewayTimeoutCount":
            this.gatewayTimeoutCounter.inc(parseInt((await this.cache.get('gatewayTimeoutCount')) || '0'));
            break;
          case "somethingWentWrongCount":
            this.somethingWentWrongCounter.inc(parseInt((await this.cache.get('somethingWentWrongCount')) || '0'));
            break;
          case "unsupportedMediaCount":
            this.unsupportedMediaCounter.inc(parseInt((await this.cache.get('unsupportedMediaCount')) || '0'));
            break;
          case "unableToTranslateCount":
            this.unableToTranslateCounter.inc(parseInt((await this.cache.get('unableToTranslateCount')) || '0'));
            break;
          case "somethingWentWrongTryAgainCount":
            this.somethingWentWrongTryAgainCounter.inc(parseInt((await this.cache.get('somethingWentWrongTryAgainCount')) || '0'));
            break;
          case "unableToGetUserDetailsCount":
            this.unableToGetUserDetailsCounter.inc(parseInt((await this.cache.get('unableToGetUserDetailsCount')) || '0'));
            break;
          case "noUserRecordsFoundCount":
            this.noUserRecordsFoundCounter.inc(parseInt((await this.cache.get('noUserRecordsFoundCount')) || '0'));
            break;
          case "untrainedQueryCount":
            this.untrainedQueryCounter.inc(parseInt((await this.cache.get('untrainedQueryCount')) || '0'));
            break;
          case "resentOTPCount":
            this.resentOTPCounter.inc(parseInt((await this.cache.get('resentOTPCount')) || '0'));
            break;
          case "stage1Count":
            this.stage1Counter.inc(parseInt((await this.cache.get('stage1Count')) || '0'));
            break;
          case "stage2Count":
            this.stage2Counter.inc(parseInt((await this.cache.get('stage2Count')) || '0'));
            break;
          case "stage3Count":
            this.stage3Counter.inc(parseInt((await this.cache.get('stage3Count')) || '0'));
            break;
          case "stage4Count":
            this.stage4Counter.inc(parseInt((await this.cache.get('stage4Count')) || '0'));
            break;
          case "stage5Count":
            this.stage5Counter.inc(parseInt((await this.cache.get('stage5Count')) || '0'));
            break;
          case 'biharKrishiQuestionsCount':
            this.biharKrishiQuestionsCounter.inc();
            break;
          case 'biharKrishiSuccessCount':
            this.biharKrishiSuccessCounter.inc();
            break;
          case 'biharKrishiFailureCount':
            this.biharKrishiFailureCounter.inc();
            break;
          default:
            break;
        }
      }
    }
  }

  private bhashiniCounter: Counter<string> = this.getOrCreateCounter(
    'bhashini_api_count',
    'Count of bhashini API requests'
  );
  private bhashiniSuccessCounter: Counter<string> = this.getOrCreateCounter(
    'bhashini_api_success_count',
    'Counts the successful API requests in Bhashini service',
  );
  private bhashiniFailureCounter: Counter<string> = this.getOrCreateCounter(
    'bhashini_api_failure_count',
    'Counts the failed API requests in Bhashini service',
  );

  private totalSessionsCounter: Counter<string> = this.getOrCreateCounter(
    'total_sessions_count',
    'Counts the API requests of /prompt API',
  );

  private totalSuccessfullSessionsCounter: Counter<string> = this.getOrCreateCounter(
    'total_successfull_sessions_count',
    'Counts the API requests of /prompt API',
  );

  private totalFailureSessionsCounter: Counter<string> = this.getOrCreateCounter(
    'total_failure_sessionsCounter',
    'Counts the API requests of /prompt API',
  );

  private totalIncompleteSessionsCounter: Counter<string> = this.getOrCreateCounter(
    'total_incomplete_sessions_count',
    'Counts the API requests of /prompt API',
  );

  private totalSessionsInHindiCounter: Counter<string> = this.getOrCreateCounter(
    'total_sessions_in_hindi_count',
    'Counts the API requests of /prompt API',
  );

  private totalSessionsInTamilCounter: Counter<string> = this.getOrCreateCounter(
    'total_sessions_in_tamil_count',
    'Counts the API requests of /prompt API',
  );

  private totalSessionsInOdiaCounter: Counter<string> = this.getOrCreateCounter(
    'total_sessions_in_odia_count',
    'Counts the API requests of /prompt API',
  );

  private totalSessionsInTeluguCounter: Counter<string> = this.getOrCreateCounter(
    'total_sessions_in_telugu_count',
    'Counts the API requests of /prompt API',
  );

  private totalSessionsInMarathiCounter: Counter<string> = this.getOrCreateCounter(
    'total_sessions_in_marathi_count',
    'Counts the API requests of /prompt API',
  );

  private totalSessionsInBanglaCounter: Counter<string> = this.getOrCreateCounter(
    'total_sessions_in_bangla_count',
    'Counts the API requests of /prompt API',
  );

  private totalSessionsInEnglishCounter: Counter<string> = this.getOrCreateCounter(
    'total_sessions_in_english_count',
    'Counts the API requests of /prompt API',
  );

  private aadhaarCounter: Counter<string> = this.getOrCreateCounter(
    'aadhaar_count',
    'Counts the API requests of /prompt API',
  );

  private registrationIdCounter: Counter<string> = this.getOrCreateCounter(
    'registration_id_count',
    'Counts the API requests of /prompt API',
  );

  private mobileNumberCounter: Counter<string> = this.getOrCreateCounter(
    'mobile_number_count',
    'Counts the API requests of /prompt API',
  );

  private positveFeedbackCounter: Counter<string> = this.getOrCreateCounter(
    'positve_feedback_count',
    'Counts the API requests of /prompt API',
  );

  private negativeFeedbackCounter: Counter<string> = this.getOrCreateCounter(
    'negative_feedback_count',
    'Counts the API requests of /prompt API',
  );

  private micUsedCounter: Counter<string> = this.getOrCreateCounter(
    'mic_used_count',
    'Counts the API requests of /prompt API',
  );

  private directMessageTypedCounter: Counter<string> = this.getOrCreateCounter(
    'direct_message_typed_count',
    'Counts the API requests of /prompt API',
  );

  private sampleQueryUsedCounter: Counter<string> = this.getOrCreateCounter(
    'sample_query_used_count',
    'Counts number of times user used sample query',
  );

  private internalServerErrorCounter: Counter<string> = this.getOrCreateCounter(
    'internal_server_error_count',
    'Counts the internal server errors',
  );

  private badGatewayCounter: Counter<string> = this.getOrCreateCounter(
    'bad_gateway_count',
    'Counts the bat gateway errors',
  );

  private gatewayTimeoutCounter: Counter<string> = this.getOrCreateCounter(
    'gateway_timeout_count',
    'gateway timeout count'
  )

  private somethingWentWrongCounter: Counter<string> = this.getOrCreateCounter(
    'something_went_wrong_count',
    'something went wrong count'
  )

  private unsupportedMediaCounter: Counter<string> = this.getOrCreateCounter(
    'unsupported_media_count',
    'unsupported media count'
  )

  private unableToTranslateCounter: Counter<string> = this.getOrCreateCounter(
    'unable_to_translate_count',
    'unable to translate count'
  )

  private somethingWentWrongTryAgainCounter: Counter<string> = this.getOrCreateCounter(
    'something_went_wrong_try_again_count',
    'something went wrong try again count'
  )

  private unableToGetUserDetailsCounter: Counter<string> = this.getOrCreateCounter(
    'unable_to_get_user_details_count',
    'unable to get user details count'
  )

  private noUserRecordsFoundCounter: Counter<string> = this.getOrCreateCounter(
    'no_user_records_found_count',
    'no user records found count'
  )

  private untrainedQueryCounter: Counter<string> = this.getOrCreateCounter(
    'untrained_query_count',
    'untrained query count'
  )

  private resentOTPCounter: Counter<string> = this.getOrCreateCounter(
    'resent_otp_count',
    'resent otp count'
  )

  private stage1Counter: Counter<string> = this.getOrCreateCounter(
    'stage_1_count',
    'Count of sessions which are at stage 1'
  )

  private stage2Counter: Counter<string> = this.getOrCreateCounter(
    'stage_2_count',
    'Count of sessions which are at stage 2'
  )

  private stage3Counter: Counter<string> = this.getOrCreateCounter(
    'stage_3_count',
    'Count of sessions which are at stage 3'
  )

  private stage4Counter: Counter<string> = this.getOrCreateCounter(
    'stage_4_count',
    'Count of sessions which are at stage 4'
  )

  private stage5Counter: Counter<string> = this.getOrCreateCounter(
    'stage_5_count',
    'Count of sessions which are at stage 5'
  )

  public async getBhashiniCount() {
    let count = await this.bhashiniCounter.get();
    return count.values[0].value;
  }

  public async getBhashiniSuccessCount() {
    let count = await this.bhashiniSuccessCounter.get();
    return count.values[0].value;
  }

  public async getBhashiniFailureCount() {
    let count = await this.bhashiniFailureCounter.get();
    return count.values[0].value;
  }

  public async getTotalSessionsCount() {
    let count = await this.totalSessionsCounter.get();
    return count.values[0].value;
  }

  public async getTotalSuccessfullSessionsCount() {
    let count = await this.totalSuccessfullSessionsCounter.get();
    return count.values[0].value;
  }

  public async getTotalFailureSessionsCount() {
    let count = await this.totalFailureSessionsCounter.get();
    return count.values[0].value;
  }

  public async getTotalIncompleteSessionsCount() {
    let count = await this.totalIncompleteSessionsCounter.get();
    return count.values[0].value;
  }

  public async getTotalSessionsInHindiCount() {
    let count = await this.totalSessionsInHindiCounter.get();
    return count.values[0].value;
  }

  public async getTotalSessionsInTamilCount() {
    let count = await this.totalSessionsInTamilCounter.get();
    return count.values[0].value;
  }

  public async getTotalSessionsInOdiaCount() {
    let count = await this.totalSessionsInOdiaCounter.get();
    return count.values[0].value;
  }

  public async getTotalSessionsInTeluguCount() {
    let count = await this.totalSessionsInTeluguCounter.get();
    return count.values[0].value;
  }

  public async getTotalSessionsInMarathiCount() {
    let count = await this.totalSessionsInMarathiCounter.get();
    return count.values[0].value;
  }

  public async getTotalSessionsInBanglaCount() {
    let count = await this.totalSessionsInBanglaCounter.get();
    return count.values[0].value;
  }

  public async getTotalSessionsInEnglishCount() {
    let count = await this.totalSessionsInEnglishCounter.get();
    return count.values[0].value;
  }

  public async getAadhaarCount() {
    let count = await this.aadhaarCounter.get();
    return count.values[0].value;
  }

  public async getRegistrationIdCount() {
    let count = await this.registrationIdCounter.get();
    return count.values[0].value;
  }

  public async getMobileNumberCount() {
    let count = await this.mobileNumberCounter.get();
    return count.values[0].value;
  }

  public async getPositveFeedbackCount() {
    let count = await this.positveFeedbackCounter.get();
    return count.values[0].value;
  }

  public async getNegativeFeedbackCount() {
    let count = await this.negativeFeedbackCounter.get();
    return count.values[0].value;
  }

  public async getMicUsedCount() {
    let count = await this.micUsedCounter.get();
    return count.values[0].value;
  }

  public async getDirectMessageTypedCount() {
    let count = await this.directMessageTypedCounter.get();
    return count.values[0].value;
  }

  public async getSampleQueryUsedCount() {
    let count = await this.sampleQueryUsedCounter.get();
    return count.values[0].value;
  }

  public async getInternalServerErrorCount() {
    let count = await this.internalServerErrorCounter.get();
    return count.values[0].value;
  }

  public async getBadGatewayCount() {
    let count = await this.badGatewayCounter.get();
    return count.values[0].value;
  }

  public async getGatewayTimeoutCount() {
    let count = await this.gatewayTimeoutCounter.get();
    return count.values[0].value;
  }

  public async getSomethingWentWrongCount() {
    let count = await this.somethingWentWrongCounter.get();
    return count.values[0].value;
  }

  public async getUnsupportedMediaCount() {
    let count = await this.unsupportedMediaCounter.get();
    return count.values[0].value;
  }

  public async getUnableToTranslateCount() {
    let count = await this.unableToTranslateCounter.get();
    return count.values[0].value;
  }

  public async getSomethingWentWrongTryAgainCount() {
    let count = await this.somethingWentWrongTryAgainCounter.get();
    return count.values[0].value;
  }

  public async getUnableToGetUserDetailsCount() {
    let count = await this.unableToGetUserDetailsCounter.get();
    return count.values[0].value;
  }

  public async getNoUserRecordsFoundCount() {
    let count = await this.noUserRecordsFoundCounter.get();
    return count.values[0].value;
  }

  public async getUntrainedQueryCount() {
    let count = await this.untrainedQueryCounter.get();
    return count.values[0].value;
  }

  public async getResentOTPCount() {
    let count = await this.resentOTPCounter.get();
    return count.values[0].value;
  }

  public async getStage1Count() {
    let count = await this.stage1Counter.get();
    return count.values[0].value;
  }

  public async getStage2Count() {
    let count = await this.stage2Counter.get();
    return count.values[0].value;
  }

  public async getStage3Count() {
    let count = await this.stage3Counter.get();
    return count.values[0].value;
  }

  public async getStage4Count() {
    let count = await this.stage4Counter.get();
    return count.values[0].value;
  }

  public async getStage5Count() {
    let count = await this.stage5Counter.get();
    return count.values[0].value;
  }

  public incrementBhashiniCount(): void {
    this.bhashiniCounter.inc();
    this.cache.increment('bhashiniCount');
  }

  public incrementBhashiniSuccessCount(): void {
    this.bhashiniSuccessCounter.inc();
    this.cache.increment('bhashiniSuccessCount');
  }

  public incrementBhashiniFailureCount(): void {
    this.bhashiniFailureCounter.inc();
  }

  public incrementTotalSessionsCount() {
    this.totalSessionsCounter.inc();
    this.cache.increment('totalSessions');
  }

  public incrementTotalSuccessfullSessionsCount() {
    this.totalSuccessfullSessionsCounter.inc();
    this.cache.increment('totalSuccessfullSessions');
  }

  public incrementTotalFailureSessionsCount() {
    this.totalFailureSessionsCounter.inc();
    this.cache.increment('totalFailureSessions');
  }

  public incrementTotalIncompleteSessionsCount() {
    this.totalIncompleteSessionsCounter.inc();
    this.cache.increment('totalIncompleteSessions');
  }

  public incrementTotalSessionsInHindiCount() {
    this.totalSessionsInHindiCounter.inc();
    this.cache.increment('totalSessionsInHindi');
  }

  public incrementTotalSessionsInTamilCount() {
    this.totalSessionsInTamilCounter.inc();
    this.cache.increment('totalSessionsInTamil');
  }

  public incrementTotalSessionsInOdiaCount() {
    this.totalSessionsInOdiaCounter.inc();
    this.cache.increment('totalSessionsInOdia');
  }

  public incrementTotalSessionsInTeluguCount() {
    this.totalSessionsInTeluguCounter.inc();
    this.cache.increment('totalSessionsInTelugu');
  }

  public incrementTotalSessionsInMarathiCount() {
    this.totalSessionsInMarathiCounter.inc();
    this.cache.increment('totalSessionsInMarathi');
  }

  public incrementTotalSessionsInBanglaCount() {
    this.totalSessionsInBanglaCounter.inc();
    this.cache.increment('totalSessionsInBangla');
  }

  public incrementTotalSessionsInEnglishCount() {
    this.totalSessionsInEnglishCounter.inc();
    this.cache.increment('totalSessionsInEnglish');
  }

  public incrementAadhaarCount() {
    this.aadhaarCounter.inc();
    this.cache.increment('aadhaarCount');
  }

  public incrementRegistrationIdCount() {
    this.registrationIdCounter.inc();
    this.cache.increment('registrationIdCount');
  }

  public incrementMobileNumberCount() {
    this.mobileNumberCounter.inc();
    this.cache.increment('mobileNumberCount');
  }

  public incrementPositveFeedbackCount() {
    this.positveFeedbackCounter.inc();
    this.cache.increment('positveFeedbackCount');
  }

  public incrementNegativeFeedbackCount() {
    this.negativeFeedbackCounter.inc();
    this.cache.increment('negativeFeedbackCount');
  }

  public incrementMicUsedCount() {
    this.micUsedCounter.inc();
    this.cache.increment('micUsedCount');
  }

  public incrementDirectMessageTypedCount() {
    this.directMessageTypedCounter.inc();
    this.cache.increment('directMessageTypedCount');
  }

  public incrementSampleQueryUsedCount() {
    this.sampleQueryUsedCounter.inc();
    this.cache.increment('sampleQueryUsedCount');
  }

  public incrementInternalServerErrorCount() {
    this.internalServerErrorCounter.inc();
    this.cache.increment('internalServerErrorCount');
  }

  public incrementBadGatewayCount() {
    this.badGatewayCounter.inc();
    this.cache.increment('badGatewayCount');
  }

  public incrementGatewayTimeoutCount() {
    this.gatewayTimeoutCounter.inc();
    this.cache.increment('gatewayTimeoutCount');
  }

  public incrementSomethingWentWrongCount() {
    this.somethingWentWrongCounter.inc();
    this.cache.increment('somethingWentWrongCount');
  }

  public incrementUnsupportedMediaCount() {
    this.unsupportedMediaCounter.inc();
    this.cache.increment('unsupportedMediaCount');
  }

  public incrementUnableToTranslateCount() {
    this.unableToTranslateCounter.inc();
    this.cache.increment('unableToTranslateCount');
  }

  public incrementSomethingWentWrongTryAgainCount() {
    this.somethingWentWrongTryAgainCounter.inc();
    this.cache.increment('somethingWentWrongTryAgainCount');
  }

  public incrementUnableToGetUserDetailsCount() {
    this.unableToGetUserDetailsCounter.inc();
    this.cache.increment('unableToGetUserDetailsCount');
  }

  public incrementNoUserRecordsFoundCount() {
    this.noUserRecordsFoundCounter.inc();
    this.cache.increment('noUserRecordsFoundCount');
  }

  public incrementUntrainedQueryCount() {
    this.untrainedQueryCounter.inc();
    this.cache.increment('untrainedQueryCount');
  }

  public incrementResentOTPCount() {
    this.resentOTPCounter.inc();
    this.cache.increment('resentOTPCount');
  }

  public incrementStage1Count() {
    this.stage1Counter.inc();
    this.cache.increment('stage1Count');
  }

  public incrementStage2Count() {
    this.stage2Counter.inc();
    this.cache.increment('stage2Count');
  }

  public incrementStage3Count() {
    this.stage3Counter.inc();
    this.cache.increment('stage3Count');
  }

  public incrementStage4Count() {
    this.stage4Counter.inc();
    this.cache.increment('stage4Count');
  }

  public incrementStage5Count() {
    this.stage5Counter.inc();
    this.cache.increment('stage5Count');
  }

  public incrementBiharKrishiQuestionsCount(): void {
    this.biharKrishiQuestionsCounter.inc();
  }

  public incrementBiharKrishiSuccessCount(): void {
    this.biharKrishiSuccessCounter.inc();
  }

  public incrementBiharKrishiFailureCount(): void {
    this.biharKrishiFailureCounter.inc();
  }

  public incrementBiharKrishiSchemeCount(schemeName: string): void {
    this.biharKrishiSchemeCounter.inc({ scheme: schemeName });
  }

  public incrementBiharKrishiApiKeyUsage(apiKey: string): void {
    const maskedApiKey = apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 'unknown';
    this.biharKrishiApiKeyCounter.inc({ api_key: maskedApiKey });
  }

  public async onExit(): Promise<void> {
    const metricsToUpsert: any = [
      { name: 'bhashiniCount', value: `${await this.getBhashiniCount()}` },
      { name: 'bhashiniSuccessCount', value: `${await this.getBhashiniSuccessCount()}` },
      { name: 'bhashiniFailureCount', value: `${await this.getBhashiniFailureCount()}` },
      { name: 'totalSessions', value: `${await this.getTotalSessionsCount()}` },
      { name: 'totalSuccessfullSessions', value: `${await this.getTotalSuccessfullSessionsCount()}` },
      { name: 'totalFailureSessions', value: `${await this.getTotalFailureSessionsCount()}` },
      { name: 'totalIncompleteSessions', value: `${await this.getTotalIncompleteSessionsCount()}` },
      { name: 'totalSessionsInHindi', value: `${await this.getTotalSessionsInHindiCount()}` },
      { name: 'totalSessionsInTamil', value: `${await this.getTotalSessionsInTamilCount()}` },
      { name: 'totalSessionsInOdia', value: `${await this.getTotalSessionsInOdiaCount()}` },
      { name: 'totalSessionsInTelugu', value: `${await this.getTotalSessionsInTeluguCount()}` },
      { name: 'totalSessionsInMarathi', value: `${await this.getTotalSessionsInMarathiCount()}` },
      { name: 'totalSessionsInBangla', value: `${await this.getTotalSessionsInBanglaCount()}` },
      { name: 'totalSessionsInEnglish', value: `${await this.getTotalSessionsInEnglishCount()}` },
      { name: "aadhaarCount", value: `${await this.getAadhaarCount()}` },
      { name: "registrationIdCount", value: `${await this.getRegistrationIdCount()}` },
      { name: "mobileNumberCount", value: `${await this.getMobileNumberCount()}` },
      { name: "positveFeedbackCount", value: `${await this.getPositveFeedbackCount()}` },
      { name: "negativeFeedbackCount", value: `${await this.getNegativeFeedbackCount()}` },
      { name: "micUsedCount", value: `${await this.getMicUsedCount()}` },
      { name: "directMessageTypedCount", value: `${await this.getDirectMessageTypedCount()}` },
      { name: "sampleQueryUsedCount", value: `${await this.getSampleQueryUsedCount()}` },
      { name: "internalServerErrorCount", value: `${await this.getInternalServerErrorCount()}` },
      { name: "badGatewayCount", value: `${await this.getBadGatewayCount()}` },
      { name: "gatewayTimeoutCount", value: `${await this.getGatewayTimeoutCount()}` },
      { name: "somethingWentWrongCount", value: `${await this.getSomethingWentWrongCount()}` },
      { name: "unsupportedMediaCount", value: `${await this.getUnsupportedMediaCount()}` },
      { name: "unableToTranslateCount", value: `${await this.getUnableToTranslateCount()}` },
      { name: "somethingWentWrongTryAgainCount", value: `${await this.getSomethingWentWrongTryAgainCount()}` },
      { name: "unableToGetUserDetailsCount", value: `${await this.getUnableToGetUserDetailsCount()}` },
      { name: "noUserRecordsFoundCount", value: `${await this.getNoUserRecordsFoundCount()}` },
      { name: "untrainedQueryCount", value: `${await this.getUntrainedQueryCount()}` },
      { name: "resentOTPCount", value: `${await this.getResentOTPCount()}` },
      { name: "stage1Count", value: `${await this.getStage1Count()}` },
      { name: "stage2Count", value: `${await this.getStage2Count()}` },
      { name: "stage3Count", value: `${await this.getStage3Count()}` },
      { name: "stage4Count", value: `${await this.getStage4Count()}` },
      { name: "stage5Count", value: `${await this.getStage5Count()}` },
      { name: 'biharKrishiQuestionsCount', value: `${await this.getBiharKrishiQuestionsCount()}` },
      { name: 'biharKrishiSuccessCount', value: `${await this.getBiharKrishiSuccessCount()}` },
      { name: 'biharKrishiFailureCount', value: `${await this.getBiharKrishiFailureCount()}` },
    ];
    const upsertedMetrics = [];
    try {
      for (const metric of metricsToUpsert) {
        const existingMetric: any = await this.prismaService.metrics.findUnique({
          where: { name: metric.name },
        });

        if (existingMetric) {
          const updatedMetric = await this.prismaService.metrics.update({
            where: { id: existingMetric.id },
            data: { value: metric.value },
          });
          upsertedMetrics.push(updatedMetric);
        } else {
          const createdMetric = await this.prismaService.metrics.create({
            data: metric,
          });
          upsertedMetrics.push(createdMetric);
        }
      }
    } catch (err) {
      console.log(err)
    }
  }

  public async setMetrics(metricsToUpsert): Promise<void> {
    const upsertedMetrics = [];
    try {
      for (const metric of metricsToUpsert) {
        const existingMetric: any = await this.prismaService.metrics.findUnique({
          where: { name: metric.name },
        });

        if (existingMetric) {
          const updatedMetric = await this.prismaService.metrics.update({
            where: { id: existingMetric.id },
            data: { value: metric.value },
          });
          upsertedMetrics.push(updatedMetric);
        } else {
          const createdMetric = await this.prismaService.metrics.create({
            data: metric,
          });
          upsertedMetrics.push(createdMetric);
        }
      }
    } catch (err) {
      console.log(err)
    }
  }

  public async logBiharKrishiMetric(data: {
    apiKey: string;
    question: string;
    schemeName: string;
    status: 'SUCCESS' | 'FAILURE';
  }): Promise<void> {
    try {
      const maskedApiKey = data.apiKey
        ? `${data.apiKey.substring(0, 4)}...${data.apiKey.substring(data.apiKey.length - 4)}`
        : 'unknown';

      await this.prismaService.biharKrishiMetrics.create({
        data: {
          apiKey: maskedApiKey,
          question: data.question,
          schemeName: data.schemeName,
          status: data.status,
        },
      });
    } catch (error) {
      console.error('Failed to log Bihar Krishi metric:', error);
    }
  }

  public async getBiharKrishiMetrics(filters?: {
    startDate?: Date;
    endDate?: Date;
    schemeName?: string;
    apiKey?: string;
    status?: string;
  }) {
    const where: any = {};
    if (filters?.startDate && filters?.endDate) {
      where.createdAt = {
        gte: filters.startDate,
        lte: filters.endDate,
      };
    }
    if (filters?.schemeName) {
      where.schemeName = filters.schemeName;
    }
    if (filters?.apiKey) {
      where.apiKey = filters.apiKey;
    }
    if (filters?.status) {
      where.status = filters.status;
    }

    return await this.prismaService.biharKrishiMetrics.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  public async getBiharKrishiQuestionsCount(): Promise<number> {
    return (await this.biharKrishiQuestionsCounter.get()).values[0].value;
  }

  public async getBiharKrishiSuccessCount(): Promise<number> {
    return (await this.biharKrishiSuccessCounter.get()).values[0].value;
  }

  public async getBiharKrishiFailureCount(): Promise<number> {
    return (await this.biharKrishiFailureCounter.get()).values[0].value;
  }
}