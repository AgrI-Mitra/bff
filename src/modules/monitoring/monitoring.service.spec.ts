import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringService } from './monitoring.service';
import { PrismaService } from '../../global-services/prisma.service';
import { CacheProvider } from '../cache/cache.provider';
import { register } from 'prom-client';

describe('MonitoringService', () => {
  let service: MonitoringService;
  let prismaService: PrismaService;
  let cacheProvider: CacheProvider;

  const mockPrismaService = {
    metrics: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockCacheProvider = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    increment: jest.fn(),
  };

  beforeEach(async () => {
    // Clear all registered metrics before each test
    register.clear();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonitoringService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CacheProvider,
          useValue: mockCacheProvider,
        },
      ],
    }).compile();

    service = module.get<MonitoringService>(MonitoringService);
    prismaService = module.get<PrismaService>(PrismaService);
    cacheProvider = module.get<CacheProvider>(CacheProvider);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Clear registry after each test
    register.clear();
  });

  describe('Counter Operations', () => {
    it('should increment bhashini count', async () => {
      await service.incrementBhashiniCount();
      expect(mockCacheProvider.increment).toHaveBeenCalledWith('bhashiniCount');
    });

    it('should increment bhashini success count', async () => {
      await service.incrementBhashiniSuccessCount();
      expect(mockCacheProvider.increment).toHaveBeenCalledWith('bhashiniSuccessCount');
    });

    it('should increment unable to get user details count', async () => {
      await service.incrementUnableToGetUserDetailsCount();
      expect(mockCacheProvider.increment).toHaveBeenCalledWith('unableToGetUserDetailsCount');
    });
  });

  describe('Feedback Operations', () => {
    it('should increment positive feedback count', async () => {
      await service.incrementPositveFeedbackCount();
      expect(mockCacheProvider.increment).toHaveBeenCalledWith('positveFeedbackCount');
    });

    it('should increment negative feedback count', async () => {
      await service.incrementNegativeFeedbackCount();
      expect(mockCacheProvider.increment).toHaveBeenCalledWith('negativeFeedbackCount');
    });
  });

  describe('Language Metrics', () => {
    it('should increment Hindi sessions count', async () => {
      await service.incrementTotalSessionsInHindiCount();
      expect(mockCacheProvider.increment).toHaveBeenCalledWith('totalSessionsInHindi');
    });

    it('should increment English sessions count', async () => {
      await service.incrementTotalSessionsInEnglishCount();
      expect(mockCacheProvider.increment).toHaveBeenCalledWith('totalSessionsInEnglish');
    });
  });

  describe('Error Metrics', () => {
    it('should increment internal server error count', async () => {
      await service.incrementInternalServerErrorCount();
      expect(mockCacheProvider.increment).toHaveBeenCalledWith('internalServerErrorCount');
    });

    it('should increment gateway timeout count', async () => {
      await service.incrementGatewayTimeoutCount();
      expect(mockCacheProvider.increment).toHaveBeenCalledWith('gatewayTimeoutCount');
    });
  });

  describe('setMetrics', () => {
    it('should update existing metrics', async () => {
      const metricsToUpsert = [{ name: 'bhashiniCount', value: '10' }];
      
      mockPrismaService.metrics.findUnique.mockResolvedValue({
        id: 1,
        name: 'bhashiniCount',
        value: '5'
      });

      await service.setMetrics(metricsToUpsert);

      expect(mockPrismaService.metrics.update).toHaveBeenCalled();
    });

    it('should create new metrics', async () => {
      const metricsToUpsert = [{ name: 'newMetric', value: '1' }];
      
      mockPrismaService.metrics.findUnique.mockResolvedValue(null);

      await service.setMetrics(metricsToUpsert);

      expect(mockPrismaService.metrics.create).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const metricsToUpsert = [{ name: 'testMetric', value: '10' }];
      
      mockPrismaService.metrics.findUnique.mockRejectedValue(new Error('Database error'));
      const consoleSpy = jest.spyOn(console, 'log');

      await service.setMetrics(metricsToUpsert);

      expect(consoleSpy).toHaveBeenCalled();
    });
  });
}); 