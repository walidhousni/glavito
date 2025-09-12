import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import { ConversationsGateway } from './conversations.gateway';
import { AIIntelligenceService } from '@glavito/shared-ai';
import { CustomersService } from '../customers/customers.service';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);
  constructor(private readonly databaseService: DatabaseService, private readonly convGateway: ConversationsGateway, private readonly ai: AIIntelligenceService, private readonly customersService: CustomersService) {}

  create(createConversationDto: any) {
    return this.databaseService.conversation.create({ data: createConversationDto }).then((conv) => {
      const payload = { event: 'conversation.created', conversation: conv };
      this.convGateway.broadcast('conversation.created', payload, conv.tenantId, conv.id);
      // Best-effort rescore on new conversation
      this.rescoreLeadsForCustomer(conv.tenantId, conv.customerId).catch((e) => this.logger.warn(`rescoreLeadsForCustomer failed: ${String((e as Error)?.message || e)}`));
      this.customersService.rescoreHealth(conv.customerId, conv.tenantId).catch((e) => this.logger.warn(`rescoreHealth failed: ${String((e as Error)?.message || e)}`));
      // Best-effort: update segment memberships
      this.recalcSegmentsForCustomer(conv.tenantId, conv.customerId).catch((e) => this.logger.warn(`recalcSegmentsForCustomer failed: ${String((e as Error)?.message || e)}`));
      return conv;
    });
  }

  findAll(filters?: {
    tenantId?: string;
    ticketId?: string;
    customerId?: string;
    status?: string;
    channelType?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const where: any = {};
    if (filters?.tenantId) where.tenantId = filters.tenantId;
    if (filters?.tenantId) where.tenantId = filters.tenantId;
    if (filters?.ticketId) where.ticketId = filters.ticketId;
    if (filters?.customerId) where.customerId = filters.customerId;
    if (filters?.status) where.status = filters.status;
    if (filters?.channelType) {
      where.channel = { type: filters.channelType } as any;
    }
    if (filters?.search) {
      where.OR = [
        { subject: { contains: filters.search, mode: 'insensitive' } },
        { metadata: { path: ['tags'], array_contains: filters.search } } as any,
      ];
    }

    const page = filters?.page && filters.page > 0 ? filters.page : 1;
    const limit = filters?.limit && filters.limit > 0 && filters.limit <= 100 ? filters.limit : 20;
    const skip = (page - 1) * limit;

    return this.databaseService.conversation.findMany({
      where,
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true, company: true },
        },
        channel: {
          select: { id: true, name: true, type: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, content: true, senderType: true, messageType: true, createdAt: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
    });
  }

  findOne(id: string) {
    return this.databaseService.conversation.findUnique({ where: { id } }).then(async (conv) => {
      if (conv) return conv;
      // Fallback: if the provided id is actually a ticket id, auto-create a conversation for that ticket
      try {
        const ticket = await this.databaseService.ticket.findUnique({ where: { id } });
        if (!ticket) return null as any;
        const created = await this.databaseService.conversation.create({
          data: {
            tenantId: (ticket as any).tenantId,
            customerId: (ticket as any).customerId,
            channelId: (ticket as any).channelId,
            ticketId: (ticket as any).id,
            subject: (ticket as any).subject,
            status: 'active',
            metadata: { createdFromTicket: true },
          },
        });
        // Broadcast creation for real-time subscribers
        const payload = { event: 'conversation.created', conversation: created };
        this.convGateway.broadcast('conversation.created', payload, (created as any).tenantId, (created as any).id);
        // Best-effort rescoring and segments
        this.rescoreLeadsForCustomer((created as any).tenantId, (created as any).customerId).catch((e) => this.logger.warn(`rescoreLeadsForCustomer failed: ${String((e as Error)?.message || e)}`));
        this.customersService.rescoreHealth((created as any).customerId, (created as any).tenantId).catch((e) => this.logger.warn(`rescoreHealth failed: ${String((e as Error)?.message || e)}`));
        this.recalcSegmentsForCustomer((created as any).tenantId, (created as any).customerId).catch((e) => this.logger.warn(`recalcSegmentsForCustomer failed: ${String((e as Error)?.message || e)}`));
        return created;
      } catch {
        return null as any;
      }
    });
  }

  findMessages(conversationId: string) {
    return this.databaseService.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        content: true,
        messageType: true,
        createdAt: true,
        senderType: true,
        senderId: true,
      },
    });
  }

  update(id: string, updateConversationDto: any) {
    return this.databaseService.conversation.update({ where: { id }, data: updateConversationDto }).then((conv) => {
      const payload = { event: 'conversation.updated', conversation: conv };
      this.convGateway.broadcast('conversation.updated', payload, conv.tenantId, conv.id);
      // Best-effort rescore when conversation updates
      this.rescoreLeadsForCustomer(conv.tenantId, conv.customerId).catch((e) => this.logger.warn(`rescoreLeadsForCustomer failed: ${String((e as Error)?.message || e)}`));
      this.customersService.rescoreHealth(conv.customerId, conv.tenantId).catch((e) => this.logger.warn(`rescoreHealth failed: ${String((e as Error)?.message || e)}`));
      this.recalcSegmentsForCustomer(conv.tenantId, conv.customerId).catch((e) => this.logger.warn(`recalcSegmentsForCustomer failed: ${String((e as Error)?.message || e)}`));
      return conv;
    });
  }

  remove(id: string) {
    return this.databaseService.conversation.delete({ where: { id } }).then((conv) => {
      const payload = { event: 'conversation.deleted', conversationId: id };
      this.convGateway.broadcast('conversation.deleted', payload, conv?.tenantId, id);
      if (conv?.tenantId && (conv as any)?.customerId) {
        this.recalcSegmentsForCustomer((conv as any).tenantId, (conv as any).customerId).catch((e) => this.logger.warn(`recalcSegmentsForCustomer failed: ${String((e as Error)?.message || e)}`));
      }
      return conv;
    });
  }

  private async rescoreLeadsForCustomer(tenantId: string, customerId: string) {
    try {
      const leads = await (this.databaseService as any).lead.findMany({ where: { tenantId, customerId }, take: 20 });
      if (!Array.isArray(leads) || leads.length === 0) return;
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const interactionsLast30d = await this.databaseService.conversation.count({ where: { tenantId, customerId, updatedAt: { gte: since } } }).catch(() => 0);
      const ticketsCount = await this.databaseService.ticket.count({ where: { tenantId, customerId } }).catch(() => 0);
      for (const lead of leads) {
        const { score, factors, reasoning } = await this.ai.computeLeadScore(lead, { interactionsLast30d, ticketsCount });
        await (this.databaseService as any).lead.update({ where: { id: lead.id }, data: { score, scoreReason: { factors, reasoning } } });
      }
    } catch (e) {
      this.logger.warn(`rescoreLeadsForCustomer noop failure: ${String((e as Error)?.message || e)}`);
    }
  }

  private async recalcSegmentsForCustomer(tenantId: string, customerId: string) {
    try {
      const segments = await (this.databaseService as any).customerSegment.findMany({ where: { tenantId, isActive: true } });
      for (const seg of segments) {
        const where: any = { tenantId };
        const criteria = (seg as any).criteria || {};
        const and: any[] = [];
        const or: any[] = [];
        const apply = (cond: any) => {
          const { field, operator, value, valueTo } = cond || {};
          switch (field) {
            case 'customer.company':
              if (operator === 'contains' && typeof value === 'string') and.push({ company: { contains: value, mode: 'insensitive' } });
              if (operator === 'equals' && typeof value === 'string') and.push({ company: value });
              break;
            case 'customer.tags':
              if (operator === 'contains' && typeof value === 'string') and.push({ tags: { has: value } });
              if (operator === 'in' && Array.isArray(value)) and.push({ tags: { hasSome: value } });
              break;
            case 'customer.healthScore':
              if (operator === 'gte') and.push({ healthScore: { gte: Number(value) } });
              if (operator === 'lte') and.push({ healthScore: { lte: Number(value) } });
              if (operator === 'between') and.push({ healthScore: { gte: Number(value), lte: Number(valueTo) } });
              break;
            case 'conversation.last30d.count':
              if (operator === 'gte') and.push({ conversations: { some: { updatedAt: { gte: new Date(Date.now() - 30*24*60*60*1000) } } } });
              break;
          }
        };
        const walk = (group: any) => {
          if (!group) return;
          const logic = group.logic === 'OR' ? 'OR' : 'AND';
          const bucket = logic === 'OR' ? or : and;
          for (const c of group.conditions || []) {
            if (c && typeof c === 'object' && 'conditions' in c) {
              walk(c);
            } else {
              apply(c);
            }
          }
        };
        if (criteria && criteria.logic) walk(criteria);
        if (and.length) where.AND = and;
        if (or.length) where.OR = or;
        const matches = await this.databaseService.customer.count({ where: { ...(where as any), id: customerId } });
        const existing = await (this.databaseService as any).customerSegmentMembership.findFirst({ where: { segmentId: (seg as any).id, customerId } });
        if (matches && !existing) {
          await (this.databaseService as any).customerSegmentMembership.create({ data: { segmentId: (seg as any).id, customerId } });
        } else if (!matches && existing) {
          await (this.databaseService as any).customerSegmentMembership.delete({ where: { id: (existing as any).id } });
        }
      }
      for (const seg of await (this.databaseService as any).customerSegment.findMany({ where: { tenantId, isActive: true } })) {
        const cnt = await (this.databaseService as any).customerSegmentMembership.count({ where: { segmentId: (seg as any).id } });
        await (this.databaseService as any).customerSegment.update({ where: { id: (seg as any).id }, data: { customerCount: cnt, lastCalculated: new Date() } });
      }
    } catch (e) {
      this.logger.warn(`recalcSegmentsForCustomer noop failure: ${String((e as Error)?.message || e)}`);
    }
  }
}