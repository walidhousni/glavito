/**
 * Unit tests for KnowledgeBaseService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { DatabaseService } from '@glavito/shared-database';
import { KnowledgeBaseService, CreateArticleRequest, UpdateArticleRequest, ArticleSearchRequest } from '../knowledge-base.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('KnowledgeBaseService', () => {
  let service: KnowledgeBaseService;
  let databaseService: jest.Mocked<DatabaseService>;
  let configService: jest.Mocked<ConfigService>;
  let httpService: jest.Mocked<HttpService>;

  const mockTenantId = 'tenant-123';
  const mockArticleId = 'article-123';

  beforeEach(async () => {
    const mockDatabaseService = {
      knowledgeBase: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const mockHttpService = {
      get: jest.fn(),
      post: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeBaseService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<KnowledgeBaseService>(KnowledgeBaseService);
    databaseService = module.get(DatabaseService);
    configService = module.get(ConfigService);
    httpService = module.get(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createArticle', () => {
    const mockCreateRequest: CreateArticleRequest = {
      title: 'Test Article',
      content: 'This is a test article content.',
      category: 'Testing',
      tags: ['test', 'example'],
      isPublished: true,
    };

    it('should successfully create an article', async () => {
      const mockCreatedArticle = {
        id: mockArticleId,
        tenantId: mockTenantId,
        title: mockCreateRequest.title,
        content: mockCreateRequest.content,
        category: mockCreateRequest.category,
        tags: mockCreateRequest.tags,
        isPublished: mockCreateRequest.isPublished,
        aiEmbedding: { model: 'test', embedding: [0.1, 0.2, 0.3] },
        viewCount: 0,
        helpfulCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      databaseService.knowledgeBase.create.mockResolvedValue(mockCreatedArticle as any);

      const result = await service.createArticle(mockTenantId, mockCreateRequest);

      expect(result).toEqual(expect.objectContaining({
        id: mockArticleId,
        tenantId: mockTenantId,
        title: mockCreateRequest.title,
        content: mockCreateRequest.content,
        category: mockCreateRequest.category,
        tags: mockCreateRequest.tags,
        isPublished: mockCreateRequest.isPublished,
      }));

      expect(databaseService.knowledgeBase.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: mockTenantId,
          title: mockCreateRequest.title,
          content: mockCreateRequest.content,
          category: mockCreateRequest.category,
          tags: mockCreateRequest.tags,
          isPublished: mockCreateRequest.isPublished,
          aiEmbedding: expect.any(Object),
          viewCount: 0,
          helpfulCount: 0,
        }),
      });
    });

    it('should handle creation errors', async () => {
      databaseService.knowledgeBase.create.mockRejectedValue(new Error('Database error'));

      await expect(
        service.createArticle(mockTenantId, mockCreateRequest)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateArticle', () => {
    const mockUpdateRequest: UpdateArticleRequest = {
      title: 'Updated Article Title',
      content: 'Updated content',
      tags: ['updated', 'test'],
    };

    it('should successfully update an article', async () => {
      const mockExistingArticle = {
        id: mockArticleId,
        tenantId: mockTenantId,
        title: 'Original Title',
        content: 'Original content',
        category: 'Testing',
        tags: ['original'],
        isPublished: true,
        aiEmbedding: { model: 'test', embedding: [0.1, 0.2] },
        viewCount: 5,
        helpfulCount: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUpdatedArticle = {
        ...mockExistingArticle,
        ...mockUpdateRequest,
        aiEmbedding: { model: 'test', embedding: [0.3, 0.4] },
      };

      databaseService.knowledgeBase.findFirst.mockResolvedValue(mockExistingArticle as any);
      databaseService.knowledgeBase.update.mockResolvedValue(mockUpdatedArticle as any);

      const result = await service.updateArticle(mockTenantId, mockArticleId, mockUpdateRequest);

      expect(result.title).toBe(mockUpdateRequest.title);
      expect(result.content).toBe(mockUpdateRequest.content);
      expect(result.tags).toEqual(mockUpdateRequest.tags);

      expect(databaseService.knowledgeBase.update).toHaveBeenCalledWith({
        where: { id: mockArticleId },
        data: expect.objectContaining({
          ...mockUpdateRequest,
          aiEmbedding: expect.any(Object),
        }),
      });
    });

    it('should throw NotFoundException when article does not exist', async () => {
      databaseService.knowledgeBase.findFirst.mockResolvedValue(null);

      await expect(
        service.updateArticle(mockTenantId, mockArticleId, mockUpdateRequest)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteArticle', () => {
    it('should successfully delete an article', async () => {
      const mockArticle = {
        id: mockArticleId,
        tenantId: mockTenantId,
        title: 'Test Article',
      };

      databaseService.knowledgeBase.findFirst.mockResolvedValue(mockArticle as any);
      databaseService.knowledgeBase.delete.mockResolvedValue(mockArticle as any);

      await service.deleteArticle(mockTenantId, mockArticleId);

      expect(databaseService.knowledgeBase.delete).toHaveBeenCalledWith({
        where: { id: mockArticleId },
      });
    });

    it('should throw NotFoundException when article does not exist', async () => {
      databaseService.knowledgeBase.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteArticle(mockTenantId, mockArticleId)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getArticle', () => {
    it('should successfully get an article and increment view count', async () => {
      const mockArticle = {
        id: mockArticleId,
        tenantId: mockTenantId,
        title: 'Test Article',
        content: 'Test content',
        category: 'Testing',
        tags: ['test'],
        isPublished: true,
        viewCount: 5,
        helpfulCount: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      databaseService.knowledgeBase.findFirst.mockResolvedValue(mockArticle as any);
      databaseService.knowledgeBase.update.mockResolvedValue({
        ...mockArticle,
        viewCount: 6,
      } as any);

      const result = await service.getArticle(mockTenantId, mockArticleId);

      expect(result.viewCount).toBe(6);
      expect(databaseService.knowledgeBase.update).toHaveBeenCalledWith({
        where: { id: mockArticleId },
        data: { viewCount: { increment: 1 } },
      });
    });

    it('should throw NotFoundException when article does not exist', async () => {
      databaseService.knowledgeBase.findFirst.mockResolvedValue(null);

      await expect(
        service.getArticle(mockTenantId, mockArticleId)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getArticles', () => {
    it('should successfully get articles with pagination', async () => {
      const mockArticles = [
        {
          id: 'article-1',
          tenantId: mockTenantId,
          title: 'Article 1',
          content: 'Content 1',
          category: 'Category 1',
          tags: ['tag1'],
          isPublished: true,
          viewCount: 10,
          helpfulCount: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'article-2',
          tenantId: mockTenantId,
          title: 'Article 2',
          content: 'Content 2',
          category: 'Category 2',
          tags: ['tag2'],
          isPublished: false,
          viewCount: 3,
          helpfulCount: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      databaseService.knowledgeBase.findMany.mockResolvedValue(mockArticles as any);
      databaseService.knowledgeBase.count.mockResolvedValue(2);

      const result = await service.getArticles(mockTenantId, {
        limit: 10,
        offset: 0,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      });

      expect(result.articles).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      expect(result.articles[0].title).toBe('Article 1');
    });

    it('should filter articles by category', async () => {
      const mockArticles = [
        {
          id: 'article-1',
          tenantId: mockTenantId,
          category: 'Testing',
          title: 'Test Article',
          content: 'Test content',
          tags: [],
          isPublished: true,
          viewCount: 0,
          helpfulCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      databaseService.knowledgeBase.findMany.mockResolvedValue(mockArticles as any);
      databaseService.knowledgeBase.count.mockResolvedValue(1);

      const result = await service.getArticles(mockTenantId, {
        category: 'Testing',
      });

      expect(result.articles).toHaveLength(1);
      expect(result.articles[0].category).toBe('Testing');
    });
  });

  describe('searchArticles', () => {
    const mockSearchRequest: ArticleSearchRequest = {
      query: 'test query',
      limit: 5,
    };

    it('should successfully search articles', async () => {
      const mockArticles = [
        {
          id: 'article-1',
          tenantId: mockTenantId,
          title: 'Test Article',
          content: 'This article contains the test query',
          category: 'Testing',
          tags: ['test'],
          isPublished: true,
          viewCount: 10,
          helpfulCount: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      databaseService.knowledgeBase.findMany.mockResolvedValue(mockArticles as any);

      const result = await service.searchArticles(mockTenantId, mockSearchRequest);

      expect(result.articles).toHaveLength(1);
      expect(result.articles[0].searchScore).toBeGreaterThan(0);
      expect(result.searchTime).toBeGreaterThan(0);
      expect(result.suggestions).toBeInstanceOf(Array);
    });

    it('should return empty results for no matches', async () => {
      databaseService.knowledgeBase.findMany.mockResolvedValue([]);

      const result = await service.searchArticles(mockTenantId, mockSearchRequest);

      expect(result.articles).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });
  });

  describe('getKnowledgeBaseStats', () => {
    it('should successfully calculate knowledge base statistics', async () => {
      const mockArticles = [
        {
          id: 'article-1',
          tenantId: mockTenantId,
          category: 'Category 1',
          tags: ['tag1', 'tag2'],
          isPublished: true,
          viewCount: 10,
          helpfulCount: 5,
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          updatedAt: new Date(),
        },
        {
          id: 'article-2',
          tenantId: mockTenantId,
          category: 'Category 2',
          tags: ['tag2', 'tag3'],
          isPublished: false,
          viewCount: 3,
          helpfulCount: 1,
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
          updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        },
      ];

      databaseService.knowledgeBase.count
        .mockResolvedValueOnce(2) // total articles
        .mockResolvedValueOnce(1); // published articles

      databaseService.knowledgeBase.findMany.mockResolvedValue(mockArticles as any);

      const result = await service.getKnowledgeBaseStats(mockTenantId);

      expect(result.totalArticles).toBe(2);
      expect(result.publishedArticles).toBe(1);
      expect(result.totalViews).toBe(13);
      expect(result.totalHelpfulVotes).toBe(6);
      expect(result.categoriesStats).toHaveLength(2);
      expect(result.popularTags).toEqual(
        expect.arrayContaining([
          { tag: 'tag2', count: 2 },
          { tag: 'tag1', count: 1 },
          { tag: 'tag3', count: 1 },
        ])
      );
      expect(result.recentActivity).toEqual(
        expect.objectContaining({
          articlesCreated: expect.any(Number),
          articlesUpdated: expect.any(Number),
          viewsThisWeek: expect.any(Number),
        })
      );
    });
  });

  describe('getAIArticleSuggestions', () => {
    it('should return AI-powered article suggestions', async () => {
      const result = await service.getAIArticleSuggestions(mockTenantId, 3);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeLessThanOrEqual(3);
      
      if (result.length > 0) {
        expect(result[0]).toEqual(
          expect.objectContaining({
            title: expect.any(String),
            content: expect.any(String),
            category: expect.any(String),
            tags: expect.any(Array),
            confidence: expect.any(Number),
            reasoning: expect.any(String),
          })
        );
      }
    });
  });

  describe('markArticleHelpful', () => {
    it('should successfully mark article as helpful', async () => {
      const mockArticle = {
        id: mockArticleId,
        tenantId: mockTenantId,
        helpfulCount: 5,
      };

      databaseService.knowledgeBase.findFirst.mockResolvedValue(mockArticle as any);
      databaseService.knowledgeBase.update.mockResolvedValue({
        ...mockArticle,
        helpfulCount: 6,
      } as any);

      await service.markArticleHelpful(mockTenantId, mockArticleId);

      expect(databaseService.knowledgeBase.update).toHaveBeenCalledWith({
        where: { id: mockArticleId },
        data: { helpfulCount: { increment: 1 } },
      });
    });

    it('should throw NotFoundException when article does not exist', async () => {
      databaseService.knowledgeBase.findFirst.mockResolvedValue(null);

      await expect(
        service.markArticleHelpful(mockTenantId, mockArticleId)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCategories', () => {
    it('should return unique categories', async () => {
      const mockArticles = [
        { category: 'Category 1' },
        { category: 'Category 2' },
        { category: 'Category 1' }, // duplicate
      ];

      databaseService.knowledgeBase.findMany.mockResolvedValue(mockArticles as any);

      const result = await service.getCategories(mockTenantId);

      expect(result).toEqual(['Category 1', 'Category 2']);
    });
  });

  describe('getPopularTags', () => {
    it('should return popular tags sorted by count', async () => {
      const mockArticles = [
        { tags: ['tag1', 'tag2'] },
        { tags: ['tag2', 'tag3'] },
        { tags: ['tag1'] },
      ];

      databaseService.knowledgeBase.findMany.mockResolvedValue(mockArticles as any);

      const result = await service.getPopularTags(mockTenantId, 10);

      expect(result).toEqual([
        { tag: 'tag1', count: 2 },
        { tag: 'tag2', count: 2 },
        { tag: 'tag3', count: 1 },
      ]);
    });
  });
});