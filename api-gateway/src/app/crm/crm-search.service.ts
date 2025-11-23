import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@glavito/shared-database';

export interface SearchFilters {
  // Entity filters
  entities?: ('lead' | 'deal' | 'customer' | 'segment' | 'ticket' | 'conversation')[];
  
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
  ticketStatus?: string[];
  ticketPriority?: string[];
  conversationStatus?: string[];
  
  // Channel filters
  channels?: string[];
  
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
  teamId?: string[];
  
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
  type: 'lead' | 'deal' | 'customer' | 'segment' | 'ticket' | 'conversation';
  title: string;
  subtitle?: string;
  description?: string;
  score?: number;
  metadata: Record<string, any>;
  highlights?: string[];
  relevanceScore?: number;
  createdAt: Date;
  updatedAt: Date;
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

export interface SearchFacets {
  entities: Array<{ value: string; count: number }>;
  leadStatus: Array<{ value: string; count: number }>;
  dealStage: Array<{ value: string; count: number }>;
  dealPipeline: Array<{ value: string; count: number }>;
  ticketStatus: Array<{ value: string; count: number }>;
  ticketPriority: Array<{ value: string; count: number }>;
  conversationStatus: Array<{ value: string; count: number }>;
  channels: Array<{ value: string; count: number }>;
  companies: Array<{ value: string; count: number }>;
  sources: Array<{ value: string; count: number }>;
  assignedTo: Array<{ value: string; count: number }>;
  teams: Array<{ value: string; count: number }>;
  tags: Array<{ value: string; count: number }>;
  dateRanges: Array<{ label: string; count: number; from: Date; to: Date }>;
  valueRanges: Array<{ value: string; count: number; min: number; max: number }>;
  scoreRanges: Array<{ label: string; count: number; min: number; max: number }>;
}

@Injectable()
export class CrmSearchService {
  private readonly logger = new Logger(CrmSearchService.name);

  constructor(
    private readonly prisma: PrismaService
  ) {}

  async search(tenantId: string, filters: SearchFilters): Promise<SearchResponse> {
    const startTime = Date.now();
    
    try {
      // Build search query
      const searchQuery = await this.buildSearchQuery(tenantId, filters);
      
      // Execute search
      const [results, totalCount, facets] = await Promise.all([
        this.executeSearch(searchQuery, filters),
        this.getTotalCount(searchQuery),
        this.generateFacets(tenantId, filters)
      ]);

      // Generate suggestions if query provided
      const suggestions = filters.query ? await this.generateSuggestions(filters.query) : undefined;

      const searchTime = Date.now() - startTime;

      return {
        results,
        totalCount,
        facets,
        searchTime,
        suggestions,
        pagination: {
          page: filters.page || 1,
          limit: filters.limit || 20,
          totalPages: Math.ceil(totalCount / (filters.limit || 20)),
          hasNext: (filters.page || 1) * (filters.limit || 20) < totalCount,
          hasPrev: (filters.page || 1) > 1
        }
      };
    } catch (error) {
      this.logger.error('Search failed', error);
      throw error;
    }
  }

  private async buildSearchQuery(tenantId: string, filters: SearchFilters) {
    // Only keep safe cross-entity constraints here
    const baseWhere: any = { tenantId };
    const entities = filters.entities || ['lead', 'deal', 'customer', 'segment', 'ticket', 'conversation'];
    const searchQuery = filters.query;
    const useSemantic = filters.semantic;

    // Do not attach date/entity-specific filters here; apply per-entity later

    return { baseWhere, entities, searchQuery, useSemantic, filters };
  }

  private buildTextSearchConditionsForEntity(query: string, entity: string): any[] {
    const searchTerms = query.toLowerCase().split(/\s+/);
    switch (entity) {
      case 'lead':
        return [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { company: { contains: query, mode: 'insensitive' } },
          { tags: { hasSome: searchTerms } }
        ];
      case 'deal':
        return [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { stage: { contains: query, mode: 'insensitive' } }
        ];
      case 'customer':
        return [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { company: { contains: query, mode: 'insensitive' } },
          { tags: { hasSome: searchTerms } }
        ];
      case 'segment':
        return [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } }
        ];
      case 'ticket':
        return [
          { subject: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { tags: { hasSome: searchTerms } }
        ];
      case 'conversation':
        return [
          { subject: { contains: query, mode: 'insensitive' } }
        ];
      default:
        return [];
    }
  }

  private applyEntityFilters(where: any, entity: string, filters: SearchFilters): void {
    // Date filters
    if (filters.dateFrom || filters.dateTo) {
      const dateField = filters.dateField || 'createdAt';
      // Only apply if field is likely to exist on the entity
      if (
        (entity === 'lead' && (dateField === 'createdAt' || dateField === 'updatedAt' || dateField === 'lastActivityAt')) ||
        (entity === 'deal' && (dateField === 'createdAt' || dateField === 'updatedAt')) ||
        (entity === 'customer' && (dateField === 'createdAt' || dateField === 'updatedAt')) ||
        (entity === 'segment' && (dateField === 'createdAt' || dateField === 'updatedAt')) ||
        (entity === 'ticket' && (dateField === 'createdAt' || dateField === 'updatedAt')) ||
        (entity === 'conversation' && (dateField === 'createdAt' || dateField === 'updatedAt'))
      ) {
        where[dateField] = {};
        if (filters.dateFrom) where[dateField].gte = filters.dateFrom;
        if (filters.dateTo) where[dateField].lte = filters.dateTo;
      }
    }

    // Entity-specific filters
    if (entity === 'lead') {
      if (filters.leadStatus?.length) where.status = { in: filters.leadStatus };
      if (filters.assignedTo?.length) where.assignedUserId = { in: filters.assignedTo };
      if (filters.unassigned) where.assignedUserId = null;
      if (filters.companies?.length) where.company = { in: filters.companies };
      if (filters.sources?.length) where.source = { in: filters.sources };
      if (filters.tags?.length) where.tags = { hasSome: filters.tags };
      if (filters.minScore !== undefined || filters.maxScore !== undefined) {
        where.score = {};
        if (filters.minScore !== undefined) where.score.gte = filters.minScore;
        if (filters.maxScore !== undefined) where.score.lte = filters.maxScore;
      }
    }

    if (entity === 'deal') {
      if (filters.dealStage?.length) where.stage = { in: filters.dealStage };
      if (filters.dealPipeline?.length) where.pipelineId = { in: filters.dealPipeline };
      if (filters.assignedTo?.length) where.assignedUserId = { in: filters.assignedTo };
      if (filters.unassigned) where.assignedUserId = null;
      if (filters.tags?.length) where.tags = { hasSome: filters.tags };
      if (filters.minValue !== undefined || filters.maxValue !== undefined) {
        where.value = {};
        if (filters.minValue !== undefined) where.value.gte = filters.minValue;
        if (filters.maxValue !== undefined) where.value.lte = filters.maxValue;
      }
    }

    if (entity === 'customer') {
      if (filters.companies?.length) where.company = { in: filters.companies };
      if (filters.tags?.length) where.tags = { hasSome: filters.tags };
      // healthScore filters could be mapped from minScore/maxScore if desired; skipping for now
    }

    if (entity === 'ticket') {
      if (filters.ticketStatus?.length) where.status = { in: filters.ticketStatus };
      if (filters.ticketPriority?.length) where.priority = { in: filters.ticketPriority };
      if (filters.assignedTo?.length) where.assignedAgentId = { in: filters.assignedTo };
      if (filters.unassigned) where.assignedAgentId = null;
      if (filters.teamId?.length) where.teamId = { in: filters.teamId };
      if (filters.tags?.length) where.tags = { hasSome: filters.tags };
      if (filters.channels?.length) {
        where.channel = { type: { in: filters.channels } };
      }
    }

    if (entity === 'conversation') {
      if (filters.conversationStatus?.length) where.status = { in: filters.conversationStatus };
      if (filters.channels?.length) {
        where.channel = { type: { in: filters.channels } };
      }
    }
  }

  private async performSemanticSearch(query: string, tenantId: string, entities: string[]): Promise<Array<{ id: string; score: number }>> {
    try {
      // For now, semantic search is disabled - fall back to text search
      // In the future, this could be implemented with proper AI service integration
      this.logger.debug('Semantic search requested but not implemented, falling back to text search');
      return [];
    } catch (error) {
      this.logger.warn('Semantic search failed, falling back to text search', error);
      return [];
    }
  }

  private async searchByEmbedding(_entity: string, _queryEmbedding: number[], _tenantId: string): Promise<Array<{ id: string; score: number }>> {
    // This would use vector similarity search in a real implementation
    // For now, we'll return empty results and fall back to text search
    return [];
  }

  private async executeSearch(searchQuery: any, filters: SearchFilters): Promise<SearchResult[]> {
    const { baseWhere, entities, searchQuery: query, useSemantic } = searchQuery;
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;
    const sortBy = filters.sortBy || 'id';
    const sortOrder = filters.sortOrder || 'desc';

    const results: SearchResult[] = [];

    // Search each entity type
    for (const entity of entities) {
      let entityResults: any[] = [];
      // Build per-entity where
      const where = { ...baseWhere };
      // Apply entity-specific filters
      this.applyEntityFilters(where, entity, filters);
      // Add text/semantic conditions per entity
      if (query) {
        if (useSemantic) {
          const semanticResults = await this.performSemanticSearch(query, baseWhere.tenantId, [entity]);
          if (semanticResults.length > 0) {
            where.id = { in: semanticResults.map(r => r.id) };
          }
        } else {
          const ors = this.buildTextSearchConditionsForEntity(query, entity);
          if (ors.length > 0) where.OR = ors;
        }
      }

      switch (entity) {
        case 'lead':
          entityResults = await this.prisma.lead.findMany({
            where,
            skip,
            take: limit,
            orderBy: { [sortBy === 'updatedAt' ? 'id' : sortBy]: sortOrder },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              company: true,
              status: true,
              score: true,
              source: true,
              tags: true,
              assignedUserId: true,
              createdAt: true,
              updatedAt: true
            }
          });
          break;
        case 'deal':
          entityResults = await this.prisma.deal.findMany({
            where,
            skip,
            take: limit,
            orderBy: { [sortBy === 'updatedAt' ? 'updatedAt' : sortBy]: sortOrder },
            select: {
              id: true,
              name: true,
              description: true,
              stage: true,
              value: true,
              currency: true,
              createdAt: true,
              updatedAt: true,
              assignedUserId: true,
              pipelineId: true
            }
          });
          break;
        case 'customer':
          entityResults = await this.prisma.customer.findMany({
            where,
            skip,
            take: limit,
            orderBy: { [sortBy === 'updatedAt' ? 'id' : sortBy]: sortOrder },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              company: true,
              tags: true,
              healthScore: true,
              createdAt: true,
              updatedAt: true
            }
          });
          break;
        case 'segment':
          entityResults = await this.prisma.customerSegment.findMany({
            where,
            skip,
            take: limit,
            orderBy: { [sortBy === 'updatedAt' ? 'updatedAt' : sortBy]: sortOrder },
            select: {
              id: true,
              name: true,
              description: true,
              isActive: true,
              createdAt: true,
              updatedAt: true
            }
          });
          break;
        case 'ticket':
          entityResults = await this.prisma.ticket.findMany({
            where,
            skip,
            take: limit,
            orderBy: { [sortBy === 'updatedAt' ? 'updatedAt' : sortBy]: sortOrder },
            select: {
              id: true,
              subject: true,
              description: true,
              status: true,
              priority: true,
              tags: true,
              assignedAgentId: true,
              teamId: true,
              createdAt: true,
              updatedAt: true,
              channel: {
                select: {
                  type: true
                }
              }
            }
          });
          break;
        case 'conversation':
          entityResults = await this.prisma.conversation.findMany({
            where,
            skip,
            take: limit,
            orderBy: { [sortBy === 'updatedAt' ? 'updatedAt' : sortBy]: sortOrder },
            select: {
              id: true,
              subject: true,
              status: true,
              createdAt: true,
              updatedAt: true,
              channel: {
                select: {
                  type: true
                }
              }
            }
          });
          break;
      }

      // Transform results to SearchResult format
      const transformedResults = entityResults.map(result => this.transformToSearchResult(result, entity));
      results.push(...transformedResults);
    }

    // Sort combined results by relevance if query provided
    if (filters.query) {
      results.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
    }

    return results.slice(0, limit);
  }

  private transformToSearchResult(result: any, entity: string): SearchResult {
    switch (entity) {
      case 'lead':
        return {
          id: result.id,
          type: 'lead',
          title: `${result.firstName || ''} ${result.lastName || ''}`.trim() || 'Unnamed Lead',
          subtitle: result.company || result.email,
          description: `Lead from ${result.source || 'unknown source'}`,
          score: result.score,
          metadata: {
            status: result.status,
            source: result.source,
            tags: result.tags,
            assignedUserId: result.assignedUserId
          },
          createdAt: new Date(), // Lead model doesn't have createdAt/updatedAt
          updatedAt: new Date()
        };
      case 'deal':
        return {
          id: result.id,
          type: 'deal',
          title: result.name || 'Untitled Deal',
          subtitle: result.stage,
          description: result.description,
          metadata: {
            stage: result.stage,
            value: result.value,
            currency: result.currency,
            assignedUserId: result.assignedUserId,
            pipelineId: result.pipelineId
          },
          createdAt: result.createdAt,
          updatedAt: result.updatedAt
        };
      case 'customer':
        return {
          id: result.id,
          type: 'customer',
          title: `${result.firstName || ''} ${result.lastName || ''}`.trim() || 'Unnamed Customer',
          subtitle: result.company || result.email,
          description: `Customer with health score ${result.healthScore || 'N/A'}`,
          score: result.healthScore,
          metadata: {
            tags: result.tags,
            healthScore: result.healthScore
          },
          createdAt: new Date(), // Customer model doesn't have createdAt/updatedAt
          updatedAt: new Date()
        };
      case 'segment':
        return {
          id: result.id,
          type: 'segment',
          title: result.name,
          subtitle: result.isActive ? 'Active' : 'Inactive',
          description: result.description,
          metadata: {
            isActive: result.isActive
          },
          createdAt: result.createdAt,
          updatedAt: result.updatedAt
        };
      case 'ticket':
        return {
          id: result.id,
          type: 'ticket',
          title: result.subject,
          subtitle: `${result.status} - ${result.priority}`,
          description: result.description?.substring(0, 200),
          metadata: {
            status: result.status,
            priority: result.priority,
            tags: result.tags,
            assignedAgentId: result.assignedAgentId,
            teamId: result.teamId,
            channel: result.channel?.type
          },
          createdAt: result.createdAt,
          updatedAt: result.updatedAt
        };
      case 'conversation':
        return {
          id: result.id,
          type: 'conversation',
          title: result.subject || 'Conversation',
          subtitle: result.status,
          description: `Conversation via ${result.channel?.type || 'unknown channel'}`,
          metadata: {
            status: result.status,
            channel: result.channel?.type
          },
          createdAt: result.createdAt,
          updatedAt: result.updatedAt
        };
      default:
        return {
          id: result.id,
          type: entity as any,
          title: result.name || result.firstName || 'Unknown',
          metadata: result,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt
        };
    }
  }

  private async getTotalCount(searchQuery: any): Promise<number> {
    const { baseWhere, entities, searchQuery: query, useSemantic, filters } = searchQuery;
    let totalCount = 0;

    for (const entity of entities) {
      let count = 0;
      const where = { ...baseWhere };
      this.applyEntityFilters(where, entity, filters);
      if (query) {
        if (useSemantic) {
          const semanticResults = await this.performSemanticSearch(query, baseWhere.tenantId, [entity]);
          if (semanticResults.length > 0) where.id = { in: semanticResults.map(r => r.id) };
        } else {
          const ors = this.buildTextSearchConditionsForEntity(query, entity);
          if (ors.length > 0) where.OR = ors;
        }
      }

      switch (entity) {
        case 'lead':
          count = await this.prisma.lead.count({ where });
          break;
        case 'deal':
          count = await this.prisma.deal.count({ where });
          break;
        case 'customer':
          count = await this.prisma.customer.count({ where });
          break;
        case 'segment':
          count = await this.prisma.customerSegment.count({ where });
          break;
        case 'ticket':
          count = await this.prisma.ticket.count({ where });
          break;
        case 'conversation':
          count = await this.prisma.conversation.count({ where });
          break;
      }
      totalCount += count;
    }

    return totalCount;
  }

  private async generateFacets(tenantId: string, _filters: SearchFilters): Promise<SearchFacets> {
    // Generate facets for each filter category
    const facets: SearchFacets = {
      entities: [],
      leadStatus: [],
      dealStage: [],
      dealPipeline: [],
      ticketStatus: [],
      ticketPriority: [],
      conversationStatus: [],
      channels: [],
      companies: [],
      sources: [],
      assignedTo: [],
      teams: [],
      tags: [],
      dateRanges: [],
      valueRanges: [],
      scoreRanges: []
    };

    try {
      // Entity counts
      const entityCounts = await Promise.all([
        this.prisma.lead.count({ where: { tenantId } }),
        this.prisma.deal.count({ where: { tenantId } }),
        this.prisma.customer.count({ where: { tenantId } }),
        this.prisma.customerSegment.count({ where: { tenantId } }),
        this.prisma.ticket.count({ where: { tenantId } }),
        this.prisma.conversation.count({ where: { tenantId } })
      ]);

      facets.entities = [
        { value: 'lead', count: entityCounts[0] },
        { value: 'deal', count: entityCounts[1] },
        { value: 'customer', count: entityCounts[2] },
        { value: 'segment', count: entityCounts[3] },
        { value: 'ticket', count: entityCounts[4] },
        { value: 'conversation', count: entityCounts[5] }
      ];

      // Lead status counts
      const leadStatuses = await this.prisma.lead.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { status: true }
      });
      facets.leadStatus = leadStatuses.map(item => ({
        value: item.status || 'unknown',
        count: item._count.status
      }));

      // Deal stage counts
      const dealStages = await this.prisma.deal.groupBy({
        by: ['stage'],
        where: { tenantId },
        _count: { stage: true }
      });
      facets.dealStage = dealStages.map(item => ({
        value: item.stage || 'unknown',
        count: item._count.stage
      }));

      // Ticket status counts
      const ticketStatuses = await this.prisma.ticket.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { status: true }
      });
      facets.ticketStatus = ticketStatuses.map(item => ({
        value: item.status || 'unknown',
        count: item._count.status
      }));

      // Ticket priority counts
      const ticketPriorities = await this.prisma.ticket.groupBy({
        by: ['priority'],
        where: { tenantId },
        _count: { priority: true }
      });
      facets.ticketPriority = ticketPriorities.map(item => ({
        value: item.priority || 'unknown',
        count: item._count.priority
      }));

      // Conversation status counts
      const conversationStatuses = await this.prisma.conversation.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { status: true }
      });
      facets.conversationStatus = conversationStatuses.map(item => ({
        value: item.status || 'unknown',
        count: item._count.status
      }));

      // Channel counts (from tickets and conversations)
      const ticketChannels = await this.prisma.ticket.findMany({
        where: { tenantId },
        select: { channel: { select: { type: true } } },
        distinct: ['channelId']
      });
      const conversationChannels = await this.prisma.conversation.findMany({
        where: { tenantId },
        select: { channel: { select: { type: true } } },
        distinct: ['channelId']
      });
      const channelMap = new Map<string, number>();
      for (const t of ticketChannels) {
        const type = t.channel.type;
        channelMap.set(type, (channelMap.get(type) || 0) + 1);
      }
      for (const c of conversationChannels) {
        const type = c.channel.type;
        channelMap.set(type, (channelMap.get(type) || 0) + 1);
      }
      facets.channels = Array.from(channelMap.entries()).map(([value, count]) => ({ value, count }));

      // Team counts
      const teams = await this.prisma.ticket.groupBy({
        by: ['teamId'],
        where: { tenantId, teamId: { not: null } },
        _count: { teamId: true }
      });
      facets.teams = teams.map(item => ({
        value: item.teamId || 'unknown',
        count: item._count.teamId
      }));

      // Company counts
      const companies = await this.prisma.lead.groupBy({
        by: ['company'],
        where: { tenantId, company: { not: null } },
        _count: { company: true }
      });
      facets.companies = companies.map(item => ({
        value: item.company || 'unknown',
        count: (item._count as any)?.company || 0
      }));

      // Source counts
      const sources = await this.prisma.lead.groupBy({
        by: ['source'],
        where: { tenantId },
        _count: { source: true }
      });
      facets.sources = sources.map(item => ({
        value: item.source || 'unknown',
        count: (item._count as any)?.source || 0
      }));

      // Generate date ranges
      const now = new Date();
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const lastQuarter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      const [weekCount, monthCount, quarterCount] = await Promise.all([
        this.prisma.lead.count({ where: { tenantId, createdAt: { gte: lastWeek } } }),
        this.prisma.lead.count({ where: { tenantId, createdAt: { gte: lastMonth } } }),
        this.prisma.lead.count({ where: { tenantId, createdAt: { gte: lastQuarter } } })
      ]);

      facets.dateRanges = [
        { label: 'Last 7 days', count: weekCount, from: lastWeek, to: now },
        { label: 'Last 30 days', count: monthCount, from: lastMonth, to: now },
        { label: 'Last 90 days', count: quarterCount, from: lastQuarter, to: now }
      ];

      // Generate value ranges
      const [lowValue, midValue, highValue] = await Promise.all([
        this.prisma.deal.count({ where: { tenantId, value: { lt: 1000 } } }),
        this.prisma.deal.count({ where: { tenantId, value: { gte: 1000, lt: 10000 } } }),
        this.prisma.deal.count({ where: { tenantId, value: { gte: 10000 } } })
      ]);

      facets.valueRanges = [
        { label: 'Under $1K', count: lowValue, min: 0, max: 1000 },
        { label: '$1K - $10K', count: midValue, min: 1000, max: 10000 },
        { label: 'Over $10K', count: highValue, min: 10000, max: Infinity }
      ];

      // Generate score ranges
      const [lowScore, midScore, highScore] = await Promise.all([
        this.prisma.lead.count({ where: { tenantId, score: { lt: 40 } } }),
        this.prisma.lead.count({ where: { tenantId, score: { gte: 40, lt: 70 } } }),
        this.prisma.lead.count({ where: { tenantId, score: { gte: 70 } } })
      ]);

      facets.scoreRanges = [
        { label: 'Cold (0-39)', count: lowScore, min: 0, max: 40 },
        { label: 'Warm (40-69)', count: midScore, min: 40, max: 70 },
        { label: 'Hot (70-100)', count: highScore, min: 70, max: 100 }
      ];

    } catch (error) {
      this.logger.warn('Failed to generate some facets', error);
    }

    return facets;
  }

  private async generateSuggestions(query: string): Promise<string[]> {
    // Generate search suggestions based on the query
    // This could use AI to generate contextual suggestions
    const suggestions: string[] = [];
    
    // Add common search patterns
    if (query.length > 2) {
      suggestions.push(`${query} leads`);
      suggestions.push(`${query} deals`);
      suggestions.push(`${query} customers`);
      suggestions.push(`high value ${query}`);
      suggestions.push(`recent ${query}`);
    }
    
    return suggestions.slice(0, 5);
  }

  async getSearchHistory(tenantId: string, userId: string, limit = 10): Promise<string[]> {
    try {
      const history = await this.prisma.searchEvent.findMany({
        where: { tenantId, userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { q: true }
      });
      
      return history.map(item => item.q).filter(Boolean) as string[];
    } catch (error) {
      this.logger.warn('Failed to get search history', error);
      return [];
    }
  }

  async saveSearch(tenantId: string, userId: string, name: string, filters: SearchFilters): Promise<void> {
    try {
      await this.prisma.savedSearch.create({
        data: {
          tenantId,
          userId,
          name,
          query: filters.query,
          filters: filters as any,
          semantic: filters.semantic || false
        }
      });
    } catch (error) {
      this.logger.error('Failed to save search', error);
      throw error;
    }
  }

  async getSavedSearches(tenantId: string, userId: string): Promise<Array<{ id: string; name: string; query?: string | null; filters?: any; semantic?: boolean; createdAt: Date }>> {
    try {
      const searches = await this.prisma.savedSearch.findMany({
        where: { tenantId, userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          query: true,
          filters: true,
          semantic: true,
          createdAt: true
        }
      });
      
      return searches;
    } catch (error) {
      this.logger.warn('Failed to get saved searches', error);
      return [];
    }
  }

  async deleteSavedSearch(tenantId: string, userId: string, searchId: string): Promise<void> {
    try {
      await this.prisma.savedSearch.delete({
        where: { id: searchId, tenantId, userId }
      });
    } catch (error) {
      this.logger.error('Failed to delete saved search', error);
      throw error;
    }
  }
}
