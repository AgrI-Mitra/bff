import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
// import { PrismaService } from '../global-services/prisma.service';
import { PrismaService } from 'src/global-services/prisma.service';
import { ConfigService } from '@nestjs/config';
import { HealthCheckResponse, ServiceHealthInfo } from './types/health.types';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';
// import { CacheProvider } from '../modules/cache/cache.provider';
import { CacheProvider } from '../cache/cache.provider';
import { getUniqueKey, encrypt } from 'src/common/utils';
import { promises as fs } from 'fs';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly cacheProvider: CacheProvider,
  ) {}

  private async loadBase64Audio(): Promise<string> {
    // Load the base64 string from the file
    return await fs.readFile('src/modules/health/audio_base64.txt', 'utf8');
  }

  async checkAllServices(): Promise<HealthCheckResponse> {
    const services = await Promise.all([
      this.checkPostgres(),
      this.checkRedis(),
      this.checkBhashini(),
      this.checkWadhwani(),
      this.checkPMKisan(),
    ]);

    const response: HealthCheckResponse = {
      status: 'ok',
      info: {},
      error: {},
      details: {},
    };

    services.forEach(service => {
      if (service.status.isAvailable) {
        response.info[service.name] = service;
      } else {
        response.error[service.name] = service;
        response.status = 'error';
      }
    });

    return response;
  }

private async checkBhashini(): Promise<ServiceHealthInfo> {
  const services = ['translation', 'speech-to-text', 'text-to-speech'];
  const failedServices: string[] = [];
  
  try {
    const baseUrl = this.configService.get<string>('health.bhashini.baseUrl');
    const apiKey = this.configService.get<string>('health.bhashini.apiKey');
    const timeoutMs = this.configService.get<number>('health.bhashini.timeout');
    
    if (!baseUrl || !apiKey) {
      throw new Error('Bhashini configuration missing');
    }

    const base64audio = await this.loadBase64Audio();

    // Check each service individually
    const checks = [
      // Translation Check
      this.checkBhashiniService('translation', async () => {
        const response = await firstValueFrom(
          this.httpService.post(`${baseUrl}`, {
            pipelineTasks: [
              {
                taskType: "translation",
                config: {
                  language: {
                    sourceLanguage: "en",
                    targetLanguage: "hi"
                  }
                }
              }
            ],
            inputData: {
              input: [{ source: "We are testing Bhashini for our Application startup" }]
            }
          }, {
            headers: {
              'Authorization': apiKey,
              'Content-Type': 'application/json'
            }
          }).pipe(timeout(timeoutMs))
        );
        console.log('Translation response:', response.data.pipelineResponse[0]?.output);
      }),

      // Speech-to-Text Check
      this.checkBhashiniService('speech-to-text', async () => {
        const response = await firstValueFrom(
          this.httpService.post(`${baseUrl}`, {
            pipelineTasks: [
              {
                taskType: "asr",
                config: {
                  language: {
                    sourceLanguage: "en"
                  },
                  postProcessors: ["itn"]
                }
              }
            ],
            inputData: {
              audio: [{ 
                audioContent: base64audio 
              }]
            }
          }, {
            headers: {
              'Authorization': apiKey,
              'Content-Type': 'application/json'
            }
          }).pipe(timeout(timeoutMs))
        );
        console.log('Speech-to-text response:', response.data.pipelineResponse[0]?.output);
      }),

      // Text-to-Speech Check
      this.checkBhashiniService('text-to-speech', async () => {
        const response = await firstValueFrom(
          this.httpService.post(`${baseUrl}`, {
            pipelineTasks: [
              {
                taskType: "tts",
                config: {
                  language: {
                    sourceLanguage: "en"
                  },
                  gender: "male",
                  samplingRate: 8000
                }
              }
            ],
            inputData: {
              input: [{ 
                source: "testing the bhashini service" 
              }]
            }
          }, {
            headers: {
              'Authorization': apiKey,
              'Content-Type': 'application/json'
            }
          }).pipe(timeout(timeoutMs))
        );
        console.log('Text-to-speech response:', response.data.pipelineResponse[0]?.output);
      })
    ];

    const results = await Promise.allSettled(checks);
    console.log("the results are ", results);
    
    // Process results
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        failedServices.push(services[index]);
      }
    });

    if (failedServices.length > 0) {
      throw new Error(`Failed services: ${failedServices.join(', ')}`);
    }

    this.logger.log('All Bhashini services are healthy');
    return {
      status: { isAvailable: true },
      name: 'bhashini',
      type: 'external',
      impactMessage: 'All Bhashini services are operational',
      sla: {
        timeForResolutionInMinutes: -1,
        priority: 0,
      },
    };

  } catch (error) {
    const errorMessage = `Bhashini health check failed: ${error.message}`;
    this.logger.error(errorMessage);
    
    // Create detailed error message
    let detailedError = failedServices.length > 0 
      ? `Failed services: ${failedServices.join(', ')}`
      : error.message;

    return {
      status: { isAvailable: false },
      name: 'bhashini',
      type: 'external',
      impactMessage: `The following Bhashini services are not working: ${failedServices.join(', ')}`,
      error: detailedError,
      sla: {
        timeForResolutionInMinutes: -1,
        priority: 0,
      },
    };
  }
}

// Helper method to check individual services
private async checkBhashiniService(
  serviceName: string, 
  checkFunction: () => Promise<void>
): Promise<void> {
  try {
    this.logger.log(`Checking Bhashini ${serviceName} service...`);
    await checkFunction();
    this.logger.log(`Bhashini ${serviceName} check passed`);
  } catch (error) {
    this.logger.error(`Bhashini ${serviceName} check failed: ${error.message}`);
    throw new Error(`${serviceName} check failed: ${error.message}`);
  }
}

private async checkWadhwani(): Promise<ServiceHealthInfo> {
  try {
    const baseUrl = this.configService.get<string>('health.wadhwani.baseUrl');
    const apiKey = this.configService.get<string>('health.wadhwani.apiKey');

    if (!baseUrl || !apiKey) {
      throw new Error('Wadhwani configuration missing');
    }

    const sessionId = '23e1ef83-50e0-52fe-8c96-d23d2f981793';
    const userId = '23e1ef83-50e0-52fe-8c96-d23d2f981793';
    const schemeName = 'All Schemes';
    const query = 'When will i get my installment?';

    const startDate = new Date();
    this.logger.log(`${startDate}: Performing Wadhwani health check with query: ${query}`);

    const response = await firstValueFrom(
      this.httpService.get(`${baseUrl}/get_bot_response`, {
        params: {
          query,
          user_id: userId,
          session_id: sessionId,
          scheme_name: schemeName,
        },
        headers: {
          'X-API-Key': apiKey,
          'accept': 'application/json',
        },
      }).pipe(timeout(5000))
    );

    const endDate = new Date();
    this.logger.log(`${endDate}: Wadhwani health check responded successfully in ${endDate.getTime() - startDate.getTime()} ms`);

    return {
      status: { isAvailable: true },
      name: 'Wadhwani LLM',
      type: 'external',
      impactMessage: 'Chatbot will not be able to answer general questions',
      sla: {
        timeForResolutionInMinutes: 120,
        priority: 1,
      },
    };
  } catch (error) {
    this.logger.error(`Wadhwani health check failed: ${error.message}`);
    return {
      status: { isAvailable: false },
      name: 'Wadhwani LLM',
      type: 'external',
      impactMessage: 'Chatbot will not be able to answer general questions',
      error: error.message,
      sla: {
        timeForResolutionInMinutes: 120,
        priority: 1,
      },
    };
  }
}

private async checkPMKisan(): Promise<ServiceHealthInfo> {
  try {
    const baseUrl = this.configService.get<string>('PM_KISAN_BASE_URL');
    const token = this.configService.get<string>('PM_KISAN_TOKEN');
    const testAadhaar = this.configService.get<string>('TEST_AADHAAR_NO');

    
    console.log('Starting PM Kisan health check...');
    console.log('Base URL:', baseUrl);
    console.log('Test Aadhaar:', testAadhaar);
    
    if (!baseUrl) {
      console.error('PM Kisan configuration missing - baseUrl not found');
      throw new Error('PM Kisan configuration missing');
    }

    console.log('Testing all PM Kisan endpoints...');
    
    // Test all endpoints
    await Promise.all([
      this.checkPMKisanBasicConnectivity(baseUrl).then(() => {
        console.log('✅ Basic connectivity check passed');
      }).catch(error => {
        console.error('❌ Basic connectivity check failed:', error.message);
        throw error;
      }),
      
      this.checkPMKisanOTP(baseUrl, testAadhaar).then(() => {
        console.log('✅ OTP endpoint check passed');
      }).catch(error => {
        console.error('❌ OTP endpoint check failed:', error.message);
        throw error;
      }),
      
      this.checkPMKisanOTPVerification(baseUrl, testAadhaar).then(() => {
        console.log('✅ OTP verification endpoint check passed');
      }).catch(error => {
        console.error('❌ OTP verification endpoint check failed:', error.message);
        throw error;
      }),
      
      this.checkPMKisanUserDetails(baseUrl, testAadhaar).then(() => {
        console.log('✅ User details endpoint check passed');
      }).catch(error => {
        console.error('❌ User details endpoint check failed:', error.message);
        throw error;
      }),
      
      this.checkPMKisanBeneficiaryStatus(baseUrl, testAadhaar).then(() => {
        console.log('✅ Beneficiary status endpoint check passed');
      }).catch(error => {
        console.error('❌ Beneficiary status endpoint check failed:', error.message);
        throw error;
      })
    ]);

    console.log('✅ All PM Kisan health checks passed successfully');
    
    return {
      status: { isAvailable: true },
      name: 'PM Kisan',
      type: 'external',
      impactMessage: 'PM Kisan services including OTP, verification, and user details retrieval will not work',
      sla: {
        timeForResolutionInMinutes: 120,
        priority: 1,
      },
    };
  } catch (error) {
    console.error('❌ PM Kisan health check failed with error:', error.message);
    console.error('Full error details:', error);
    
    this.logger.error(`PM Kisan health check failed: ${error.message}`);
    return {
      status: { isAvailable: false },
      name: 'PM Kisan',
      type: 'external',
      impactMessage: 'PM Kisan services including OTP, verification, and user details retrieval will not work',
      error: error.message,
      sla: {
        timeForResolutionInMinutes: 120,
        priority: 1,
      },
    };
  }
}

private async checkPMKisanBasicConnectivity(baseUrl: string): Promise<void> {
  try {
    const response = await firstValueFrom(
      this.httpService.post(`${baseUrl}/HelloWorld`,
        `<?xml version="1.0" encoding="utf-8"?>
         <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
           <soap:Body>
             <HelloWorld xmlns="http://tempuri.org/" />
           </soap:Body>
         </soap:Envelope>`,
        {
          headers: {
            'Content-Type': 'text/xml',
            'SOAPAction': 'http://tempuri.org/'
          }
        }
      ).pipe(timeout(5000))
    );

    if (response.status !== 200) {
      throw new Error(`Basic connectivity check failed with status ${response.status}`);
    }
  } catch (error) {
    throw new Error(`PM Kisan basic connectivity check failed: ${error.message}`);
  }
}

private async checkPMKisanOTP(baseUrl: string, aadhaar: string): Promise<void> {
  try {
    const key = getUniqueKey();
    const requestData = `{\"Types\":\"Aadhar\",\"Values\":\"${aadhaar}\",\"Token\":\"FHGBHFYBT268Gpf37hmJ6RY\"}`;
    const encrypted_text = await encrypt(requestData, key);
    
    const data = {
      "EncryptedRequest": `${encrypted_text}@${key}`
    };

    const response = await firstValueFrom(
      this.httpService.post(`${baseUrl}/ChatbotOTP`,
        data,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      ).pipe(timeout(5000))
    );

    if (response.status !== 200) {
      throw new Error(`OTP endpoint check failed with status ${response.status}`);
    }
  } catch (error) {
    throw new Error(`PM Kisan OTP check failed: ${error.message}`);
  }
}

private async checkPMKisanOTPVerification(baseUrl: string, aadhaar: string): Promise<void> {
  try {
    const key = getUniqueKey();
    const requestData = `{\"Types\":\"Aadhar\",\"Values\":\"${aadhaar}\",\"OTP\":\"123456\",\"Token\":\"FHGBHFYBT268Gpf37hmJ6RY\"}`;
    const encrypted_text = await encrypt(requestData, key);
    
    const data = {
      "EncryptedRequest": `${encrypted_text}@${key}`
    };

    const response = await firstValueFrom(
      this.httpService.post(`${baseUrl}/ChatbotOTPVerified`,
        data,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      ).pipe(timeout(5000))
    );

    if (response.status !== 200) {
      throw new Error(`OTP verification endpoint check failed with status ${response.status}`);
    }
  } catch (error) {
    throw new Error(`PM Kisan OTP verification check failed: ${error.message}`);
  }
}

private async checkPMKisanUserDetails(baseUrl: string, aadhaar: string): Promise<void> {
  try {
    const key = getUniqueKey();
    const requestData = `{\"Types\":\"Aadhar\",\"Values\":\"${aadhaar}\",\"Token\":\"FHGBHFYBT268Gpf37hmJ6RY\"}`;
    const encrypted_text = await encrypt(requestData, key);
    
    const data = {
      "EncryptedRequest": `${encrypted_text}@${key}`
    };

    const response = await firstValueFrom(
      this.httpService.post(`${baseUrl}/ChatbotUserDetails`,
        data,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      ).pipe(timeout(5000))
    );

    if (response.status !== 200) {
      throw new Error(`User details endpoint check failed with status ${response.status}`);
    }
  } catch (error) {
    throw new Error(`PM Kisan user details check failed: ${error.message}`);
  }
}

private async checkPMKisanBeneficiaryStatus(baseUrl: string, aadhaar: string): Promise<void> {
  try {
    const key = getUniqueKey();
    const requestData = `{\"Types\":\"Aadhar\",\"Values\":\"${aadhaar}\",\"Token\":\"FHGBHFYBT268Gpf37hmJ6RY\"}`;
    const encrypted_text = await encrypt(requestData, key);
    
    const data = {
      "EncryptedRequest": `${encrypted_text}@${key}`
    };

    const response = await firstValueFrom(
      this.httpService.post(`${baseUrl}/ChatbotBeneficiaryStatus`,
        data,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      ).pipe(timeout(5000))
    );

    if (response.status !== 200) {
      throw new Error(`Beneficiary status endpoint check failed with status ${response.status}`);
    }
  } catch (error) {
    throw new Error(`PM Kisan beneficiary status check failed: ${error.message}`);
  }
}
private async checkPostgres(): Promise<ServiceHealthInfo> {
  try {
    // Test database connection with a simple query
    await this.prisma.$queryRaw`
      SELECT 1 as result;
    `;

    // Additional check for specific tables if needed
    await this.prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'conversation'
      );
    `;

    return {
      status: { isAvailable: true },
      name: 'Postgres',
      type: 'internal',
      impactMessage: 'Database operations and conversation history will not work',
      sla: {
        timeForResolutionInMinutes: 60,
        priority: 0,
      },
    };
  } catch (error) {
    this.logger.error(`Postgres health check failed: ${error.message}`, error.stack);
    return {
      status: { isAvailable: false },
      name: 'Postgres',
      type: 'internal',
      impactMessage: 'Database operations and conversation history will not work',
      error: error.message,
      sla: {
        timeForResolutionInMinutes: 60,
        priority: 0,
      },
    };
  }
}
private async checkRedis(): Promise<ServiceHealthInfo> {
  try {
    const testKey = 'health:test:' + Date.now();
    const testValue = 'health-check-' + Date.now();

    // Test Redis SET operation
    await this.cacheProvider.set(testKey, testValue);

    // Test Redis GET operation
    const retrievedValue = await this.cacheProvider.get(testKey);

    // Test Redis DEL operation
    await this.cacheProvider.del(testKey);

    // Verify the test
    if (retrievedValue !== testValue) {
      throw new Error('Redis read/write test failed: values do not match');
    }

    // Additional check - verify if we can still get the key after deletion
    const deletedValue = await this.cacheProvider.get(testKey);
    if (deletedValue !== null) {
      throw new Error('Redis delete operation failed');
    }

    return {
      status: { isAvailable: true },
      name: 'Redis',
      type: 'internal',
      impactMessage: "Cache operations will be slower and session data may be unavailable",
      sla: {
        timeForResolutionInMinutes: 60,
        priority: 0,
      },
    };
  } catch (error) {
    this.logger.error(`Redis health check failed: ${error.message}`, error.stack);
    return {
      status: { isAvailable: false },
      name: 'Redis',
      type: 'internal',
      impactMessage: "Cache operations will be slower and session data may be unavailable",
      error: error.message,
      sla: {
        timeForResolutionInMinutes: 60,
        priority: 0,
      },
    };
  }
}
}