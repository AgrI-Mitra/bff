import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../../global-services/prisma.service';
import { ConfigService } from '@nestjs/config';
import { MonitoringService } from '../monitoring/monitoring.service';
import axios from 'axios';
import { Logger } from '@nestjs/common';
import * as utils from '../../common/utils';

// Load environment variables
require('dotenv').config();

// Add test environment variables if not present
process.env.PM_KISAN_BASE_URL = process.env.PM_KISAN_BASE_URL || 'https://test-api.example.com';
process.env.PM_KISAN_ENC_DEC_API = process.env.PM_KISAN_ENC_DEC_API || 'https://test-api.example.com/encrypt';
process.env.PM_KISSAN_TOKEN = process.env.PM_KISSAN_TOKEN || 'test-token';

jest.mock('axios');
jest.mock('../../common/utils');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('UserService', () => {
  let service: UserService;
  let configService: ConfigService;
  let monitoringService: MonitoringService;

  const mockPrismaService = {
    $queryRawUnsafe: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      console.log(`Getting config for key: ${key}`);
      return process.env[key];
    }),
  };

  const mockMonitoringService = {
    incrementPositveFeedbackCount: jest.fn(),
    incrementNegativeFeedbackCount: jest.fn(),
    incrementUnableToGetUserDetailsCount: jest.fn(),
  };

  beforeEach(async () => {
    console.log('Setting up test module...');
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: MonitoringService,
          useValue: mockMonitoringService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    configService = module.get<ConfigService>(ConfigService);
    monitoringService = module.get<MonitoringService>(MonitoringService);

    // Mock the utility functions
    console.log('Setting up utility mocks...');
    (utils.getUniqueKey as jest.Mock).mockReturnValue('TESTKEY123456789');
    (utils.encrypt as jest.Mock).mockResolvedValue('encrypted_data');
    console.log('Test setup complete');
  });

  afterEach(() => {
    console.log('Clearing mocks...');
    jest.clearAllMocks();
  });

  it('should use environment variables', () => {
    // Only check the environment variables actually used by UserService
    const pmKisanBaseUrl = process.env.PM_KISAN_BASE_URL;
    const pmKisanEncDecApi = process.env.PM_KISAN_ENC_DEC_API;
    const pmKissanToken = process.env.PM_KISSAN_TOKEN;
    
    // Remove checks for unused variables
    expect(pmKisanBaseUrl).toBeDefined();
    expect(pmKisanEncDecApi).toBeDefined();
    expect(pmKissanToken).toBeDefined();
  });

  describe('sendOTP', () => {
    it('should successfully send OTP', async () => {
      const mobileNumber = '1234567890';
      
      const mockResponse = {
        status: 200,
        data: {
          d: {
            output: '{"Rsponce":"True","Message":"OTP sent successfully"}'
          }
        }
      };
      
      mockedAxios.request.mockResolvedValueOnce(mockResponse);
      (utils.decryptRequest as jest.Mock).mockResolvedValue('{"Rsponce":"True","Message":"OTP sent successfully"}');

      const result = await service.sendOTP(mobileNumber);

      expect(utils.getUniqueKey).toHaveBeenCalled();
      expect(utils.encrypt).toHaveBeenCalledWith(
        expect.stringContaining(`"Token":"${process.env.PM_KISSAN_TOKEN}"`),
        'TESTKEY123456789'
      );
      expect(mockedAxios.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'post',
        url: `${process.env.PM_KISAN_BASE_URL}/chatbototp`,
        data: {
          EncryptedRequest: 'encrypted_data@TESTKEY123456789'
        }
      }));
      expect(result.status).toBe('OK');
      expect(result.d.output.Message).toBe('OTP sent successfully');
    });

    it('should handle API error response', async () => {
      const mobileNumber = '1234567890';
      
      mockedAxios.request.mockRejectedValueOnce(new Error('API Error'));

      const result = await service.sendOTP(mobileNumber);

      expect(result.d.output.status).toBe('False');
      expect(result.d.output.Message).toBe('Try again');
    });
  });

  describe('getUserData', () => {
    it('should successfully get user data', async () => {
      const mobileNumber = '1234567890';
      
      const mockUserData = {
        Rsponce: "True",
        UserDetails: {
          name: "John Doe",
          mobile: "1234567890",
          address: "Test Address"
        }
      };

      const mockResponse = {
        status: 200,
        data: {
          d: {
            output: JSON.stringify(mockUserData)
          }
        }
      };
      
      mockedAxios.request.mockResolvedValueOnce(mockResponse);
      (utils.decryptRequest as jest.Mock).mockResolvedValue(JSON.stringify(mockUserData));

      const result = await service.getUserData(mobileNumber);

      expect(utils.getUniqueKey).toHaveBeenCalled();
      expect(utils.encrypt).toHaveBeenCalledWith(
        expect.stringContaining(`"Token":"${process.env.PM_KISSAN_TOKEN}"`),
        'TESTKEY123456789'
      );
      expect(mockedAxios.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'post',
        url: `${process.env.PM_KISAN_BASE_URL}/ChatbotUserDetails`,
        data: {
          EncryptedRequest: 'encrypted_data@TESTKEY123456789'
        }
      }));
      expect(result.status).toBe('OK');
      expect(result.d.output.UserDetails).toEqual(mockUserData.UserDetails);
    });
  });

  describe('Message Reactions', () => {
    it('should like a message', async () => {
      const mockMessage = { id: '123', reaction: 1 };

      mockPrismaService.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([mockMessage]);

      const result = await service.likeQuery('123');

      expect(monitoringService.incrementPositveFeedbackCount).toHaveBeenCalled();
      expect(result[0]).toEqual(mockMessage);
    });

    it('should dislike a message', async () => {
      const mockMessage = { id: '123', reaction: -1 };

      mockPrismaService.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([mockMessage]);

      const result = await service.dislikeQuery('123');

      expect(monitoringService.incrementNegativeFeedbackCount).toHaveBeenCalled();
      expect(result[0]).toEqual(mockMessage);
    });

    it('should remove reaction from a message', async () => {
      const mockMessage = { id: '123', reaction: 0 };

      mockPrismaService.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([mockMessage]);

      const result = await service.removeReactionOnQuery('123');

      expect(result[0]).toEqual(mockMessage);
    });

    it('should handle database error when removing reaction', async () => {
      mockPrismaService.$queryRawUnsafe.mockRejectedValueOnce(new Error('Database error'));

      const result = await service.removeReactionOnQuery('123');

      expect(result).toBeNull();
    });
  });
});