import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import type {
  SearchTicketsRequest,
  SearchTicketsResponse,
  Ticket,
  SearchConfig
} from '@glavito/shared-types';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private searchConfig: SearchConfig = {
    enableSemanticSearch: true,
    enableFullTextSearch: true,
    indexingBatchSize: 100,
    searchTimeout: 5000,
    maxResults: 50,
    highlightEnabled: true,
    suggestionEnabled: true
  };

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Perform AI-powered semantic search on tickets
   */
  async searchTickets(request: SearchTicketsRequest): Promise<SearchTicketsResponse> {
    const startTime = Date.now();
    
    try {
      let tickets: any[] = [];
      
      if (request.useSemanticSearch && this.searchConfig.enableSemanticSearch) {
        tickets = await this.performSemanticSearch(request);
      } else {
        tickets = await this.performFullTextSearch(request);
      }

      // Apply additional filters
      const filteredTickets = await this.applyFilters(tickets, request.filters);
      
      // Apply pagination
      const paginatedTickets = this.applyPagination(
        filteredTickets,
        request.limit || 20,
        request.offset || 0
      );

      // Generate search results with relevance scores
      const searchResults = await this.generateSearchResults(paginatedTickets, request.query);
      
      // Generate search suggestions
      const suggestions = this.searchConfig.suggestionEnabled 
        ? await this.generateSearchSuggestions(request.query, searchResults.length)
        : [];

      const searchTime = Date.now() - startTime;

      return {
        tickets: searchResults,
        total: filteredTickets.length,
        searchTime,
        suggestions
      };
    } catch (error) {
      this.logger.error('Search failed:', error);
      throw error;
    }
  }

  /**
   * Perform semantic search using AI embeddings
   */
  private async performSemanticSearch(request: SearchTicketsRequest): Promise<any[]> {
    // Mock semantic search - replace with actual vector search
    // In a real implementation, you would:
    // 1. Generate embeddings for the search query
    // 2. Perform vector similarity search against stored ticket embeddings
    // 3. Return results ranked by semantic similarity
    
    this.logger.log(`Performing semantic search for: "${request.query}"`);
    
    // For now, fall back to full-text search with enhanced scoring
    return this.performFullTextSearch(request);
  }

  /**
   * Perform full-text search on tickets
   */
  private async performFullTextSearch(request: SearchTicketsRequest): Promise<any[]> {
    const searchTerms = request.query.toLowerCase().split(' ').filter(term => term.length > 2);
    
    if (searchTerms.length === 0) {
      return this.getAllTickets();
    }

    // Build search conditions
    const searchConditions = searchTerms.map((term: string) => ({
      OR: [
        { title: { contains: term, mode: 'insensitive' as const } },
        { description: { contains: term, mode: 'insensitive' as const } },
        { tags: { hasSome: [term] } },
        { customer: { name: { contains: term, mode: 'insensitive' as const } } },
        { customer: { email: { contains: term, mode: 'insensitive' as const } } }
      ]
    }));

    const tickets = await this.databaseService.ticket.findMany({
      where: {
        AND: searchConditions
      },
      include: {
        customer: true,
        channel: true,
        assignedAgent: true,
        aiAnalysis: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      take: this.searchConfig.maxResults * 2 // Get more for better filtering
    });

    return tickets;
  }

  /**
   * Get all tickets when no search query is provided
   */
  private async getAllTickets(): Promise<any[]> {
    return this.databaseService.ticket.findMany({
      include: {
        customer: true,
        channel: true,
        assignedAgent: true,
        aiAnalysis: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      take: this.searchConfig.maxResults,
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Apply filters to search results
   */
  private async applyFilters(tickets: any[], filters?: SearchTicketsRequest['filters']): Promise<any[]> {
    if (!filters) return tickets;

    return tickets.filter(ticket => {
      // Status filter
      if (filters.status?.length && !filters.status.includes(ticket.status)) {
        return false;
      }

      // Priority filter
      if (filters.priority?.length && !filters.priority.includes(ticket.priority)) {
        return false;
      }

      // Assigned agent filter
      if (filters.assignedAgentId && ticket.assignedAgentId !== filters.assignedAgentId) {
        return false;
      }

      // Customer filter
      if (filters.customerId && ticket.customerId !== filters.customerId) {
        return false;
      }

      // Date range filter
      if (filters.dateRange) {
        const ticketDate = new Date(ticket.createdAt);
        if (ticketDate < filters.dateRange.start || ticketDate > filters.dateRange.end) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Apply pagination to results
   */
  private applyPagination(tickets: any[], limit: number, offset: number): any[] {
    return tickets.slice(offset, offset + limit);
  }

  /**
   * Generate search results with relevance scores and highlights
   */
  private async generateSearchResults(tickets: any[], query: string): Promise<SearchTicketsResponse['tickets']> {
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
    
    return tickets.map(ticket => {
      const relevanceScore = this.calculateRelevanceScore(ticket, searchTerms);
      const matchedFields = this.getMatchedFields(ticket, searchTerms);
      const highlights = this.searchConfig.highlightEnabled 
        ? this.generateHighlights(ticket, searchTerms)
        : {};

      return {
        ticket: ticket as Ticket,
        relevanceScore,
        matchedFields,
        highlights
      };
    }).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Calculate relevance score for a ticket
   */
  private calculateRelevanceScore(ticket: any, searchTerms: string[]): number {
    let score = 0;
    const text = `${ticket.title || ''} ${ticket.description || ''} ${ticket.tags?.join(' ') || ''} ${ticket.customer?.name || ''} ${ticket.customer?.email || ''}`.toLowerCase();
    
    searchTerms.forEach((term: string) => {
      const termCount = (text.match(new RegExp(term, 'g')) || []).length;
      score += termCount * 0.1;
      
      // Boost score for exact matches in title
      if (ticket.title?.toLowerCase().includes(term)) {
        score += 0.3;
      }
      
      // Boost score for matches in tags
      if (ticket.tags?.some((tag: string) => tag.toLowerCase().includes(term))) {
        score += 0.2;
      }
    });

    // Boost recent tickets slightly
    const daysSinceCreation = (Date.now() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    score += Math.max(0, (30 - daysSinceCreation) / 100);

    // Boost tickets with AI analysis
    if (ticket.aiAnalysis?.length > 0) {
      score += 0.1;
    }

    return Math.min(1, Math.max(0, score));
  }

  /**
   * Get fields that matched the search terms
   */
  private getMatchedFields(ticket: any, searchTerms: string[]): string[] {
    const matchedFields: string[] = [];
    
    searchTerms.forEach((term: string) => {
      if (ticket.title?.toLowerCase().includes(term)) {
        matchedFields.push('title');
      }
      if (ticket.description?.toLowerCase().includes(term)) {
        matchedFields.push('description');
      }
      if (ticket.tags?.some((tag: string) => tag.toLowerCase().includes(term))) {
        matchedFields.push('tags');
      }
      if (ticket.customer?.name?.toLowerCase().includes(term)) {
        matchedFields.push('customer.name');
      }
      if (ticket.customer?.email?.toLowerCase().includes(term)) {
        matchedFields.push('customer.email');
      }
    });

    return [...new Set(matchedFields)];
  }

  /**
   * Generate highlights for matched text
   */
  private generateHighlights(ticket: any, searchTerms: string[]): Record<string, string[]> {
    const highlights: Record<string, string[]> = {};
    
    // Highlight in description
    if (ticket.description) {
      const descHighlights = this.highlightText(ticket.description, searchTerms);
      if (descHighlights.length > 0) {
        highlights.description = descHighlights;
      }
    }

    // Highlight in title
    if (ticket.title) {
      const titleHighlights = this.highlightText(ticket.title, searchTerms);
      if (titleHighlights.length > 0) {
        highlights.title = titleHighlights;
      }
    }

    return highlights;
  }

  /**
   * Highlight search terms in text
   */
  private highlightText(text: string, searchTerms: string[]): string[] {
    const highlights: string[] = [];
    const maxHighlights = 3;
    const contextLength = 100;
    
    searchTerms.forEach((term: string) => {
      const regex = new RegExp(`(.{0,${contextLength/2}})${term}(.{0,${contextLength/2}})`, 'gi');
      const matches = text.match(regex);
      
      if (matches && highlights.length < maxHighlights) {
        matches.slice(0, maxHighlights - highlights.length).forEach(match => {
          const highlighted = match.replace(new RegExp(term, 'gi'), `<mark>$&</mark>`);
          highlights.push(highlighted);
        });
      }
    });

    return highlights;
  }

  /**
   * Generate search suggestions
   */
  private async generateSearchSuggestions(query: string, resultCount: number): Promise<string[]> {
    const suggestions: string[] = [];
    
    // If no results, suggest broader terms
    if (resultCount === 0) {
      suggestions.push('Try using broader search terms');
      suggestions.push('Check your spelling');
      suggestions.push('Use fewer keywords');
    }
    
    // If few results, suggest filters
    if (resultCount < 5) {
      suggestions.push('Try filtering by status or priority');
      suggestions.push('Search within a specific date range');
    }

    // Common search suggestions based on query
    if (query.toLowerCase().includes('billing')) {
      suggestions.push('Try "payment issue" or "invoice problem"');
    }
    
    if (query.toLowerCase().includes('login')) {
      suggestions.push('Try "authentication" or "access problem"');
    }

    return suggestions.slice(0, 3);
  }

  /**
   * Index a ticket for search
   */
  async indexTicket(ticketId: string): Promise<void> {
    try {
      const ticket = await this.databaseService.ticket.findUnique({
        where: { id: ticketId },
        include: {
          customer: true,
          channel: true
        }
      });

      if (!ticket) {
        this.logger.warn(`Ticket ${ticketId} not found for indexing`);
        return;
      }

      // Create searchable text
      const searchableText = [
        ticket.title,
        ticket.description,
        ticket.tags?.join(' '),
        ticket.customer?.name,
        ticket.customer?.email,
        ticket.channel?.name
      ].filter(Boolean).join(' ');

      // Extract keywords
      const keywords = this.extractKeywords(searchableText);

      // Store or update search index
      await this.databaseService.ticketSearch.upsert({
        where: { ticketId },
        create: {
          ticketId,
          searchableText,
          keywords,
          lastIndexedAt: new Date(),
          indexVersion: '1.0',
          metadata: {
            status: ticket.status,
            priority: ticket.priority,
            customerId: ticket.customerId
          }
        },
        update: {
          searchableText,
          keywords,
          lastIndexedAt: new Date(),
          metadata: {
            status: ticket.status,
            priority: ticket.priority,
            customerId: ticket.customerId
          }
        }
      });

      this.logger.log(`Ticket ${ticketId} indexed successfully`);
    } catch (error) {
      this.logger.error(`Failed to index ticket ${ticketId}:`, error);
    }
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - replace with more sophisticated NLP
    const words = text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
    
    // Remove common stop words
    const stopWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'she', 'use', 'way', 'will', 'with']);
    
    const keywords = words.filter(word => !stopWords.has(word));
    
    // Return unique keywords
    return [...new Set(keywords)];
  }

  /**
   * Update search configuration
   */
  updateSearchConfig(config: Partial<SearchConfig>): void {
    this.searchConfig = { ...this.searchConfig, ...config };
    this.logger.log('Search configuration updated', this.searchConfig);
  }

  /**
   * Get current search configuration
   */
  getSearchConfig(): SearchConfig {
    return { ...this.searchConfig };
  }
}