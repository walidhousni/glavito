import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { PrismaService } from '@glavito/shared-database';

describe('SearchService', () => {
  let service: SearchService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    ticket: {
      findMany: jest.fn(),
    },
    customer: {
      findMany: jest.fn(),
    },
    knowledgeBase: {
      findMany: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    team: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('federated search', () => {
    it('should return empty results for short queries', async () => {
      const result = await service.federated('tenant-1', 'a', 10);
      
      expect(result.results).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(result.suggestions).toEqual([]);
    });

    it('should throw error for missing tenant ID', async () => {
      await expect(service.federated('', 'test query', 10)).rejects.toThrow(
        'Tenant ID is required'
      );
    });

    it('should search across all entity types', async () => {
      // Mock responses
      mockPrismaService.ticket.findMany.mockResolvedValue([
        {
          id: 'ticket-1',
          subject: 'Test ticket',
          description: 'Test description',
          status: 'open',
          priority: 'high',
          tags: [],
          createdAt: new Date(),
          customer: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
          assignedAgent: null,
        },
      ]);

      mockPrismaService.customer.findMany.mockResolvedValue([]);
      mockPrismaService.knowledgeBase.findMany.mockResolvedValue([]);
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.team.findMany.mockResolvedValue([]);

      const result = await service.federated('tenant-1', 'test', 10);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe('ticket');
      expect(result.results[0].title).toBe('Test ticket');
      expect(result.totalCount).toBe(1);
    });
  });

  describe('relevance scoring', () => {
    it('should calculate relevance scores correctly', () => {
      const service = new SearchService(prismaService);
      
      // Access private method for testing
      const calculateRelevanceScore = (service as any).calculateRelevanceScore;
      
      // Exact match should get highest score
      expect(calculateRelevanceScore('test', ['test'])).toBe(100);
      
      // Starts with should get high score
      expect(calculateRelevanceScore('test', ['testing'])).toBe(80);
      
      // Contains should get medium score
      expect(calculateRelevanceScore('test', ['this is a test'])).toBe(60);
      
      // No match should get zero score
      expect(calculateRelevanceScore('test', ['nothing'])).toBe(0);
    });
  });
});