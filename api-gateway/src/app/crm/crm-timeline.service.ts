import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import { CrmCacheService } from './crm-cache.service';

export interface TimelineEvent {
  id: string;
  type: 'message' | 'conversation' | 'ticket' | 'lead_activity' | 'deal_activity' | 'quote_activity' | 'call';
  title: string;
  description?: string;
  timestamp: Date;
  channel?: string;
  metadata?: Record<string, any>;
  entityId?: string;
  entityType?: string;
}

export interface TimelineFilters {
  types?: string[];
  channels?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

export interface TimelineResponse {
  events: TimelineEvent[];
  totalCount: number;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

@Injectable()
export class CrmTimelineService {
  private readonly logger = new Logger(CrmTimelineService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly cache: CrmCacheService
  ) {}

  async getTimeline(
    tenantId: string,
    filters: {
      customerId?: string;
      leadId?: string;
      dealId?: string;
    } & TimelineFilters
  ): Promise<TimelineResponse> {
    const { customerId, leadId, dealId, types, channels, dateFrom, dateTo, page = 1, limit = 50 } = filters;

    // Build cache key
    const cacheKey = `timeline:${tenantId}:${customerId || leadId || dealId}:${JSON.stringify({ types, channels, dateFrom, dateTo, page, limit })}`;
    
    // Try cache first
    const cached = await this.cache.get<TimelineResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const events: TimelineEvent[] = [];

    // Fetch messages
    if (!types || types.includes('message')) {
      const messages = await this.fetchMessages(tenantId, customerId, dateFrom, dateTo, channels);
      events.push(...messages);
    }

    // Fetch email deliveries (marketing/automation)
    if (!types || types.includes('message')) {
      const emails = await this.fetchEmailDeliveries(tenantId, customerId, dateFrom, dateTo);
      events.push(...emails);
    }

    // Fetch conversations
    if (!types || types.includes('conversation')) {
      const conversations = await this.fetchConversations(tenantId, customerId, dateFrom, dateTo, channels);
      events.push(...conversations);
    }

    // Fetch ticket timeline events
    if (!types || types.includes('ticket')) {
      const ticketEvents = await this.fetchTicketEvents(tenantId, customerId, leadId, dealId, dateFrom, dateTo);
      events.push(...ticketEvents);
    }

    // Fetch lead activities
    if (!types || types.includes('lead_activity')) {
      const leadActivities = await this.fetchLeadActivities(tenantId, leadId, customerId, dateFrom, dateTo);
      events.push(...leadActivities);
    }

    // Fetch deal activities
    if (!types || types.includes('deal_activity')) {
      const dealActivities = await this.fetchDealActivities(tenantId, dealId, customerId, dateFrom, dateTo);
      events.push(...dealActivities);
    }

    // Fetch quote activities
    if (!types || types.includes('quote_activity')) {
      const quoteActivities = await this.fetchQuoteActivities(tenantId, dealId, customerId, dateFrom, dateTo);
      events.push(...quoteActivities);
    }

    // Fetch calls
    if (!types || types.includes('call')) {
      const calls = await this.fetchCalls(tenantId, customerId, dateFrom, dateTo);
      events.push(...calls);
    }

    // Sort by timestamp descending
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Paginate
    const totalCount = events.length;
    const skip = (page - 1) * limit;
    const paginatedEvents = events.slice(skip, skip + limit);

    const response: TimelineResponse = {
      events: paginatedEvents,
      totalCount,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: skip + limit < totalCount,
        hasPrev: page > 1,
      },
    };

    // Cache for 2 minutes
    await this.cache.set(cacheKey, response, { ttl: 120 });

    return response;
  }

  private async fetchEmailDeliveries(
    tenantId: string,
    customerId?: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<TimelineEvent[]> {
    if (!customerId) return [];
    const customer = await this.db.customer.findUnique({ where: { id: customerId } });
    const email = (customer as any)?.email as string | undefined;
    if (!email) return [];
    const where: any = {
      tenantId,
      to: email,
    };
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }
    const deliveries = await this.db.emailDelivery.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return deliveries.map((d: any) => ({
      id: d.id,
      type: 'message' as const,
      title: 'Email',
      description: d.subject,
      timestamp: d.createdAt,
      channel: 'email',
      metadata: {
        status: d.status,
        openCount: d.openCount,
        clickCount: d.clickCount,
      },
      entityId: d.id,
      entityType: 'email',
    }));
  }

  private async fetchMessages(
    tenantId: string,
    customerId?: string,
    dateFrom?: Date,
    dateTo?: Date,
    channels?: string[]
  ): Promise<TimelineEvent[]> {
    if (!customerId) return [];

    const where: any = {
      conversation: {
        tenantId,
        customerId,
      },
    };

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const messages = await this.db.message.findMany({
      where,
      select: {
        id: true,
        content: true,
        messageType: true,
        senderType: true,
        createdAt: true,
        conversation: {
          select: {
            id: true,
            channel: {
              select: {
                type: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return messages
      .filter((m) => !channels || channels.includes(m.conversation.channel.type))
      .map((m) => ({
        id: m.id,
        type: 'message' as const,
        title: m.senderType === 'customer' ? 'Customer message' : 'Agent reply',
        description: m.content.substring(0, 200),
        timestamp: m.createdAt,
        channel: m.conversation.channel.type,
        metadata: { messageType: m.messageType, conversationId: m.conversation.id },
        entityId: m.conversation.id,
        entityType: 'conversation',
      }));
  }

  private async fetchConversations(
    tenantId: string,
    customerId?: string,
    dateFrom?: Date,
    dateTo?: Date,
    channels?: string[]
  ): Promise<TimelineEvent[]> {
    if (!customerId) return [];

    const where: any = {
      tenantId,
      customerId,
    };

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const conversations = await this.db.conversation.findMany({
      where,
      select: {
        id: true,
        subject: true,
        status: true,
        createdAt: true,
        channel: {
          select: {
            type: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return conversations
      .filter((c) => !channels || channels.includes(c.channel.type))
      .map((c) => ({
        id: c.id,
        type: 'conversation' as const,
        title: 'Conversation started',
        description: c.subject || `New ${c.channel.type} conversation`,
        timestamp: c.createdAt,
        channel: c.channel.type,
        metadata: { status: c.status },
        entityId: c.id,
        entityType: 'conversation',
      }));
  }

  private async fetchTicketEvents(
    tenantId: string,
    customerId?: string,
    leadId?: string,
    dealId?: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<TimelineEvent[]> {
    const where: any = { tenantId };

    if (customerId) {
      where.ticket = { customerId };
    } else if (leadId) {
      where.ticket = { relatedLeadId: leadId };
    } else if (dealId) {
      where.ticket = { relatedDealId: dealId };
    } else {
      return [];
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const events = await this.db.ticketTimelineEvent.findMany({
      where,
      select: {
        id: true,
        eventType: true,
        description: true,
        createdAt: true,
        ticket: {
          select: {
            id: true,
            subject: true,
            channel: {
              select: {
                type: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return events.map((e) => ({
      id: e.id,
      type: 'ticket' as const,
      title: `Ticket ${e.eventType}`,
      description: e.description || e.ticket.subject,
      timestamp: e.createdAt,
      channel: e.ticket.channel.type,
      metadata: { eventType: e.eventType, ticketId: e.ticket.id },
      entityId: e.ticket.id,
      entityType: 'ticket',
    }));
  }

  private async fetchLeadActivities(
    tenantId: string,
    leadId?: string,
    customerId?: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<TimelineEvent[]> {
    const where: any = {};

    if (leadId) {
      where.leadId = leadId;
    } else if (customerId) {
      where.lead = { tenantId, customerId };
    } else {
      return [];
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const activities = await this.db.leadActivity.findMany({
      where,
      select: {
        id: true,
        type: true,
        description: true,
        createdAt: true,
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return activities.map((a) => ({
      id: a.id,
      type: 'lead_activity' as const,
      title: a.type,
      description: a.description,
      timestamp: a.createdAt,
      metadata: { leadId: a.lead.id, leadName: `${a.lead.firstName || ''} ${a.lead.lastName || ''}`.trim() },
      entityId: a.lead.id,
      entityType: 'lead',
    }));
  }

  private async fetchDealActivities(
    tenantId: string,
    dealId?: string,
    customerId?: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<TimelineEvent[]> {
    const where: any = {};

    if (dealId) {
      where.dealId = dealId;
    } else if (customerId) {
      where.deal = { tenantId, customerId };
    } else {
      return [];
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const activities = await this.db.dealActivity.findMany({
      where,
      select: {
        id: true,
        type: true,
        description: true,
        createdAt: true,
        deal: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return activities.map((a) => ({
      id: a.id,
      type: 'deal_activity' as const,
      title: a.type,
      description: a.description,
      timestamp: a.createdAt,
      metadata: { dealId: a.deal.id, dealName: a.deal.name },
      entityId: a.deal.id,
      entityType: 'deal',
    }));
  }

  private async fetchQuoteActivities(
    tenantId: string,
    dealId?: string,
    customerId?: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<TimelineEvent[]> {
    const where: any = { tenantId };

    if (dealId) {
      where.quote = { dealId };
    } else if (customerId) {
      where.quote = { customerId };
    } else {
      return [];
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const activities = await this.db.quoteActivity.findMany({
      where,
      select: {
        id: true,
        type: true,
        description: true,
        createdAt: true,
        quote: {
          select: {
            id: true,
            quoteNumber: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return activities.map((a) => ({
      id: a.id,
      type: 'quote_activity' as const,
      title: a.type,
      description: a.description,
      timestamp: a.createdAt,
      metadata: { quoteId: a.quote.id, quoteNumber: a.quote.quoteNumber, quoteTitle: a.quote.title },
      entityId: a.quote.id,
      entityType: 'quote',
    }));
  }

  private async fetchCalls(
    tenantId: string,
    customerId?: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<TimelineEvent[]> {
    if (!customerId) return [];

    const where: any = {
      tenantId,
      participants: {
        some: {
          customerId,
        },
      },
    };

    if (dateFrom || dateTo) {
      where.startedAt = {};
      if (dateFrom) where.startedAt.gte = dateFrom;
      if (dateTo) where.startedAt.lte = dateTo;
    }

    const calls = await this.db.call.findMany({
      where,
      select: {
        id: true,
        type: true,
        status: true,
        startedAt: true,
        endedAt: true,
        direction: true,
      },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });

    return calls.map((c) => ({
      id: c.id,
      type: 'call' as const,
      title: `${c.direction || ''} ${c.type} call`,
      description: `Call ${c.status}`,
      timestamp: c.startedAt,
      metadata: { 
        status: c.status, 
        duration: c.endedAt ? Math.floor((c.endedAt.getTime() - c.startedAt.getTime()) / 1000) : null,
        direction: c.direction,
      },
      entityId: c.id,
      entityType: 'call',
    }));
  }

  async invalidateTimeline(tenantId: string, entityId: string): Promise<void> {
    await this.cache.invalidatePattern(`timeline:${tenantId}:${entityId}*`);
  }
}

