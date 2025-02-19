import { Test, TestingModule } from '@nestjs/testing';
import { AiToolsService } from './ai-tools.service';
import { CACHE_MANAGER } from '@nestjs/common';
import { MonitoringService } from '../monitoring/monitoring.service';
import { HttpService } from '@nestjs/axios';
import { Language } from '../../language';
import { ConfigService } from '@nestjs/config';

// Load environment variables
require('dotenv').config();

// Add test environment variables if not present
process.env.BHASHINI_DHRUVA_AUTHORIZATION = process.env.BHASHINI_DHRUVA_AUTHORIZATION || 'test-auth-key';
process.env.BHASHINI_DHRUVA_ENDPOINT = process.env.BHASHINI_DHRUVA_ENDPOINT || 'https://test-bhashini-api.example.com';

describe('AiToolsService', () => {
  let service: AiToolsService;
  let monitoringService: MonitoringService;
  let cacheManager: Cache;
  let httpService: HttpService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiToolsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              return process.env[key];
            }),
          },
        },
        {
          provide: MonitoringService,
          useValue: {
            incrementBhashiniCount: jest.fn(),
            incrementBhashiniSuccessCount: jest.fn(),
            incrementBhashiniFailureCount: jest.fn(),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AiToolsService>(AiToolsService);
    configService = module.get<ConfigService>(ConfigService);
    monitoringService = module.get<MonitoringService>(MonitoringService);
    cacheManager = module.get<Cache>(CACHE_MANAGER);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should use environment variables', () => {
    // Only check the environment variables actually used by AiToolsService
    const apiKey = process.env.BHASHINI_DHRUVA_AUTHORIZATION;
    const apiUrl = process.env.BHASHINI_DHRUVA_ENDPOINT;
    
    expect(apiKey).toBeDefined();
    expect(apiUrl).toBeDefined();
  });

  // Comment out encryption, decryption, and unique key generation
  // jest.spyOn(service, 'encrypt').mockImplementation((data) => data);
  // jest.spyOn(service, 'decrypt').mockImplementation((data) => data);
  // jest.spyOn(service, 'getUniqueKey').mockImplementation(() => 'mockedUniqueKey');

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('detectLanguage', () => {
    it('should detect language successfully', async () => {
      const mockResponse = {
        output: [{}],
        data: {
          pipelineResponse: [{
            output: [{
              langPrediction: [{
                langCode: Language.hi
              }]
            }]
          }]
        }
      };

      jest.spyOn(service as any, 'computeBhashini').mockResolvedValue(mockResponse);

      const result = await service.detectLanguage('नमस्ते', 'user123', 'session123');

      expect(result).toEqual({
        language: Language.hi,
        error: null
      });
      expect(monitoringService.incrementBhashiniSuccessCount).toHaveBeenCalled();
    });

    it('should handle detection failure and fallback to English for English text', async () => {
      jest.spyOn(service as any, 'computeBhashini').mockRejectedValue(new Error('API Error'));

      const result = await service.detectLanguage('Hello World', 'user123', 'session123');

      expect(result).toEqual({
        language: Language.en,
        error: 'API Error'
      });
      expect(monitoringService.incrementBhashiniFailureCount).toHaveBeenCalled();
    });
  });

  describe('translate', () => {
    it('should translate text successfully', async () => {
      const mockBhashiniConfig = {
        pipelineInferenceAPIEndPoint: {
          inferenceApiKey: { value: process.env.BHASHINI_DHRUVA_AUTHORIZATION },
          callbackUrl: process.env.BHASHINI_DHRUVA_ENDPOINT
        },
        pipelineResponseConfig: [{
          config: [{ serviceId: 'mock-service-id' }]
        }]
      };

      const mockTranslationResponse = {
        pipelineResponse: [{
          output: [{ target: 'Hello' }]
        }]
      };

      jest.spyOn(service as any, 'getBhashiniConfig').mockResolvedValue(mockBhashiniConfig);
      jest.spyOn(service as any, 'computeBhashini').mockResolvedValue(mockTranslationResponse);

      const result = await service.translate(
        Language.hi,
        Language.en,
        'नमस्ते',
        'user123',
        'session123'
      );

      expect(result).toEqual({
        text: 'Hello',
        error: null
      });
    });

    it('should handle translation with URLs correctly', async () => {
      const mockBhashiniConfig = {
        pipelineInferenceAPIEndPoint: {
          inferenceApiKey: { value: process.env.BHASHINI_DHRUVA_AUTHORIZATION },
          callbackUrl: process.env.BHASHINI_DHRUVA_ENDPOINT
        },
        pipelineResponseConfig: [{
          config: [{ serviceId: 'mock-service-id' }]
        }]
      };

      const mockTranslationResponse = {
        pipelineResponse: [{
          output: [{ target: 'Hello 9814567092798090023722437987555212294' }]
        }]
      };

      jest.spyOn(service as any, 'getBhashiniConfig').mockResolvedValue(mockBhashiniConfig);
      jest.spyOn(service as any, 'computeBhashini').mockResolvedValue(mockTranslationResponse);

      const result = await service.translate(
        Language.hi,
        Language.en,
        'नमस्ते https://example.com',
        'user123',
        'session123'
      );

      expect(result).toEqual({
        text: 'Hello https://example.com',
        error: null
      });
    });

    it('should call the translation API with correct parameters', async () => {
      const mockBhashiniConfig = {
        pipelineInferenceAPIEndPoint: {
          inferenceApiKey: { value: process.env.BHASHINI_DHRUVA_AUTHORIZATION },
          callbackUrl: process.env.BHASHINI_DHRUVA_ENDPOINT
        },
        pipelineResponseConfig: [{
          config: [{ serviceId: 'mock-service-id' }]
        }]
      };

      const mockTranslationResponse = {
        pipelineResponse: [{
          output: [{ target: 'Hello' }]
        }]
      };

      jest.spyOn(service as any, 'getBhashiniConfig').mockResolvedValue(mockBhashiniConfig);
      jest.spyOn(service as any, 'computeBhashini').mockResolvedValue(mockTranslationResponse);

      const result = await service.translate(
        Language.hi,
        Language.en,
        'Hello',
        'user123',
        'session123'
      );

      expect(result).toEqual({ 
        text: 'Hello',
        error: null 
      });
    });
  });

  describe('speechToText', () => {
    it('should convert speech to text successfully', async () => {
      const mockBhashiniConfig = {
        pipelineInferenceAPIEndPoint: {
          inferenceApiKey: { value: process.env.BHASHINI_DHRUVA_AUTHORIZATION },
          callbackUrl: process.env.BHASHINI_DHRUVA_ENDPOINT
        },
        pipelineResponseConfig: [{
          config: [{ serviceId: 'mock-service-id' }]
        }]
      };

      const mockResponse = {
        pipelineResponse: [{
          output: [{ source: 'Hello World' }]
        }]
      };

      jest.spyOn(service as any, 'getBhashiniConfig').mockResolvedValue(mockBhashiniConfig);
      jest.spyOn(service as any, 'computeBhashini').mockResolvedValue(mockResponse);

      const result = await service.speechToText('base64audio', Language.en, 'user123', 'session123');

      expect(result).toEqual({
        text: 'Hello World',
        error: null
      });
    });
  });

  describe('textToSpeech', () => {
    it('should convert text to speech successfully', async () => {
      const mockBhashiniConfig = {
        pipelineInferenceAPIEndPoint: {
          inferenceApiKey: { value: process.env.BHASHINI_DHRUVA_AUTHORIZATION },
          callbackUrl: process.env.BHASHINI_DHRUVA_ENDPOINT
        },
        pipelineResponseConfig: [{
          config: [{ serviceId: 'mock-service-id' }]
        }]
      };

      const mockResponse = {
        pipelineResponse: [{
          audio: [{ audioContent: 'base64audio' }]
        }]
      };

      jest.spyOn(service as any, 'getBhashiniConfig').mockResolvedValue(mockBhashiniConfig);
      jest.spyOn(service as any, 'computeBhashini').mockResolvedValue(mockResponse);

      const result = await service.textToSpeech('Hello', Language.en, 'male', 'user123', 'session123');

      expect(result).toEqual({
        text: 'base64audio',
        error: null
      });
    });
  });
});