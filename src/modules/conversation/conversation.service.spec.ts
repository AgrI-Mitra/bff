import { Test, TestingModule } from '@nestjs/testing';
import { ConversationService } from './conversation.service';
import { PrismaService } from '../../global-services/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('ConversationService', () => {
  let service: ConversationService;
  let prismaService: PrismaService;
  let configService: ConfigService;

  const mockPrismaService = {
    conversation: {
      upsert: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    feedback: {
      upsert: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        'DATABASE_URL': process.env.DATABASE_URL
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ConversationService>(ConversationService);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('saveConversation', () => {
    it('should save a conversation successfully', async () => {
      const mockConversation = {
        id: 'test-session-id',
        userId: 'test-user-id',
        context: {
          currentState: 'WELCOME',
          language: 'hi',
          previousState: null,
          data: {}
        },
        state: 'onGoing',
        flowId: 'pm-kisan-flow'
      };

      mockPrismaService.conversation.upsert.mockResolvedValue(mockConversation);

      const result = await service.saveConversation(
        'test-session-id',
        'test-user-id',
        {
          currentState: 'WELCOME',
          language: 'hi',
          previousState: null,
          data: {}
        },
        'onGoing',
        'pm-kisan-flow'
      );

      expect(result).toEqual(mockConversation);
      expect(mockPrismaService.conversation.upsert).toHaveBeenCalledWith({
        where: { id: 'test-session-id' },
        create: {
          id: 'test-session-id',
          userId: 'test-user-id',
          context: {
            currentState: 'WELCOME',
            language: 'hi',
            previousState: null,
            data: {}
          },
          state: 'onGoing',
          flowId: 'pm-kisan-flow'
        },
        update: {
          state: 'onGoing',
          context: {
            currentState: 'WELCOME',
            language: 'hi',
            previousState: null,
            data: {}
          }
        },
      });
    });
  });

  describe('getConversationState', () => {
    it('should create new conversation if none exists', async () => {
      const defaultContext = {
        currentState: 'WELCOME',
        language: 'hi',
        previousState: null,
        data: {}
      };

      const mockConversation = {
        id: 'test-session-id',
        userId: 'test-user-id',
        context: defaultContext,
        state: 'onGoing',
        flowId: 'pm-kisan-flow'
      };

      mockPrismaService.conversation.findFirst.mockResolvedValue(null);
      mockPrismaService.conversation.create.mockResolvedValue(mockConversation);

      const result = await service.getConversationState(
        'test-session-id',
        'test-user-id',
        defaultContext,
        'pm-kisan-flow'
      );

      expect(result).toEqual({ ...defaultContext, id: 'test-session-id' });
      expect(mockPrismaService.conversation.create).toHaveBeenCalledWith({
        data: {
          id: 'test-session-id',
          userId: 'test-user-id',
          context: defaultContext,
          flowId: 'pm-kisan-flow',
          state: 'onGoing'
        },
      });
    });

    it('should reset conversation if state is Done', async () => {
      const defaultContext = {
        currentState: 'WELCOME',
        language: 'hi',
        previousState: null,
        data: {}
      };

      const mockDoneConversation = {
        id: 'test-session-id',
        userId: 'test-user-id',
        context: {
          currentState: 'DONE',
          language: 'hi',
          data: { someOldData: true }
        },
        state: 'Done',
        flowId: 'pm-kisan-flow'
      };

      const mockUpdatedConversation = {
        id: 'test-session-id',
        userId: 'test-user-id',
        context: defaultContext,
        state: 'onGoing',
        flowId: 'pm-kisan-flow'
      };

      mockPrismaService.conversation.findFirst
        .mockResolvedValueOnce(mockDoneConversation)
        .mockResolvedValueOnce(mockUpdatedConversation);
      mockPrismaService.conversation.update.mockResolvedValue(mockUpdatedConversation);

      const result = await service.getConversationState(
        'test-session-id',
        'test-user-id',
        defaultContext,
        'pm-kisan-flow'
      );

      expect(result).toEqual({ ...defaultContext, id: 'test-session-id' });
    });
  });

  describe('getConversationById', () => {
    it('should return conversation when found', async () => {
      const mockConversation = {
        id: 'test-session-id',
        userId: 'test-user-id',
        context: {
          currentState: 'WELCOME',
          language: 'hi',
          previousState: null,
          data: {}
        },
        state: 'onGoing',
        flowId: 'pm-kisan-flow'
      };

      mockPrismaService.conversation.findFirst.mockResolvedValue(mockConversation);

      const result = await service.getConversationById('test-session-id');

      expect(result).toEqual(mockConversation);
    });

    it('should return null when conversation not found', async () => {
      mockPrismaService.conversation.findFirst.mockResolvedValue(null);

      const result = await service.getConversationById('test-session-id');

      expect(result).toBeNull();
    });
  });

  describe('createOrUpdateFeedback', () => {
    it('should create or update feedback successfully', async () => {
      const mockFeedback = {
        conversationId: 'test-session-id',
        translation: 4,
        information: 5,
        chatbotFunctionality: 3,
        feedback: 'Great service for PM Kisan!'
      };

      mockPrismaService.feedback.upsert.mockResolvedValue(mockFeedback);

      const result = await service.createOrUpdateFeedback(mockFeedback);

      expect(result).toEqual(mockFeedback);
      expect(mockPrismaService.feedback.upsert).toHaveBeenCalledWith({
        where: { conversationId: 'test-session-id' },
        create: mockFeedback,
        update: {
          translation: 4,
          information: 5,
          chatbotFunctionality: 3,
          feedback: 'Great service for PM Kisan!'
        },
      });
    });
  });
}); 