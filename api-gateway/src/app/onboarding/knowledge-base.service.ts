/**
 * Knowledge Base Management Service for Onboarding
 * Handles FAQ article management, rich text editing, AI-powered suggestions, and search optimization
 */

import { Injectable } from '@nestjs/common';
import { KnowledgeService } from '../knowledge/knowledge.service';

export interface KnowledgeBaseArticle {
  id: string;
  tenantId: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  isPublished: boolean;
  aiEmbedding?: any;
  searchScore?: number;
  viewCount: number;
  helpfulCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateArticleRequest {
  title: string;
  content: string;
  category: string;
  tags?: string[];
  isPublished?: boolean;
}

export interface UpdateArticleRequest {
  title?: string;
  content?: string;
  category?: string;
  tags?: string[];
  isPublished?: boolean;
}

export interface ArticleSearchRequest {
  query: string;
  category?: string;
  tags?: string[];
  limit?: number;
  includeUnpublished?: boolean;
}

export interface ArticleSearchResult {
  articles: KnowledgeBaseArticle[];
  totalCount: number;
  searchTime: number;
  suggestions: string[];
}

export interface CategoryStats {
  category: string;
  articleCount: number;
  publishedCount: number;
  totalViews: number;
  averageHelpfulness: number;
}

export interface KnowledgeBaseStats {
  totalArticles: number;
  publishedArticles: number;
  totalViews: number;
  totalHelpfulVotes: number;
  categoriesStats: CategoryStats[];
  popularTags: { tag: string; count: number }[];
  recentActivity: {
    articlesCreated: number;
    articlesUpdated: number;
    viewsThisWeek: number;
  };
}

export interface AIArticleSuggestion {
  title: string;
  content: string;
  category: string;
  tags: string[];
  confidence: number;
  reasoning: string;
}

@Injectable()
export class KnowledgeBaseService {
  constructor(private readonly knowledge: KnowledgeService) {}

  /**
   * Create a new knowledge base article
   */
  async createArticle(tenantId: string, userId: string, request: CreateArticleRequest) {
    return this.knowledge.createArticle(tenantId, userId, {
      title: request.title,
      content: request.content,
      tags: request.tags,
      category: request.category,
      publish: request.isPublished,
    });
  }

  /**
   * Update an existing article
   */
  async updateArticle(tenantId: string, userId: string, articleId: string, request: UpdateArticleRequest) {
    return this.knowledge.updateArticle(tenantId, userId, articleId, request);
  }

  /**
   * Delete an article
   */
  async deleteArticle(tenantId: string, articleId: string) {
    return this.knowledge.deleteArticle(tenantId, articleId);
  }

  /**
   * Get article by ID
   */
  async getArticle(tenantId: string, articleId: string) {
    return this.knowledge.getArticle(tenantId, articleId);
  }

  /**
   * Get all articles for a tenant
   */
  async getArticles(tenantId: string, options?: any) {
    const { items, total } = await this.knowledge.listArticles(tenantId, undefined, 1, 50);
    return { articles: items as any, totalCount: total };
  }

  /**
   * Search articles using AI-powered semantic search
   */
  async searchArticles(tenantId: string, request: ArticleSearchRequest) {
    const res = await this.knowledge.search(tenantId, request.query, request.limit, { semantic: true });
    return { articles: res.articles as any, totalCount: res.articles.length, searchTime: 0, suggestions: [] };
  }

  /**
   * Get knowledge base statistics
   */
  async getKnowledgeBaseStats(tenantId: string) {
    return this.knowledge.analyticsOverview(tenantId);
  }

  /**
   * Get AI-powered article suggestions based on existing tickets/conversations
   */
  async getAIArticleSuggestions(tenantId: string, limit = 5) {
    return this.knowledge.suggest(tenantId, '').then((s: any) => (s.articles || []).slice(0, limit));
  }

  /**
   * Mark article as helpful
   */
  async markArticleHelpful(tenantId: string, articleId: string) {
    return this.knowledge.publicRecordFeedback(tenantId, articleId, true);
  }

  /**
   * Get available categories
   */
  async getCategories(tenantId: string) {
    const { items } = await this.knowledge.listArticles(tenantId, undefined, 1, 500);
    return Array.from(new Set((items as any[]).map(i => i.category))).sort();
  }

  /**
   * Get popular tags
   */
  async getPopularTags(tenantId: string, limit = 20) {
    const { items } = await this.knowledge.listArticles(tenantId, undefined, 1, 1000);
    const counts = new Map<string, number>();
    (items as any[]).forEach(a => (a.tags || []).forEach((t: string) => counts.set(t, (counts.get(t) || 0) + 1)));
    return Array.from(counts.entries()).map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count).slice(0, limit);
  }

  // Private helper methods

  // All embedding/search helpers now handled by KnowledgeService

  // Suggestions handled by KnowledgeService

  // Mapping now deferred to KnowledgeService results
}