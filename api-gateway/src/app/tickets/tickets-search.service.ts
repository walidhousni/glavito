import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import { AIIntelligenceService } from '@glavito/shared-ai';

export interface TicketSearchFilters {
  status?: string[];
  priority?: string[];
  assignedAgentId?: string;
  customerId?: string;
  channelId?: string;
  teamId?: string; // reserved; not used directly on ticket
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
}

export interface TicketSearchOptions {
  semantic?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TicketFacetCounts {
  status: Record<string, number>;
  priority: Record<string, number>;
  tags: Record<string, number>;
}

@Injectable()
export class TicketsSearchService {
  constructor(
    private readonly db: DatabaseService,
    private readonly ai: AIIntelligenceService,
  ) {}

  async indexTicket(ticketId: string, tenantId: string): Promise<void> {
    const ticket = await this.db.ticket.findFirst({
      where: { id: ticketId, tenantId },
      include: {
        customer: true,
        conversations: { include: { messages: { select: { content: true }, orderBy: { createdAt: 'asc' } } } },
      },
    });
    if (!ticket) return;

    const messages = (ticket.conversations || [])
      .flatMap((c: any) => c.messages || [])
      .map((m: any) => m.content)
      .filter(Boolean)
      .join('\n');

    const parts: string[] = [
      ticket.subject || '',
      ticket.description || '',
      messages,
      (ticket.customer?.firstName || '') + ' ' + (ticket.customer?.lastName || ''),
      ticket.customer?.email || '',
      ticket.customer?.company || '',
      (ticket.tags || []).join(' '),
    ];
    const searchableText = parts.join('\n').slice(0, 20000); // cap to 20k chars

    // Best-effort embedding for semantic search
    let embedding: number[] | undefined = undefined;
    try {
      embedding = await this.ai.computeEmbedding(searchableText);
    } catch {
      // ignore embedding errors
    }

    await this.db.ticketSearch.upsert({
      where: { ticketId: ticket.id },
      create: {
        ticketId: ticket.id,
        searchableText,
        keywords: (ticket.tags || []) as any,
        searchVector: null,
        aiEmbedding: embedding && embedding.length ? (embedding as any) : undefined,
        indexVersion: '1.0',
        metadata: {} as any,
      },
      update: {
        searchableText,
        keywords: (ticket.tags || []) as any,
        aiEmbedding: embedding && embedding.length ? (embedding as any) : undefined,
        lastIndexedAt: new Date(),
      },
    });
  }

  async search(
    tenantId: string,
    q: string | undefined,
    filters: TicketSearchFilters = {},
    options: TicketSearchOptions = {},
    userId?: string,
  ): Promise<{ data: any[]; total: number; page: number; limit: number; facets: TicketFacetCounts }>
  {
    const startedAt = Date.now();
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const baseWhere: any = { tenantId };

    // Structured filters
    if (filters.status?.length) baseWhere.status = { in: filters.status };
    if (filters.priority?.length) baseWhere.priority = { in: filters.priority };
    if (filters.assignedAgentId) baseWhere.assignedAgentId = filters.assignedAgentId;
    if (filters.customerId) baseWhere.customerId = filters.customerId;
    if (filters.channelId) baseWhere.channelId = filters.channelId;
    if (filters.tags?.length) baseWhere.tags = { hasSome: filters.tags };
    if (filters.dateFrom || filters.dateTo) {
      baseWhere.createdAt = {
        gte: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
        lte: filters.dateTo ? new Date(filters.dateTo) : undefined,
      };
    }

    // Special flags compatible with list endpoint
    if ((filters as any).unassigned) {
      baseWhere.assignedAgentId = null;
    }
    if ((filters as any).overdue) {
      const now = new Date();
      baseWhere.slaInstance = {
        status: 'active',
        OR: [
          { AND: [{ resolutionDue: { lt: now } }, { resolutionAt: null }] },
          { AND: [{ firstResponseDue: { lt: now } }, { firstResponseAt: null }] },
        ],
      } as any;
    }
    if ((filters as any).slaAtRisk) {
      const twoHours = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const fourHours = new Date(Date.now() + 4 * 60 * 60 * 1000);
      baseWhere.slaInstance = {
        status: 'active',
        OR: [
          { AND: [{ firstResponseDue: { lt: twoHours } }, { firstResponseAt: null }] },
          { AND: [{ resolutionDue: { lt: fourHours } }, { resolutionAt: null }] },
        ],
      } as any;
    }

    // Parse simple fielded query tokens
    const parsed = this.parseQuery(q || '');
    const orBlocks: any[] = [];
    const andBlocks: any[] = [];

    if (parsed.terms.length) {
      for (const term of parsed.terms) {
        andBlocks.push({ searchData: { searchableText: { contains: term, mode: 'insensitive' } } });
      }
    }
    if (parsed.phrases.length) {
      for (const phrase of parsed.phrases) {
        andBlocks.push({ searchData: { searchableText: { contains: phrase, mode: 'insensitive' } } });
      }
    }
    if (parsed.subject.length) {
      for (const s of parsed.subject) andBlocks.push({ subject: { contains: s, mode: 'insensitive' } });
    }
    if (parsed.description.length) {
      for (const d of parsed.description) andBlocks.push({ description: { contains: d, mode: 'insensitive' } });
    }
    if (parsed.tag.length) {
      for (const tag of parsed.tag) andBlocks.push({ tags: { has: tag } });
    }
    if (parsed.status.length) andBlocks.push({ status: { in: parsed.status } });
    if (parsed.priority.length) andBlocks.push({ priority: { in: parsed.priority } });
    if (parsed.email.length) {
      for (const e of parsed.email) {
        andBlocks.push({ customer: { email: { contains: e, mode: 'insensitive' } } });
      }
    }
    if (parsed.customer.length) {
      for (const c of parsed.customer) {
        andBlocks.push({
          customer: {
            OR: [
              { firstName: { contains: c, mode: 'insensitive' } },
              { lastName: { contains: c, mode: 'insensitive' } },
              { company: { contains: c, mode: 'insensitive' } },
            ],
          },
        });
      }
    }

    const where: any = { ...baseWhere };
    if (andBlocks.length) where.AND = andBlocks;
    if (orBlocks.length) where.OR = orBlocks;

    // Fetch candidates
    const [items, total] = await Promise.all([
      this.db.ticket.findMany({
        where,
        include: {
          customer: true,
          channel: true,
          assignedAgent: true,
          searchData: { select: { aiEmbedding: true } },
          _count: { select: { conversations: true, timelineEvents: true } },
        },
        orderBy: { [options.sortBy || 'createdAt']: options.sortOrder || 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.ticket.count({ where }),
    ]);

    let ranked = items;
    if (options.semantic && q && items.length && this.ai.hasOpenAI()) {
      try {
        const qVec = await this.ai.computeEmbedding(q);
        const dot = (a: number[], b: number[]) => (a && b && a.length && b.length)
          ? a.reduce((s, v, i) => s + v * (b[i] || 0), 0)
          : 0;
        const scored = items.map((it: any) => {
          const vec = Array.isArray((it.searchData as any)?.aiEmbedding)
            ? ((it.searchData as any).aiEmbedding as number[])
            : [];
          return { score: dot(qVec, vec), it };
        });
        scored.sort((a, b) => b.score - a.score);
        ranked = scored.map((s) => s.it);
      } catch {
        // ignore semantic ranking errors
      }
    }

    const facets = await this.computeFacets(tenantId, where);

    const result = {
      data: ranked,
      total,
      page,
      limit,
      facets,
    };
    // log search analytics (best-effort)
    try {
      await this.db.searchEvent.create({
        data: {
          tenantId,
          userId,
          q: q || undefined,
          filters: (filters || {}) as any,
          results: total || (ranked?.length || 0),
          durationMs: Date.now() - startedAt,
        },
      });
    } catch {
      // ignore
    }
    return result;
  }

  async suggest(tenantId: string, q: string) {
    const term = q.trim();
    const [subjects, tagsAgg, customers] = await Promise.all([
      this.db.ticket.findMany({
        where: {
          tenantId,
          ...(term
            ? { subject: { contains: term, mode: 'insensitive' } as any }
            : { subject: { not: '' } as any }),
        },
        select: { subject: true },
        take: 10,
        orderBy: { updatedAt: 'desc' },
      }),
      this.db.ticket.findMany({
        where: { tenantId },
        select: { tags: true },
        take: 200,
        orderBy: { updatedAt: 'desc' },
      }),
      this.db.customer.findMany({
        where: term
          ? {
              tenantId,
              OR: [
                { firstName: { contains: term, mode: 'insensitive' } },
                { lastName: { contains: term, mode: 'insensitive' } },
                { email: { contains: term, mode: 'insensitive' } },
                { company: { contains: term, mode: 'insensitive' } },
              ],
            }
          : { tenantId },
        select: { id: true, firstName: true, lastName: true, email: true, company: true },
        take: 10,
      }),
    ]);

    const tagsCount: Record<string, number> = {};
    tagsAgg.forEach((t: any) => {
      (t.tags || []).forEach((tag: string) => {
        if (term && !tag.toLowerCase().includes(term.toLowerCase())) return;
        tagsCount[tag] = (tagsCount[tag] || 0) + 1;
      });
    });
    const tags = Object.entries(tagsCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);

    return {
      subjects: [...new Set(subjects.map((s) => s.subject).filter(Boolean))],
      tags,
      customers: customers.map((c) => ({ id: c.id, name: `${c.firstName || ''} ${c.lastName || ''}`.trim(), email: c.email, company: c.company })),
    };
  }

  private async computeFacets(tenantId: string, where: any): Promise<TicketFacetCounts> {
    const status: Record<string, number> = {};
    const priority: Record<string, number> = {};
    const tags: Record<string, number> = {};

    const [byStatus, byPriority, recent] = await Promise.all([
      this.db.ticket.groupBy({ by: ['status'], where, _count: { status: true } }),
      this.db.ticket.groupBy({ by: ['priority'], where, _count: { priority: true } }),
      this.db.ticket.findMany({ where, select: { tags: true }, take: 500, orderBy: { updatedAt: 'desc' } }),
    ]);

    byStatus.forEach((row: any) => (status[row.status] = (row._count?.status as number) || 0));
    byPriority.forEach((row: any) => (priority[row.priority] = (row._count?.priority as number) || 0));
    recent.forEach((t: any) => (t.tags || []).forEach((tag: string) => (tags[tag] = (tags[tag] || 0) + 1)));

    return { status, priority, tags };
  }

  private parseQuery(input: string): {
    terms: string[];
    phrases: string[];
    subject: string[];
    description: string[];
    tag: string[];
    status: string[];
    priority: string[];
    email: string[];
    customer: string[];
  } {
    const terms: string[] = [];
    const phrases: string[] = [];
    const subject: string[] = [];
    const description: string[] = [];
    const tag: string[] = [];
    const status: string[] = [];
    const priority: string[] = [];
    const email: string[] = [];
    const customer: string[] = [];

    if (!input) return { terms, phrases, subject, description, tag, status, priority, email, customer };

    // extract quoted phrases
    const phraseRegex = /"([^"]+)"/g;
    let m: RegExpExecArray | null;
    const consumed: string[] = [];
    while ((m = phraseRegex.exec(input))) {
      phrases.push(m[1]);
      consumed.push(m[0]);
    }
    const withoutPhrases = consumed.reduce((acc, p) => acc.replace(p, ' '), input);

    const tokens = withoutPhrases
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => !!t && t.toLowerCase() !== 'and' && t.toLowerCase() !== 'or');

    for (const tok of tokens) {
      const [k, ...rest] = tok.split(':');
      const value = rest.join(':');
      if (!value) {
        terms.push(k);
        continue;
      }
      const key = k.toLowerCase();
      switch (key) {
        case 'subject':
          subject.push(value);
          break;
        case 'desc':
        case 'description':
          description.push(value);
          break;
        case 'tag':
        case 'tags':
          tag.push(value);
          break;
        case 'status':
          status.push(value);
          break;
        case 'priority':
          priority.push(value);
          break;
        case 'email':
          email.push(value);
          break;
        case 'customer':
          customer.push(value);
          break;
        default:
          terms.push(tok);
      }
    }

    return { terms, phrases, subject, description, tag, status, priority, email, customer };
  }

  // Saved searches
  async listSavedSearches(tenantId: string, userId: string) {
    return this.db.savedSearch.findMany({
      where: { tenantId, userId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, name: true, query: true, filters: true, semantic: true, alertsEnabled: true, updatedAt: true },
    });
  }

  async createSavedSearch(tenantId: string, userId: string, payload: { name: string; query?: string; filters?: Record<string, unknown>; semantic?: boolean; alertsEnabled?: boolean }) {
    return this.db.savedSearch.create({
      data: {
        tenantId,
        userId,
        name: payload.name,
        query: payload.query || null,
        filters: (payload.filters || null) as any,
        semantic: !!payload.semantic,
        alertsEnabled: !!payload.alertsEnabled,
      },
    });
  }

  async updateSavedSearch(tenantId: string, userId: string, id: string, payload: { name?: string; query?: string; filters?: Record<string, unknown>; semantic?: boolean; alertsEnabled?: boolean }) {
    // ensure ownership
    const existing = await this.db.savedSearch.findFirst({ where: { id, tenantId, userId } });
    if (!existing) {
      throw new Error('Saved search not found');
    }
    return this.db.savedSearch.update({
      where: { id },
      data: {
        name: payload.name ?? existing.name,
        query: payload.query ?? existing.query,
        filters: (payload.filters ?? existing.filters) as any,
        semantic: typeof payload.semantic === 'boolean' ? payload.semantic : existing.semantic,
        alertsEnabled: typeof payload.alertsEnabled === 'boolean' ? payload.alertsEnabled : existing.alertsEnabled,
      },
    });
  }

  async deleteSavedSearch(tenantId: string, userId: string, id: string) {
    // ensure ownership
    const existing = await this.db.savedSearch.findFirst({ where: { id, tenantId, userId } });
    if (!existing) {
      throw new Error('Saved search not found');
    }
    await this.db.savedSearch.delete({ where: { id } });
    return { ok: true };
  }
}


