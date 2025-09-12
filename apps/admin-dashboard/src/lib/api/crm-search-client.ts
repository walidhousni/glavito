import { api } from './config';

export interface SearchFilters {
  // Entity filters
  entities?: ('lead' | 'deal' | 'customer' | 'segment')[];
  
  // Text search
  query?: string;
  semantic?: boolean; // Use AI semantic search
  
  // Date filters
  dateFrom?: Date;
  dateTo?: Date;
  dateField?: 'createdAt' | 'updatedAt' | 'lastActivityAt';
  
  // Status filters
  leadStatus?: string[];
  dealStage?: string[];
  dealPipeline?: string[];
  
  // Value filters
  minValue?: number;
  maxValue?: number;
  currency?: string;
  
  // Score filters
  minScore?: number;
  maxScore?: number;
  
  // Assignment filters
  assignedTo?: string[];
  unassigned?: boolean;
  
  // Company filters
  companies?: string[];
  
  // Source filters
  sources?: string[];
  
  // Tags filters
  tags?: string[];
  
  // Custom field filters
  customFields?: Record<string, any>;
  
  // Pagination
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult {
  id: string;
  type: 'lead' | 'deal' | 'customer' | 'segment';
  title: string;
  subtitle?: string;
  description?: string;
  score?: number;
  metadata: Record<string, any>;
  highlights?: string[];
  relevanceScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SearchFacets {
  entities: Array<{ value: string; count: number }>;
  leadStatus: Array<{ value: string; count: number }>;
  dealStage: Array<{ value: string; count: number }>;
  dealPipeline: Array<{ value: string; count: number }>;
  companies: Array<{ value: string; count: number }>;
  sources: Array<{ value: string; count: number }>;
  assignedTo: Array<{ value: string; count: number }>;
  tags: Array<{ value: string; count: number }>;
  dateRanges: Array<{ label: string; count: number; from: string; to: string }>;
  valueRanges: Array<{ label: string; count: number; min: number; max: number }>;
  scoreRanges: Array<{ label: string; count: number; min: number; max: number }>;
}

export interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  facets: SearchFacets;
  searchTime: number;
  suggestions?: string[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface SavedSearch {
  id: string;
  name: string;
  query?: string;
  filters?: SearchFilters;
  semantic?: boolean;
  createdAt: string;
}

export interface SearchSuggestions {
  history: string[];
  suggestions: string[];
  popular: string[];
}

export interface SearchAnalytics {
  totalSearches: number;
  uniqueUsers: number;
  popularQueries: Array<{ query: string; count: number }>;
  searchTrends: Array<{ date: string; count: number }>;
  averageSearchesPerDay: number;
}

export const crmSearchApi = {
  /**
   * Perform advanced search across CRM entities
   */
  async search(filters: SearchFilters): Promise<SearchResponse> {
    const response = await api.post('/crm/search', filters);
    return response.data?.data || response.data;
  },

  /**
   * Get search suggestions based on query
   */
  async getSuggestions(query: string): Promise<SearchSuggestions> {
    const response = await api.get('/crm/search/suggestions', {
      params: { q: query }
    });
    return response.data?.data || response.data;
  },

  /**
   * Get available search facets
   */
  async getFacets(): Promise<SearchFacets> {
    const response = await api.get('/crm/search/facets');
    return response.data?.data || response.data;
  },

  /**
   * Get user search history
   */
  async getSearchHistory(limit = 10): Promise<string[]> {
    const response = await api.get('/crm/search/history', {
      params: { limit }
    });
    return response.data?.data || response.data;
  },

  /**
   * Get saved searches
   */
  async getSavedSearches(): Promise<SavedSearch[]> {
    try {
      const response = await api.get('/crm/search/saved');
      console.log('Saved searches API response:', response.data);
      const data = response.data?.data || response.data;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching saved searches:', error);
      return [];
    }
  },

  /**
   * Save a search
   */
  async saveSearch(name: string, filters: SearchFilters): Promise<void> {
    await api.post('/crm/search/saved', {
      name,
      ...filters
    });
  },

  /**
   * Delete a saved search
   */
  async deleteSavedSearch(searchId: string): Promise<void> {
    await api.delete(`/crm/search/saved/${searchId}`);
  },

  /**
   * Get search analytics (admin only)
   */
  async getSearchAnalytics(days = 30): Promise<SearchAnalytics> {
    const response = await api.get('/crm/search/analytics', {
      params: { days }
    });
    return response.data?.data || response.data;
  },

  /**
   * Quick search with minimal filters
   */
  async quickSearch(query: string, entities?: ('lead' | 'deal' | 'customer' | 'segment')[]): Promise<SearchResponse> {
    return this.search({
      query,
      entities: entities || ['lead', 'deal', 'customer'],
      limit: 10
    });
  },

  /**
   * Search leads with filters
   */
  async searchLeads(filters: Omit<SearchFilters, 'entities'>): Promise<SearchResponse> {
    return this.search({
      ...filters,
      entities: ['lead']
    });
  },

  /**
   * Search deals with filters
   */
  async searchDeals(filters: Omit<SearchFilters, 'entities'>): Promise<SearchResponse> {
    return this.search({
      ...filters,
      entities: ['deal']
    });
  },

  /**
   * Search customers with filters
   */
  async searchCustomers(filters: Omit<SearchFilters, 'entities'>): Promise<SearchResponse> {
    return this.search({
      ...filters,
      entities: ['customer']
    });
  },

  /**
   * Search segments with filters
   */
  async searchSegments(filters: Omit<SearchFilters, 'entities'>): Promise<SearchResponse> {
    return this.search({
      ...filters,
      entities: ['segment']
    });
  },

  /**
   * Semantic search using AI
   */
  async semanticSearch(query: string, entities?: ('lead' | 'deal' | 'customer' | 'segment')[]): Promise<SearchResponse> {
    return this.search({
      query,
      entities: entities || ['lead', 'deal', 'customer'],
      semantic: true,
      limit: 20
    });
  },

  /**
   * Search with date range
   */
  async searchByDateRange(
    dateFrom: Date,
    dateTo: Date,
    dateField: 'createdAt' | 'updatedAt' | 'lastActivityAt' = 'createdAt',
    entities?: ('lead' | 'deal' | 'customer' | 'segment')[]
  ): Promise<SearchResponse> {
    return this.search({
      entities: entities || ['lead', 'deal', 'customer'],
      dateFrom,
      dateTo,
      dateField
    });
  },

  /**
   * Search by value range
   */
  async searchByValueRange(
    minValue: number,
    maxValue: number,
    currency = 'USD'
  ): Promise<SearchResponse> {
    return this.search({
      entities: ['deal'],
      minValue,
      maxValue,
      currency
    });
  },

  /**
   * Search by score range
   */
  async searchByScoreRange(
    minScore: number,
    maxScore: number,
    entities?: ('lead' | 'customer')[]
  ): Promise<SearchResponse> {
    return this.search({
      entities: entities || ['lead'],
      minScore,
      maxScore
    });
  },

  /**
   * Search unassigned items
   */
  async searchUnassigned(entities?: ('lead' | 'deal')[]): Promise<SearchResponse> {
    return this.search({
      entities: entities || ['lead', 'deal'],
      unassigned: true
    });
  },

  /**
   * Search by company
   */
  async searchByCompany(companies: string[]): Promise<SearchResponse> {
    return this.search({
      entities: ['lead', 'customer'],
      companies
    });
  },

  /**
   * Search by source
   */
  async searchBySource(sources: string[]): Promise<SearchResponse> {
    return this.search({
      entities: ['lead'],
      sources
    });
  },

  /**
   * Search by tags
   */
  async searchByTags(tags: string[], entities?: ('lead' | 'deal' | 'customer')[]): Promise<SearchResponse> {
    return this.search({
      entities: entities || ['lead', 'deal', 'customer'],
      tags
    });
  }
};
