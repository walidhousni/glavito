import { Injectable } from '@nestjs/common';
import { PrismaService } from '@glavito/shared-database';

export interface SearchResult {
  id: string;
  type: 'ticket' | 'customer' | 'knowledge' | 'user' | 'team';
  title: string;
  description?: string;
  url: string;
  metadata?: Record<string, unknown>;
  relevanceScore?: number;
}

export interface FederatedSearchResponse {
  results: SearchResult[];
  totalCount: number;
  searchTime: number;
  suggestions?: string[];
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) { }

  async federated(
    tenantId: string,
    query: string,
    limit: number = 10,
  ): Promise<FederatedSearchResponse> {
    const startTime = Date.now();

    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    if (!query || query.trim().length < 2) {
      return {
        results: [],
        totalCount: 0,
        searchTime: Date.now() - startTime,
        suggestions: [],
      };
    }

    const searchTerm = query.trim().toLowerCase();
    const results: SearchResult[] = [];

    try {
      // Search in parallel for better performance
      const [tickets, customers, knowledge, users, teams] = await Promise.all([
        this.searchTickets(tenantId, searchTerm, limit),
        this.searchCustomers(tenantId, searchTerm, limit),
        this.searchKnowledge(tenantId, searchTerm, limit),
        this.searchUsers(tenantId, searchTerm, limit),
        this.searchTeams(tenantId, searchTerm, limit),
      ]);

      results.push(...tickets, ...customers, ...knowledge, ...users, ...teams);

      // Sort by relevance score (if available) or by type priority
      results.sort((a, b) => {
        if (a.relevanceScore && b.relevanceScore) {
          return b.relevanceScore - a.relevanceScore;
        }

        // Type priority: tickets > customers > knowledge > users > teams
        const typePriority = { ticket: 5, customer: 4, knowledge: 3, user: 2, team: 1 };
        return (typePriority[b.type] || 0) - (typePriority[a.type] || 0);
      });

      const limitedResults = results.slice(0, limit);
      const suggestions = this.generateSuggestions(searchTerm, results);

      return {
        results: limitedResults,
        totalCount: results.length,
        searchTime: Date.now() - startTime,
        suggestions,
      };
    } catch (error) {
      console.error('Search error:', error);
      return {
        results: [],
        totalCount: 0,
        searchTime: Date.now() - startTime,
        suggestions: [],
      };
    }
  }

  private async searchTickets(
    tenantId: string,
    searchTerm: string,
    limit: number,
  ): Promise<SearchResult[]> {
    try {
      const tickets = await this.prisma.ticket.findMany({
        where: {
          tenantId,
          OR: [
            { subject: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
            { tags: { hasSome: [searchTerm] } },
            { id: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        include: {
          customer: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          assignedAgent: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      return tickets.map((ticket) => ({
        id: ticket.id,
        type: 'ticket' as const,
        title: ticket.subject,
        description: `${ticket.status.toUpperCase()} • ${ticket.priority.toUpperCase()} • ${ticket.customer.firstName || ticket.customer.email
          }`,
        url: `/tickets/${ticket.id}`,
        metadata: {
          status: ticket.status,
          priority: ticket.priority,
          customerName: `${ticket.customer.firstName || ''} ${ticket.customer.lastName || ''}`.trim(),
          assignedAgent: ticket.assignedAgent
            ? `${ticket.assignedAgent.firstName} ${ticket.assignedAgent.lastName}`
            : null,
          createdAt: ticket.createdAt,
        },
        relevanceScore: this.calculateRelevanceScore(searchTerm, [
          ticket.subject,
          ticket.description,
          ...ticket.tags,
        ]),
      }));
    } catch (error) {
      console.error('Error searching tickets:', error);
      return [];
    }
  }

  private async searchCustomers(
    tenantId: string,
    searchTerm: string,
    limit: number,
  ): Promise<SearchResult[]> {
    try {
      const customers = await this.prisma.customer.findMany({
        where: {
          tenantId,
          OR: [
            { firstName: { contains: searchTerm, mode: 'insensitive' } },
            { lastName: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
            { company: { contains: searchTerm, mode: 'insensitive' } },
            { phone: { contains: searchTerm, mode: 'insensitive' } },
            { tags: { hasSome: [searchTerm] } },
          ],
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      return customers.map((customer) => ({
        id: customer.id,
        type: 'customer' as const,
        title: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.email || 'Unknown Customer',
        description: `${customer.email || ''} ${customer.company ? `• ${customer.company}` : ''}`,
        url: `/customers/${customer.id}`,
        metadata: {
          email: customer.email,
          company: customer.company,
          phone: customer.phone,
          createdAt: customer.createdAt,
        },
        relevanceScore: this.calculateRelevanceScore(searchTerm, [
          customer.firstName || '',
          customer.lastName || '',
          customer.email || '',
          customer.company || '',
          customer.phone || '',
        ]),
      }));
    } catch (error) {
      console.error('Error searching customers:', error);
      return [];
    }
  }

  private async searchKnowledge(
    tenantId: string,
    searchTerm: string,
    limit: number,
  ): Promise<SearchResult[]> {
    try {
      const articles = await this.prisma.knowledgeBase.findMany({
        where: {
          tenantId,
          isPublished: true,
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { content: { contains: searchTerm, mode: 'insensitive' } },
            { tags: { hasSome: [searchTerm] } },
          ],
        },
        take: limit,
        orderBy: { viewCount: 'desc' },
      });

      return articles.map((article) => ({
        id: article.id,
        type: 'knowledge' as const,
        title: article.title,
        description: `${article.category} • ${article.viewCount} views`,
        url: `/knowledge/${article.id}`,
        metadata: {
          category: article.category,
          viewCount: article.viewCount,
          helpfulCount: article.helpfulCount,
          createdAt: article.createdAt,
        },
        relevanceScore: this.calculateRelevanceScore(searchTerm, [
          article.title,
          article.content,
          ...article.tags,
        ]),
      }));
    } catch (error) {
      console.error('Error searching knowledge base:', error);
      return [];
    }
  }

  private async searchUsers(
    tenantId: string,
    searchTerm: string,
    limit: number,
  ): Promise<SearchResult[]> {
    try {
      const users = await this.prisma.user.findMany({
        where: {
          tenantId,
          OR: [
            { firstName: { contains: searchTerm, mode: 'insensitive' } },
            { lastName: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      return users.map((user) => ({
        id: user.id,
        type: 'user' as const,
        title: `${user.firstName} ${user.lastName}`,
        description: `${user.email} • ${user.role.toUpperCase()}`,
        url: `/agents/${user.id}`,
        metadata: {
          email: user.email,
          role: user.role,
          status: user.status,
          createdAt: user.createdAt,
        },
        relevanceScore: this.calculateRelevanceScore(searchTerm, [
          user.firstName,
          user.lastName,
          user.email,
        ]),
      }));
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }

  private async searchTeams(
    tenantId: string,
    searchTerm: string,
    limit: number,
  ): Promise<SearchResult[]> {
    try {
      const teams = await this.prisma.team.findMany({
        where: {
          tenantId,
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        include: {
          members: {
            select: {
              id: true,
            },
          },
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      return teams.map((team) => ({
        id: team.id,
        type: 'team' as const,
        title: team.name,
        description: `${team.members.length} members ${team.description ? `• ${team.description}` : ''}`,
        url: `/teams/${team.id}`,
        metadata: {
          memberCount: team.members.length,
          description: team.description,
          createdAt: team.createdAt,
        },
        relevanceScore: this.calculateRelevanceScore(searchTerm, [
          team.name,
          team.description || '',
        ]),
      }));
    } catch (error) {
      console.error('Error searching teams:', error);
      return [];
    }
  }

  private calculateRelevanceScore(searchTerm: string, fields: string[]): number {
    let score = 0;
    const term = searchTerm.toLowerCase();

    fields.forEach((field) => {
      if (!field) return;

      const fieldLower = field.toLowerCase();

      // Exact match gets highest score
      if (fieldLower === term) {
        score += 100;
      }
      // Starts with search term
      else if (fieldLower.startsWith(term)) {
        score += 80;
      }
      // Contains search term
      else if (fieldLower.includes(term)) {
        score += 60;
      }
      // Word boundary match
      else if (new RegExp(`\\b${term}\\b`).test(fieldLower)) {
        score += 70;
      }
    });

    return score;
  }

  private generateSuggestions(searchTerm: string, results: SearchResult[]): string[] {
    const suggestions = new Set<string>();

    // Extract common terms from results
    results.forEach((result) => {
      const words = result.title.toLowerCase().split(/\s+/);
      words.forEach((word) => {
        if (word.length > 3 && word !== searchTerm.toLowerCase()) {
          suggestions.add(word);
        }
      });
    });

    return Array.from(suggestions).slice(0, 5);
  }
}