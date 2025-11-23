import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import { ConversationsGateway } from './conversations.gateway';
// Lazy import AI to satisfy linter lazy-load policy
let AIIntelligenceServiceSafe: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ai = require('@glavito/shared-ai');
  AIIntelligenceServiceSafe = ai.AIIntelligenceService;
} catch {
  AIIntelligenceServiceSafe = class OptionalAIService {};
}
import { CustomersService } from '../customers/customers.service';
import { TicketsService } from '../tickets/tickets.service';
import { EnhancedConversationOrchestratorService } from '@glavito/shared-conversation';
import { IngestMessageDto, SendMessageDto } from './dto/conversation.dto'; // Assume DTOs are there
import { NotificationsService } from '../notifications/notifications.service';
import { ApiResponse } from '@glavito/shared-types';
import { WalletService } from '../wallet/wallet.service';
import { calculateMessageCost } from '../wallet/pricing.config';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly convGateway: ConversationsGateway,
    @Optional() @Inject('AI_INTELLIGENCE_SERVICE') private readonly ai: typeof AIIntelligenceServiceSafe,
    private readonly customersService: CustomersService,
    private readonly ticketsService: TicketsService,
    private readonly orchestrator: EnhancedConversationOrchestratorService,
    @Optional() private readonly notificationsService?: NotificationsService,
    @Optional() private readonly walletService?: WalletService,
  ) {}

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

  async escalateToTicket(conversationId: string, opts: { reason?: string; priority?: string; assignAgentId?: string; tags?: string[]; tenantId?: string }) {
    const conv = await this.databaseService.conversation.findUnique({ where: { id: conversationId }, include: { channel: true } });
    if (!conv) return null as any;
    const tenantId = opts.tenantId || (conv as any).tenantId;
    // If already linked to a ticket, update it
    if ((conv as any).ticketId) {
      const updates: any = {};
      if (opts.priority) updates.priority = String(opts.priority);
      if (opts.assignAgentId) updates.assignedAgentId = String(opts.assignAgentId);
      if (opts.tags?.length) {
        try {
          const existing = await this.databaseService.ticket.findUnique({ where: { id: (conv as any).ticketId }, select: { tags: true } });
          updates.tags = Array.from(new Set([...(existing as any)?.tags || [], ...opts.tags]));
        } catch { /* noop */ }
      }
      const ticket = updates && Object.keys(updates).length
        ? await this.ticketsService.update((conv as any).ticketId as string, { ...(updates as any), tenantId } as any, tenantId)
        : await this.ticketsService.findOne((conv as any).ticketId as string, tenantId);
      try {
        await this.databaseService.ticketTimelineEvent.create({ data: { ticketId: (conv as any).ticketId, userId: null, eventType: 'escalated', description: opts.reason || 'Escalated from conversation', newValue: { conversationId } } });
      } catch { /* noop */ }
      return ticket;
    }
    // Create a new ticket from the conversation
    const lastMessages = await this.databaseService.message.findMany({ where: { conversationId }, orderBy: { createdAt: 'asc' }, select: { senderType: true, content: true } });
    const subject = (conv as any).subject || `Escalated conversation ${(conv as any).id.slice(-6)}`;
    const description = [opts.reason ? `Reason: ${opts.reason}` : null, ...lastMessages.slice(-12).map((m) => `${m.senderType}: ${m.content}`)].filter(Boolean).join('\n');
    const created = await this.ticketsService.create({
      tenantId,
      subject,
      description,
      customerId: (conv as any).customerId,
      channelId: (conv as any).channelId,
      priority: (opts.priority as any) || 'medium',
      tags: Array.from(new Set(['escalated', ...(opts.tags || [])])) as any,
      assignedAgentId: (opts.assignAgentId as any) || undefined,
    } as any);
    // Link back to conversation
    try {
      await this.databaseService.conversation.update({ where: { id: conversationId }, data: { ticketId: (created as any).id, metadata: { ...(conv as any).metadata, escalatedAt: new Date().toISOString() } as any } });
    } catch { /* noop */ }
    try {
      await this.databaseService.ticketTimelineEvent.create({ data: { ticketId: (created as any).id, userId: null, eventType: 'escalated', description: opts.reason || 'Escalated from conversation', newValue: { conversationId } } });
    } catch { /* noop */ }
    // Publish workflow event best-effort via tickets service publisher
    try {
      const pub = (this.ticketsService as any).publishSafe;
      if (typeof pub === 'function') {
        await pub.call(this.ticketsService, { eventType: 'ticket.escalated', tenantId, timestamp: new Date().toISOString(), data: { ticketId: (created as any).id, tenantId, conversationId, reason: opts.reason } });
      }
    } catch { /* noop */ }
    if (created.assignedAgentId && this.notificationsService) {
      try {
        await this.notificationsService.publishNotification(
          'ticket',
          `New ticket from conversation`,
          `Conversation escalated to ticket ${created.id}.`,
          'medium',
          created.assignedAgentId,
          { ticketId: created.id, conversationId },
          tenantId
        );
      } catch (e) {
        this.logger.warn(`Failed to notify on escalate: ${e}`);
      }
    }
    return created;
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

  async findOne(id: string, tenantId?: string) {
    // Try ConversationAdvanced first (if available)
    try {
      const adv = await (this.databaseService as any).conversationAdvanced?.findUnique?.({
        where: tenantId ? { id, tenantId } : { id }
      });
      if (adv) {
        // Convert ConversationAdvanced to Conversation-like format for compatibility
        return {
          ...adv,
          tenantId: adv.tenantId,
          customerId: adv.customerId,
          channelId: adv.channelId,
          subject: adv.subject,
          status: adv.status,
          priority: adv.priority,
          assignedAgentId: adv.assignedAgentId,
          teamId: adv.teamId,
          tags: adv.tags || [],
          metadata: adv.metadata || {},
          createdAt: adv.createdAt,
          updatedAt: adv.updatedAt,
        };
      }
    } catch {
      // Fallback to base Conversation table
    }

    // Try base Conversation table
    const conv = await this.databaseService.conversation.findUnique({ where: { id } });
    if (conv) return conv;

    // Fallback 1: if the provided id is actually a special key conv_ticket_<ticketId>, resolve by ticket
    let ticketId: string | null = null;
    if (typeof id === 'string' && id.startsWith('conv_ticket_')) {
      ticketId = id.replace('conv_ticket_', '');
    }
    
    // Fallback 2: if the provided id is actually a ticket id, auto-create a conversation for that ticket
    try {
      const ticket = await this.databaseService.ticket.findUnique({ where: { id: ticketId || id } });
      if (!ticket) return null as any;
      
      // Check if conversation already exists for this ticket
      const existingConv = await this.databaseService.conversation.findFirst({
        where: { ticketId: (ticket as any).id }
      });
      if (existingConv) return existingConv;
      
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
  }

  async findMessages(conversationId: string) {
    // Try MessageAdvanced first (includes reactions, audioUrl, audioDuration)
    try {
      const adv = await (this.databaseService as any).messageAdvanced?.findMany?.({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          content: true,
          messageType: true,
          createdAt: true,
          senderType: true,
          senderId: true,
          reactions: true,
          audioUrl: true,
          audioDuration: true,
        },
      });
      if (adv && adv.length > 0) return adv;
    } catch {
      // Fallback to base Message table
    }
    
    // Fallback to base Message table
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

  async ingestMessage(dto: IngestMessageDto, tenantId: string): Promise<any> {
    const libDto: any = { ...dto, channelMessage: { content: dto.content, type: dto.messageType || 'text' } }; // Map as needed
    const response: ApiResponse = await this.orchestrator.ingestMessage(libDto);
    const processed = response.data;
    this.orchestrator.broadcastMessageEvent('message.created', this.orchestrator.prepareMessagePayload(processed), processed.conversationId, tenantId);
    // Autopilot trigger: when enabled, request a draft (and optionally auto-send on the client)
    try {
      const cfg: any = await (this.databaseService as any).aISettings?.findUnique?.({ where: { tenantId } });
      const mode = String(cfg?.mode || 'off');
      if (mode !== 'off' && processed?.conversationId) {
        // Emit a lightweight request event; UI fetches suggestions and shows draft banner
        this.convGateway.broadcast(
          'autopilot.request',
          { event: 'autopilot.request', conversationId: processed.conversationId, mode, minConfidence: cfg?.minConfidence, allowedChannels: cfg?.allowedChannels || [] },
          tenantId,
          processed.conversationId
        );
      }

      // GLAVAI Auto-Resolve: attempt auto-resolve if enabled and customer message
      if (cfg?.autoResolveEnabled && processed?.conversationId && dto.senderType === 'customer') {
        try {
          const { GlavaiAutoResolveService } = await import('../ai/glavai-auto-resolve.service');
          const autoResolveService = new GlavaiAutoResolveService(this.databaseService);
          const autoResolveResult = await autoResolveService.attemptAutoResolve({
            tenantId,
            conversationId: processed.conversationId,
            content: dto.content,
            channelType: (processed as any)?.channel,
            customerId: (processed as any)?.customerId,
          });
          if (autoResolveResult.resolved) {
            this.logger.log(`GLAVAI auto-resolved conversation ${processed.conversationId}`);
            this.convGateway.broadcast(
              'glavai.auto_resolved',
              { conversationId: processed.conversationId, confidence: autoResolveResult.confidence },
              tenantId,
              processed.conversationId,
            );
          }
        } catch (e) {
          this.logger.debug(`GLAVAI auto-resolve skipped: ${String((e as Error)?.message || e)}`);
        }
      }

      // GLAVAI Escalation Prediction: check for escalation risk and create alert
      if (processed?.conversationId && dto.senderType === 'customer') {
        try {
          const escalationAnalysis = await (this.ai as any).analyzeContent?.({
            content: dto.content,
            context: { tenantId, conversationId: processed.conversationId },
            analysisTypes: ['escalation_prediction', 'sentiment_analysis'],
          });
          const escalation = escalationAnalysis?.results?.escalationPrediction;
          if (escalation?.shouldEscalate && escalation.escalationProbability >= 0.7) {
            const { GlavaiInsightsService } = await import('../ai/glavai-insights.service');
            const insightsService = new GlavaiInsightsService(this.databaseService);
            await insightsService.createAlert({
              tenantId,
              alertType: 'escalation_risk',
              severity: escalation.escalationProbability >= 0.9 ? 'critical' : escalation.escalationProbability >= 0.8 ? 'high' : 'medium',
              title: `Escalation risk detected in conversation`,
              description: escalation.reasoning,
              conversationId: processed.conversationId,
              customerId: (processed as any)?.customerId,
              metadata: {
                probability: escalation.escalationProbability,
                urgencyLevel: escalationAnalysis?.results?.urgencyDetection?.urgencyLevel,
              },
            });
            this.convGateway.broadcast(
              'glavai.escalation_alert',
              { conversationId: processed.conversationId, probability: escalation.escalationProbability },
              tenantId,
              processed.conversationId,
            );
          }
        } catch (e) {
          this.logger.debug(`GLAVAI escalation check skipped: ${String((e as Error)?.message || e)}`);
        }
      }
    } catch (e) {
      this.logger.debug(`autopilot trigger skipped: ${String((e as Error)?.message || e)}`);
    }
    return processed;
  }

  async sendMessage(conversationId: string, dto: SendMessageDto, tenantId: string, agentId: string): Promise<any> {
    const libSendDto: any = { ...dto }; // Map if needed
    const sendResponse: ApiResponse = await this.orchestrator.sendMessage(conversationId, libSendDto, tenantId, agentId);
    const processed = sendResponse.data; // Assume it's MessageDeliveryResult with message data
    
    // Record usage for outbound message (best-effort, don't block on failure)
    try {
      if (this.walletService) {
        // Get conversation to determine channel type
        const conversation = await this.databaseService.conversation.findUnique({
          where: { id: conversationId },
          include: { channel: true },
        });
        
        if (conversation && (conversation as any).channel) {
          const channelType = ((conversation as any).channel.type || '').toLowerCase();
          const messageType = dto.messageType || 'text';
          const hasAttachments = (dto.attachments?.length || 0) > 0;
          const messageId = (processed as any)?.messageId || (processed as any)?.id;
          
          const cost = calculateMessageCost(channelType, messageType, hasAttachments);
          
          if (cost > 0) {
            await this.walletService.recordUsage(
              tenantId,
              channelType,
              cost,
              `Outbound ${messageType} message via ${channelType}`,
              messageId,
              messageType,
            );
          }
        }
      }
    } catch (err) {
      this.logger.debug(`Failed to record usage for outbound message: ${(err as Error).message}`);
    }
    
    this.orchestrator.broadcastMessageEvent('message.created', this.orchestrator.prepareMessagePayload(processed.message || processed), conversationId, tenantId);
    if (agentId && this.notificationsService) {
      try {
        await this.notificationsService.publishNotification(
          'conversation',
          `Message sent to conversation`,
          'Your message was delivered.',
          'low',
          agentId,
          { conversationId },
          tenantId
        );
      } catch (e) {
        this.logger.warn(`Failed to notify on sendMessage: ${e}`);
      }
    }
    return processed;
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
          // Keep logic local but unused; grouping folds to apply()
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