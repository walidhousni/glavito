import { Injectable, NotFoundException, Inject, Optional, Logger } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import type { Ticket, CreateTicketRequest, UpdateTicketRequest, TicketFilters, PaginationParams } from '@glavito/shared-types';
import { TicketsRoutingService } from './tickets-routing.service';
import { TicketsGateway } from './tickets.gateway';
import { TicketsSearchService } from './tickets-search.service';
// Lazy AI injection via module provider token
import { CustomersService } from '../customers/customers.service';
import { CustomerSatisfactionService } from '../customers/customer-satisfaction.service';
import { SLAService } from '../sla/sla.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly routingService: TicketsRoutingService,
    private readonly gateway: TicketsGateway,
    private readonly search: TicketsSearchService,
    @Inject('AI_INTELLIGENCE_SERVICE') private readonly ai: { analyzeContent: (args: any) => Promise<any> },
    private readonly customersService: CustomersService,
    private readonly satisfactionService: CustomerSatisfactionService,
    private readonly slaService: SLAService,
    @Optional() @Inject('EVENT_PUBLISHER') private readonly events?: { publishTicketEvent?: (event: any) => Promise<any> },
    @Optional() private readonly notificationsService?: NotificationsService,
  ) {}

  private async publishSafe(event: any) {
    try {
      if (this.events && typeof (this.events as any).publishTicketEvent === 'function') {
        await (this.events as any).publishTicketEvent(event);
      }
    } catch (_e) { void 0 }
  }

  async create(createTicketDto: CreateTicketRequest): Promise<Ticket> {
    // AI-augmented auto-assign suggestion with channel/language/content context
    const suggestedAgentId = await this.routingService.suggestAgent({
      tenantId: (createTicketDto as any).tenantId,
      teamId: (createTicketDto as any).teamId,
      priority: createTicketDto.priority,
      requiredSkills: (createTicketDto as any).requiredSkills || [],
      subject: (createTicketDto as any).subject,
      description: (createTicketDto as any).description,
      channelType: (createTicketDto as any).channelType,
      languageHint: (createTicketDto as any).language,
    });

    // Sanitize DTO: only allow columns that exist on Ticket
    const normalizedCustomFields = await this.validateAndNormalizeCustomFields(
      (createTicketDto as any).tenantId,
      'ticket',
      (createTicketDto as any).customFields || {},
    );

    // Ensure we have a valid channelId - find a default channel if not provided
    let channelId = (createTicketDto as any).channelId;
    if (!channelId) {
      try {
        // Find the first available channel for this tenant
        const defaultChannel = await this.databaseService.channel.findFirst({
          where: { 
            tenantId: (createTicketDto as any).tenantId,
            isActive: true 
          },
          orderBy: { createdAt: 'asc' } // Get the first created channel
        });
        if (defaultChannel) {
          channelId = defaultChannel.id;
        }
      } catch (e) {
        this.logger.warn(`Failed to find default channel for tenant ${(createTicketDto as any).tenantId}: ${String((e as any)?.message || e)}`);
      }
    }

    if (!channelId) {
      throw new Error('No channel available for ticket creation. Please ensure at least one channel is configured.');
    }

    const createData: any = {
      tenantId: (createTicketDto as any).tenantId,
      subject: (createTicketDto as any).subject,
      description: (createTicketDto as any).description,
      customerId: (createTicketDto as any).customerId,
      channelId: channelId,
      status: 'open',
      priority: (createTicketDto as any).priority || 'medium',
      tags: Array.isArray((createTicketDto as any).tags) ? (createTicketDto as any).tags : [],
      customFields: normalizedCustomFields as any,
      assignedAgentId: suggestedAgentId || (createTicketDto as any).assignedAgentId || null,
    };

    if ((createTicketDto as any).teamId) createData.teamId = (createTicketDto as any).teamId;
    if ((createTicketDto as any).dueDate) createData.dueDate = new Date((createTicketDto as any).dueDate);
    if ((createTicketDto as any).language) createData.language = String((createTicketDto as any).language);

    const ticket = await this.databaseService.ticket.create({
      data: createData,
      include: {
        customer: true,
        channel: true,
        assignedAgent: true,
      },
    });

    // Create corresponding ConversationAdvanced for the ticket
    try {
      await (this.databaseService as any).conversationAdvanced?.create?.({
        data: {
          id: `conv_ticket_${ticket.id}`,
          tenantId: ticket.tenantId,
          customerId: ticket.customerId,
          channelId: ticket.channelId,
          subject: ticket.subject || 'Ticket Conversation',
          status: 'active',
          priority: ticket.priority || 'medium',
          assignedAgentId: ticket.assignedAgentId,
          tags: ticket.tags || [],
          messageCount: 0,
          metadata: {
            ticketId: ticket.id,
            source: 'ticket',
            unreadCount: 0,
          },
        },
      });
      this.logger.debug(`[TICKET_CREATE] Created ConversationAdvanced for ticket ${ticket.id}`);
    } catch (e) {
      this.logger.warn(`Failed to create ConversationAdvanced for ticket ${ticket.id}: ${String((e as any)?.message || e)}`);
    }

    // Audit log best-effort
    try {
      await (this.databaseService as any).auditLog.create({ data: {
        tenantId: (ticket as any).tenantId,
        userId: (ticket as any).assignedAgentId || null,
        action: 'ticket.created',
        resource: 'ticket',
        resourceId: (ticket as any).id,
        newValues: { status: (ticket as any).status, priority: (ticket as any).priority }
      } })
    } catch { /* noop */ }

    // Best-effort: create SLA instance if policy applies
    try {
      const policy = await this.slaService.getPolicyByTicket((ticket as any).id);
      if (policy?.id) {
        await this.slaService.createInstance((policy as any).id, (ticket as any).id);
      }
    } catch (_e) { void 0 }

    // Publish ticket.created event
    try {
      await this.publishSafe({
        eventType: 'ticket.created',
        tenantId: (ticket as any).tenantId,
        userId: (ticket as any).assignedAgentId || undefined,
        timestamp: new Date().toISOString(),
        data: {
          ticketId: (ticket as any).id,
          tenantId: (ticket as any).tenantId,
          assignedAgentId: (ticket as any).assignedAgentId ?? null,
          status: (ticket as any).status,
          priority: (ticket as any).priority,
        },
      });
      this.gateway.broadcast('ticket.created', { ticketId: (ticket as any).id, status: (ticket as any).status }, (ticket as any).tenantId);
    } catch (_e) { void 0 }

    // Index for search (best-effort)
    try {
      await this.search.indexTicket((ticket as any).id, (ticket as any).tenantId);
    } catch (_e) { void 0 }

    // Rescore lead(s) and customer health linked to this customer (best-effort)
    try {
      if ((ticket as any).customerId) {
        await this.rescoreLeadsForCustomer((ticket as any).tenantId, (ticket as any).customerId);
        await this.customersService.rescoreHealth((ticket as any).customerId, (ticket as any).tenantId);
      }
    } catch (_e) { void 0 }

    // Perform AI triage and potentially auto-assign (async, non-blocking)
    void this.triageAndAutoAssignTicket((ticket as any).id, (ticket as any).tenantId, {
      subject: (ticket as any).subject,
      description: (ticket as any).description,
      channelType: (ticket as any).channel?.type,
      customerId: (ticket as any).customerId,
      teamId: (ticket as any).teamId,
    });

    // GLAVAI Auto-Resolve: attempt auto-resolve for routine queries
    void (async () => {
      try {
        const cfg: any = await (this.databaseService as any).aISettings?.findUnique?.({
          where: { tenantId: (ticket as any).tenantId },
        });
        if (cfg?.autoResolveEnabled && (ticket as any).description) {
          const { GlavaiAutoResolveService } = await import('../ai/glavai-auto-resolve.service');
          const autoResolveService = new GlavaiAutoResolveService(this.databaseService);
          const result = await autoResolveService.attemptAutoResolve({
            tenantId: (ticket as any).tenantId,
            ticketId: (ticket as any).id,
            conversationId: (ticket as any).conversations?.[0]?.id,
            content: `${(ticket as any).subject || ''}\n${(ticket as any).description || ''}`,
            channelType: (ticket as any).channel?.type,
            customerId: (ticket as any).customerId,
          });
          if (result.resolved) {
            this.logger.log(`GLAVAI auto-resolved ticket ${(ticket as any).id}`);
            this.gateway.broadcast(
              'glavai.auto_resolved',
              { ticketId: (ticket as any).id, confidence: result.confidence },
              (ticket as any).tenantId,
            );
          }
        }
      } catch (e) {
        this.logger.debug(`GLAVAI auto-resolve skipped: ${String((e as Error)?.message || e)}`);
      }
    })();

    return ticket as Ticket;
  }

  async findAll(
    filters: TicketFilters = {},
    pagination: PaginationParams = {},
    tenantId?: string,
  ): Promise<Ticket[]> {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = pagination || {};
    const pageNum = typeof page === 'string' ? parseInt(page as unknown as string, 10) : (page as number);
    const limitNum = typeof limit === 'string' ? parseInt(limit as unknown as string, 10) : (limit as number);
    const safePage = Number.isFinite(pageNum) && pageNum > 0 ? pageNum : 1;
    const safeLimit = Number.isFinite(limitNum) && limitNum > 0 ? Math.min(limitNum, 100) : 10;
    const skip = (safePage - 1) * safeLimit;

    const where: any = {};

    if (tenantId) {
      where.tenantId = tenantId;
    }

    if (filters.status?.length) {
      where.status = { in: filters.status };
    }

    if (filters.priority?.length) {
      where.priority = { in: filters.priority };
    }

    if (filters.assignedAgentId) {
      where.assignedAgentId = filters.assignedAgentId;
    }

    if ((filters as any).teamId) {
      (where as any).teamId = (filters as any).teamId;
    }

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.channelId) {
      where.channelId = filters.channelId;
    }

    if (filters.tags?.length) {
      where.tags = { hasSome: filters.tags };
    }

    if (filters.dateRange) {
      where.createdAt = {
        gte: filters.dateRange.from,
        lte: filters.dateRange.to,
      };
    }

    // Unassigned filter
    if ((filters as any).unassigned) {
      where.assignedAgentId = null;
    }

    // Search across subject/description and customer name/email
    if ((filters as any).search) {
      const term = String((filters as any).search);
      where.OR = [
        { subject: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        {
          customer: {
            OR: [
              { firstName: { contains: term, mode: 'insensitive' } },
              { lastName: { contains: term, mode: 'insensitive' } },
              { email: { contains: term, mode: 'insensitive' } },
              { company: { contains: term, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    // Overdue based on SLA instance due dates
    if ((filters as any).overdue) {
      const now = new Date();
      where.slaInstance = {
        status: 'active',
        OR: [
          { AND: [{ resolutionDue: { lt: now } }, { resolutionAt: null }] },
          { AND: [{ firstResponseDue: { lt: now } }, { firstResponseAt: null }] },
        ],
      } as any;
    }

    // SLA at risk (reuse private helper)
    if ((filters as any).slaAtRisk) {
      // We approximate here by filtering active SLA instances with due times within next hours
      const twoHours = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const fourHours = new Date(Date.now() + 4 * 60 * 60 * 1000);
      where.slaInstance = {
        status: 'active',
        OR: [
          { AND: [{ firstResponseDue: { lt: twoHours } }, { firstResponseAt: null }] },
          { AND: [{ resolutionDue: { lt: fourHours } }, { resolutionAt: null }] },
        ],
      } as any;
    }

    const tickets = await this.databaseService.ticket.findMany({
      where,
      skip,
      take: safeLimit,
      orderBy: { [String(sortBy || 'createdAt')]: (String(sortOrder).toLowerCase() === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc' },
      include: {
        customer: true,
        channel: true,
        assignedAgent: true,
          // expose SLA instance to the client widgets
          slaInstance: true,
        _count: { select: { conversations: true, timelineEvents: true } },
      },
    });

    return tickets as Ticket[];
  }

  async findOne(id: string, tenantId?: string): Promise<Ticket> {
    const ticket = await this.databaseService.ticket.findFirst({
      where: { id, ...(tenantId ? { tenantId } : {}) },
      include: {
        customer: true,
        channel: true,
        assignedAgent: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Best-effort: AI analyze and auto-enrich (priority, tags) asynchronously
    try {
      // fire-and-forget to avoid blocking create
      void this.analyzeAndEnrichTicket((ticket as any).id, (ticket as any).tenantId, {
        subject: (ticket as any).subject,
        description: (ticket as any).description,
        channelType: (ticket as any)?.channel?.type,
      });
    } catch (_e) { /* noop */ }

    return ticket as Ticket;
  }

  async update(id: string, updateTicketDto: UpdateTicketRequest, tenantId?: string): Promise<Ticket> {
    await this.findOne(id, tenantId); // Check if exists and tenant scoped

    const ticket = await this.databaseService.ticket.update({
      where: { id },
      data: {
        ...updateTicketDto,
        ...(updateTicketDto.customFields
          ? { customFields: (await this.validateAndNormalizeCustomFields((updateTicketDto as any).tenantId, 'ticket', updateTicketDto.customFields)) as any }
          : {}),
      },
      include: {
        customer: true,
        channel: true,
        assignedAgent: true,
      },
    });

    try {
      await (this.databaseService as any).auditLog.create({ data: {
        tenantId: (ticket as any).tenantId,
        userId: (ticket as any).assignedAgentId || null,
        action: 'ticket.updated',
        resource: 'ticket',
        resourceId: (ticket as any).id,
        newValues: updateTicketDto as any
      } })
    } catch { /* noop */ }

    // SLA events: if status transitions imply resume/pause
    try {
      if ((updateTicketDto as any)?.status === 'in_progress') {
        await this.slaService.handleTicketEvent(id, { type: 'resume', ticketId: id } as any);
      } else if ((updateTicketDto as any)?.status === 'waiting') {
        await this.slaService.handleTicketEvent(id, { type: 'pause', ticketId: id } as any);
      }
    } catch (_e) { void 0 }

    try {
      await this.publishSafe({
        eventType: 'ticket.updated',
        tenantId: (ticket as any).tenantId,
        timestamp: new Date().toISOString(),
        data: {
          ticketId: (ticket as any).id,
          tenantId: (ticket as any).tenantId,
          changes: updateTicketDto as any,
        },
      });
      this.gateway.broadcast('ticket.updated', { ticketId: (ticket as any).id, changes: updateTicketDto }, (ticket as any).tenantId);
    } catch (_e) { void 0 }

    // Reindex search
    try {
      await this.search.indexTicket((ticket as any).id, (ticket as any).tenantId);
    } catch (_e) { void 0 }

    // Rescore on updates that may reflect engagement
    try {
      if ((ticket as any).customerId) {
        await this.rescoreLeadsForCustomer((ticket as any).tenantId, (ticket as any).customerId);
        await this.customersService.rescoreHealth((ticket as any).customerId, (ticket as any).tenantId);
      }
    } catch (_e) { void 0 }

    return ticket as Ticket;
  }

  async remove(id: string, tenantId?: string): Promise<void> {
    await this.findOne(id, tenantId); // Check if exists and tenant scoped

    await this.databaseService.ticket.delete({
      where: { id },
    });
  }

  async assign(id: string, agentId: string, tenantId?: string): Promise<Ticket> {
    await this.findOne(id, tenantId);

    const ticket = await this.databaseService.ticket.update({
      where: { id },
      data: {
        assignedAgentId: agentId,
        status: 'pending',
      },
      include: {
        customer: true,
        channel: true,
        assignedAgent: true,
      },
    });
    try {
      await (this.databaseService as any).auditLog.create({ data: {
        tenantId: (ticket as any).tenantId,
        userId: agentId,
        action: 'ticket.assigned',
        resource: 'ticket',
        resourceId: (ticket as any).id,
        newValues: { assignedAgentId: agentId }
      } })
    } catch { /* noop */ }
    try {
      await this.publishSafe({
        eventType: 'ticket.assigned',
        tenantId: (ticket as any).tenantId,
        userId: agentId,
        timestamp: new Date().toISOString(),
        data: {
          ticketId: (ticket as any).id,
          tenantId: (ticket as any).tenantId,
          assignedAgentId: agentId,
          status: (ticket as any).status,
        },
      });
      this.gateway.broadcast('ticket.assigned', { ticketId: (ticket as any).id, assignedAgentId: agentId }, (ticket as any).tenantId);
    } catch (_e) { void 0 }

    // Rescore due to assignment activity
    try {
      const t = ticket as any;
      if (t.customerId) {
        await this.rescoreLeadsForCustomer(t.tenantId, t.customerId);
        await this.customersService.rescoreHealth(t.customerId, t.tenantId);
      }
    } catch (_e) { void 0 }

    if (agentId && this.notificationsService) {
      try {
        await this.notificationsService.publishNotification(
          'ticket',
          `Ticket ${id} assigned to you`,
          'New ticket assignment.',
          'high',
          String(agentId),
          { ticketId: id },
          String(tenantId || '')
        );
      } catch (e) {
        this.logger.warn(`Failed to notify agent on assign: ${e}`);
      }
    }

    return ticket as Ticket;
  }

  async autoAssign(id: string, tenantId?: string): Promise<Ticket> {
    const existing = await this.databaseService.ticket.findFirst({
      where: { id, ...(tenantId ? { tenantId } : {}) },
      select: { id: true, tenantId: true, customerId: true },
    });

    if (!existing) {
      throw new NotFoundException('Ticket not found');
    }

    const suggestedAgentId = await this.routingService.suggestAgent({
      tenantId: existing.tenantId,
      customerId: existing.customerId,
      requiredSkills: [],
    });

    const ticket = await this.databaseService.ticket.update({
      where: { id },
      data: {
        assignedAgentId: suggestedAgentId || null,
        status: suggestedAgentId ? 'pending' : 'open',
        assignedByAI: !!suggestedAgentId,
      },
      include: {
        customer: true,
        channel: true,
        assignedAgent: true,
      },
    });
    try {
      await (this.databaseService as any).auditLog.create({ data: {
        tenantId: (ticket as any).tenantId,
        userId: (ticket as any).assignedAgentId || null,
        action: 'ticket.auto_assigned',
        resource: 'ticket',
        resourceId: (ticket as any).id,
        newValues: { assignedAgentId: suggestedAgentId || null, status: (ticket as any).status }
      } })
    } catch { /* noop */ }
    try {
      await this.publishSafe({
        eventType: 'ticket.auto_assigned',
        tenantId: (ticket as any).tenantId,
        userId: suggestedAgentId || undefined,
        timestamp: new Date().toISOString(),
        data: {
          ticketId: (ticket as any).id,
          tenantId: (ticket as any).tenantId,
          assignedAgentId: suggestedAgentId || null,
          status: (ticket as any).status,
        },
      });
      this.gateway.broadcast('ticket.auto_assigned', { ticketId: (ticket as any).id, assignedAgentId: suggestedAgentId || null }, (ticket as any).tenantId);
    } catch (_e) { void 0 }

    try {
      const t = ticket as any;
      if (t.customerId) {
        await this.rescoreLeadsForCustomer(t.tenantId, t.customerId);
        await this.customersService.rescoreHealth(t.customerId, t.tenantId);
      }
    } catch (_e) { void 0 }

    return ticket as Ticket;
  }

  async resolve(id: string, tenantId?: string): Promise<Ticket> {
    await this.findOne(id, tenantId);
    const ticket = await this.databaseService.ticket.update({
      where: { id },
      data: {
        status: 'resolved',
        resolvedAt: new Date(),
      },
      include: {
        customer: true,
        channel: true,
        assignedAgent: true,
      },
    });
    try {
      await (this.databaseService as any).auditLog.create({ data: {
        tenantId: (ticket as any).tenantId,
        userId: (ticket as any).assignedAgentId || null,
        action: 'ticket.resolved',
        resource: 'ticket',
        resourceId: (ticket as any).id,
        newValues: { status: 'resolved', resolvedAt: (ticket as any).resolvedAt }
      } })
    } catch { /* noop */ }
    // SLA: mark resolution
    try { await this.slaService.handleTicketEvent(id, { type: 'resolution', ticketId: id } as any); } catch (_e) { void 0 }
    try {
      await this.publishSafe({
        eventType: 'ticket.resolved',
        tenantId: (ticket as any).tenantId,
        timestamp: new Date().toISOString(),
        data: {
          ticketId: (ticket as any).id,
          tenantId: (ticket as any).tenantId,
          status: 'resolved',
        },
      });
      this.gateway.broadcast('ticket.resolved', { ticketId: (ticket as any).id }, (ticket as any).tenantId);
    } catch {
      /* Non-fatal publish/broadcast failure */
    }

    try {
      const t = ticket as any;
      if (t.customerId) {
        await this.rescoreLeadsForCustomer(t.tenantId, t.customerId);
        await this.customersService.rescoreHealth(t.customerId, t.tenantId);
        
        // Send satisfaction survey after resolution
        await this.sendSatisfactionSurvey(t.id, t.tenantId, t.customerId);
      }
    } catch (e) {
      // best-effort
    }

    if ((ticket as any).assignedAgentId && this.notificationsService) {
      try {
        await this.notificationsService.publishNotification(
          'ticket',
          `Ticket ${id} resolved`,
          'Your ticket has been resolved.',
          'medium',
          String((ticket as any).assignedAgentId || ''),
          { ticketId: id },
          String(tenantId || '')
        );
      } catch (e) {
        this.logger.warn(`Failed to notify agent on resolve: ${e}`);
      }
    }

    return ticket as Ticket;
  }

  /**
   * Public method to run AI analysis now and persist results, optionally enriching the ticket
   */
  async analyzeNow(id: string, tenantId?: string) {
    const ticket = await this.findOne(id, tenantId);
    await this.analyzeAndEnrichTicket((ticket as any).id, (ticket as any).tenantId, {
      subject: (ticket as any).subject,
      description: (ticket as any).description,
      channelType: (ticket as any)?.channel?.type,
    });
    return this.getAIAnalysis(id, (ticket as any).tenantId);
  }

  async reopen(id: string, tenantId?: string): Promise<Ticket> {
    await this.findOne(id, tenantId);
    const ticket = await this.databaseService.ticket.update({
      where: { id },
      data: {
        status: 'open',
      },
      include: {
        customer: true,
        channel: true,
        assignedAgent: true,
      },
    });
    // SLA: resume
    try { await this.slaService.handleTicketEvent(id, { type: 'resume', ticketId: id } as any); } catch (_e) { void 0 }
    try {
      await this.publishSafe({
        eventType: 'ticket.reopened',
        tenantId: (ticket as any).tenantId,
        timestamp: new Date().toISOString(),
        data: {
          ticketId: (ticket as any).id,
          tenantId: (ticket as any).tenantId,
          status: 'open',
        },
      });
      this.gateway.broadcast('ticket.reopened', { ticketId: (ticket as any).id }, (ticket as any).tenantId);
    } catch {
      /* Non-fatal publish/broadcast failure */
    }

    try {
      const t = ticket as any;
      if (t.customerId) {
        await this.rescoreLeadsForCustomer(t.tenantId, t.customerId);
      }
    } catch (e) {
      // best-effort
    }

    return ticket as Ticket;
  }

  async snooze(id: string, until?: Date, reason?: string, tenantId?: string, userId?: string): Promise<Ticket> {
    await this.findOne(id, tenantId);
    const ticket = await this.databaseService.ticket.update({
      where: { id },
      data: { snoozedUntil: until, snoozeReason: reason || null },
      include: { customer: true, channel: true, assignedAgent: true },
    });

    // Timeline
    try {
      await this.databaseService.ticketTimelineEvent.create({
        data: {
          ticketId: id,
          userId: userId || null,
          eventType: 'snoozed',
          description: reason ? `Snoozed until ${until?.toISOString()} • ${reason}` : `Snoozed until ${until?.toISOString()}`,
          newValue: { snoozedUntil: until, snoozeReason: reason },
        },
      });
    } catch { /* noop */ }

    // Audit/event
    try {
      await (this.databaseService as any).auditLog.create({ data: {
        tenantId: (ticket as any).tenantId,
        userId: userId || (ticket as any).assignedAgentId || null,
        action: 'ticket.snoozed',
        resource: 'ticket',
        resourceId: (ticket as any).id,
        newValues: { snoozedUntil: until, snoozeReason: reason },
      } });
      await this.publishSafe({
        eventType: 'ticket.updated',
        tenantId: (ticket as any).tenantId,
        timestamp: new Date().toISOString(),
        data: { ticketId: (ticket as any).id, changes: { snoozedUntil: until, snoozeReason: reason } },
      });
      this.gateway.broadcast('ticket.snoozed', { ticketId: (ticket as any).id, snoozedUntil: until }, (ticket as any).tenantId);
    } catch { /* noop */ }

    return ticket as Ticket;
  }

  async findSimilar(id: string, tenantId: string) {
    const ticket = await this.findOne(id, tenantId);
    const termSeed = ticket.subject?.split(' ').slice(0, 3).join(' ');
    return this.databaseService.ticket.findMany({
      where: {
        tenantId,
        id: { not: id },
        OR: [
          termSeed
            ? {
                subject: {
                  contains: termSeed,
                  mode: 'insensitive',
                },
              }
            : undefined,
          {
            customerId: ticket.customerId,
            status: { in: ['resolved', 'closed'] },
          },
          {
            tags: { hasSome: ticket.tags },
          },
        ].filter(Boolean) as any,
      },
      include: {
        customer: true,
        assignedAgent: true,
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });
  }

  async addNote(id: string, content: string, userId: string, tenantId: string, isPrivate = true) {
    try {
      const note = await this.databaseService.ticketNote.create({
        data: {
          ticketId: id,
          userId,
          content,
          isPrivate
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      // Create timeline event
      await this.databaseService.ticketTimelineEvent.create({
        data: {
          ticketId: id,
          userId,
          eventType: 'note_added',
          description: `${isPrivate ? 'Private' : 'Public'} note added`,
          newValue: { noteId: note.id, isPrivate }
        }
      });

      // Ensure author is watching
      try {
        await this.databaseService.ticketWatcher.upsert({
          where: { ticketId_userId: { ticketId: id, userId } } as any,
          update: {},
          create: { ticketId: id, userId },
        });
      } catch { /* noop */ }

      // Notify watchers (best-effort)
      try {
        const watchers = await this.databaseService.ticketWatcher.findMany({ where: { ticketId: id } });
        const notifyUsers = watchers.filter((w: any) => w.userId !== userId).map((w: any) => w.userId);
        if (notifyUsers.length) {
          const payloads = notifyUsers.map((targetUserId: string) => ({
            tenantId,
            userId: targetUserId,
            type: 'ticket',
            title: 'New ticket note',
            message: 'A new note was added to a ticket you are watching',
            priority: 'low',
            metadata: { ticketId: id, noteId: note.id },
            ticketId: id,
          }));
          await this.databaseService.notification.createMany({ data: payloads as any });
        }
      } catch { /* non-fatal */ }

      try {
        await this.publishSafe({
          eventType: 'ticket.note_added',
          tenantId,
          userId,
          timestamp: new Date().toISOString(),
          data: {
            ticketId: id,
            tenantId,
            noteId: note.id,
          },
        });
        this.gateway.broadcast('ticket.note_added', { ticketId: id, noteId: note.id }, tenantId);
      } catch {
        /* Non-fatal publish/broadcast failure */
      }

      return note;
    } catch (error) {
      console.error(`Failed to add note to ticket ${id}:`, error);
      throw error;
    }
  }

  async listNotes(id: string, tenantId: string, limit = 50) {
    try {
      await this.findOne(id, tenantId);
      const notes = await this.databaseService.ticketNote.findMany({
        where: { ticketId: id, ticket: { tenantId } },
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        take: Math.min(Math.max(Number(limit) || 50, 1), 200),
      });
      return notes;
    } catch (error) {
      this.logger.warn(`Failed to list notes for ticket ${id}: ${String((error as any)?.message || error)}`);
      throw error;
    }
  }

  async listWatchers(id: string, tenantId: string) {
    try {
      await this.findOne(id, tenantId);
      return await this.databaseService.ticketWatcher.findMany({
        where: { ticketId: id, ticket: { tenantId } },
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true } } },
        orderBy: { createdAt: 'asc' },
      });
    } catch (error) {
      this.logger.warn(`Failed to list watchers for ticket ${id}: ${String((error as any)?.message || error)}`);
      throw error;
    }
  }

  async addWatcher(id: string, userId: string, tenantId: string, actorId?: string) {
    try {
      await this.findOne(id, tenantId);
      const watcher = await this.databaseService.ticketWatcher.upsert({
        where: { ticketId_userId: { ticketId: id, userId } } as any,
        update: {},
        create: { ticketId: id, userId },
      });
      try {
        await this.publishSafe({
          eventType: 'ticket.watcher_added',
          tenantId,
          userId: actorId,
          timestamp: new Date().toISOString(),
          data: { ticketId: id, watcherUserId: userId },
        });
        this.gateway.broadcast('ticket.watcher_added', { ticketId: id, watcherUserId: userId }, tenantId);
      } catch { /* noop */ }
      return watcher;
    } catch (error) {
      this.logger.warn(`Failed to add watcher for ticket ${id}: ${String((error as any)?.message || error)}`);
      throw error;
    }
  }

  async removeWatcher(id: string, userId: string, tenantId: string) {
    try {
      await this.findOne(id, tenantId);
      await this.databaseService.ticketWatcher.deleteMany({ where: { ticketId: id, userId } });
      try {
        await this.publishSafe({
          eventType: 'ticket.watcher_removed',
          tenantId,
          timestamp: new Date().toISOString(),
          data: { ticketId: id, watcherUserId: userId },
        });
        this.gateway.broadcast('ticket.watcher_removed', { ticketId: id, watcherUserId: userId }, tenantId);
      } catch { /* noop */ }
      return { success: true };
    } catch (error) {
      this.logger.warn(`Failed to remove watcher for ticket ${id}: ${String((error as any)?.message || error)}`);
      throw error;
    }
  }

  // Best-effort: ensure segments stay in sync on ticket lifecycle changes
  private async recalcSegmentsForCustomer(tenantId: string, customerId: string) {
    try {
      const segments = await (this.databaseService as any).customerSegment.findMany({ where: { tenantId, isActive: true } });
      for (const seg of segments) {
        // reuse minimal criteria mapping inline (avoid import cycles)
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
            case 'ticket.count':
              if (operator === 'gte') and.push({ tickets: { some: { createdAt: { gte: new Date(Date.now() - 365*24*60*60*1000) } } } });
              break;
          }
        };
        const walk = (group: any) => {
          if (!group) return;
          const logic = group.logic === 'OR' ? 'OR' : 'AND';
          const bucket = logic === 'OR' ? or : and;
          for (const c of group.conditions || []) {
            if (c && typeof c === 'object' && 'conditions' in c) {
              // flatten nested as AND for simplicity here
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
    } catch (_e) { /* noop */ void 0 }
  }

  async export(id: string, tenantId: string) {
    try {
      const ticket = await this.databaseService.ticket.findFirst({
        where: { id, tenantId },
        include: {
          customer: true,
          conversations: true,
          timelineEvents: true,
          aiAnalysis: true
        }
      });
      
      if (!ticket) {
        throw new NotFoundException('Ticket not found');
      }
      
      const exportData = {
        ticket: {
          id: ticket.id,
          subject: ticket.subject,
          description: ticket.description,
          status: ticket.status,
          priority: ticket.priority,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
          resolvedAt: ticket.resolvedAt,
          tags: ticket.tags,
          customFields: ticket.customFields
        },
        customer: ticket.customer,
        conversations: ticket.conversations,
        timeline: ticket.timelineEvents,
        aiAnalysis: ticket.aiAnalysis
      };

      return exportData;
    } catch (error) {
      console.error(`Failed to export ticket ${id}:`, error);
      throw error;
    }
  }

  async getTimeline(id: string, tenantId: string) {
    try {
      const timeline = await this.databaseService.ticketTimelineEvent.findMany({
        where: { ticketId: id, ticket: { tenantId } },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return timeline;
    } catch (error) {
      console.error(`Failed to get timeline for ticket ${id}:`, error);
      throw error;
    }
  }

  async getStats(tenantId?: string, daysWindow = 7) {
    try {
      const whereTenant = tenantId ? { tenantId } : {};

      const [
        total,
        byStatus,
        byPriority,
        unassigned,
        slaAtRisk,
        overdueCount,
        avgResolution,
        avgFirstResponse,
        trends,
        satisfaction
      ] = await Promise.all([
        this.databaseService.ticket.count({ where: { ...whereTenant } }),
        this.databaseService.ticket.groupBy({
          by: ['status'],
          where: { ...whereTenant },
          _count: { status: true }
        }),
        this.databaseService.ticket.groupBy({
          by: ['priority'],
          where: { ...whereTenant },
          _count: { priority: true }
        }),
        this.databaseService.ticket.count({ where: { ...whereTenant, assignedAgentId: null, status: { in: ['open', 'pending', 'in_progress', 'waiting'] } } }),
        this.getSLAAtRiskCount(tenantId || ''),
        this.getSLAOverdueCount(tenantId || ''),
        (this.databaseService.ticket as any).aggregate({
          where: { ...whereTenant, resolvedAt: { not: null } },
          _avg: { resolutionTime: true }
        }),
        (this.databaseService.ticket as any).aggregate({
          where: { ...whereTenant, firstResponseAt: { not: null } },
          _avg: { firstResponseTime: true }
        }),
        this.getTrendsData(tenantId || '', daysWindow),
        (this.databaseService as any)['customerSatisfactionSurvey']?.aggregate?.({
          where: { ...whereTenant },
          _avg: { rating: true }
        }).catch(() => ({ _avg: { rating: null } }))
      ]);

      // Satisfaction breakdown (best-effort)
      let totalResponses = 0;
      let positiveCount = 0;
      let negativeCount = 0;
      let neutralCount = 0;
      try {
        const css = (this.databaseService as any).customerSatisfactionSurvey;
        if (css?.count) {
          totalResponses = await css.count({ where: { ...whereTenant } });
          positiveCount = await css.count({ where: { ...whereTenant, rating: { gte: 4 } } });
          negativeCount = await css.count({ where: { ...whereTenant, rating: { lte: 2 } } });
          neutralCount = await css.count({ where: { ...whereTenant, rating: 3 } });
        }
      } catch {
        /* ignore if model not available */
      }

      const mapCount = (status: string) => byStatus.find((x: any) => x.status === status)?._count?.status || 0;
      const statusCounts = (byStatus || []).reduce<Record<string, number>>((acc: Record<string, number>, row: any) => {
        acc[row.status] = (row?._count?.status || 0) as number;
        return acc;
      }, {});
      const priorityCounts = (byPriority || []).reduce<Record<string, number>>((acc: Record<string, number>, row: any) => {
        acc[row.priority] = (row?._count?.priority || 0) as number;
        return acc;
      }, {});

      // Compute week trend percentage based on trends series
      let weekTrendPct = 0;
      try {
        const series = Array.isArray(trends) ? trends : [];
        if (series.length >= 2) {
          const last = series[series.length - 1]?.total || 0;
          const prev = series[series.length - 2]?.total || 0;
          if (prev > 0) weekTrendPct = ((last - prev) / prev) * 100;
        }
      } catch { /* noop */ }

      // Active agents from gateway presence
      const activeAgents = this.gateway.getActiveAgents(tenantId || '');

      return {
        total,
        open: mapCount('open'),
        inProgress: mapCount('in_progress'),
        waiting: mapCount('waiting'),
        resolved: mapCount('resolved'),
        closed: mapCount('closed'),
        statusCounts,
        priorityCounts,
        overdue: overdueCount,
        unassigned,
        slaAtRisk,
        activeAgents,
        weekTrendPct,
        averageResolutionTime: avgResolution?._avg?.resolutionTime || 0,
        averageFirstResponseTime: avgFirstResponse?._avg?.firstResponseTime || 0,
        customerSatisfactionScore: satisfaction?._avg?.rating || 0,
        satisfactionBreakdown: {
          totalResponses,
          positivePct: totalResponses ? (positiveCount / totalResponses) * 100 : 0,
          negativePct: totalResponses ? (negativeCount / totalResponses) * 100 : 0,
          neutralPct: totalResponses ? (neutralCount / totalResponses) * 100 : 0,
        },
        trendsData: trends
      };
    } catch (error) {
      console.error('Failed to compute stats:', error);
      return {
        total: 0,
        open: 0,
        inProgress: 0,
        waiting: 0,
        resolved: 0,
        closed: 0,
        statusCounts: {},
        priorityCounts: {},
        overdue: 0,
        unassigned: 0,
        slaAtRisk: 0,
        activeAgents: 0,
        weekTrendPct: 0,
        averageResolutionTime: 0,
        averageFirstResponseTime: 0,
        customerSatisfactionScore: 0,
        satisfactionBreakdown: {
          totalResponses: 0,
          positivePct: 0,
          negativePct: 0,
          neutralPct: 0,
        },
        trendsData: []
      };
    }
  }

  async getAIAnalysis(id: string, tenantId: string) {
    try {
      const analysis = await this.databaseService.ticketAIAnalysis.findFirst({
        where: { ticketId: id, ticket: { tenantId } }
      });

      return analysis;
    } catch (error) {
      console.error(`Failed to get AI analysis for ticket ${id}:`, error);
      throw error;
    }
  }

  async getRoutingSuggestions(id: string, tenantId: string, limit = 5) {
    try {
      const ticket = await this.databaseService.ticket.findFirst({
        where: { id, tenantId },
        include: {
          customer: true,
          channel: true,
        },
      });

      if (!ticket) {
        throw new NotFoundException('Ticket not found');
      }

      const suggestions = await this.routingService.getRoutingSuggestions(
        {
          tenantId,
          customerId: (ticket as any).customerId,
          teamId: (ticket as any).teamId,
          priority: (ticket as any).priority,
          subject: (ticket as any).subject,
          description: (ticket as any).description,
          channelType: (ticket as any)?.channel?.type,
          languageHint: (ticket as any).language,
        },
        limit
      );

      // Enrich with agent details
      const agentIds = suggestions.map((s) => s.agentId);
      const agents = await this.databaseService.user.findMany({
        where: { id: { in: agentIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true,
          agentProfile: {
            select: {
              skills: true,
              languages: true,
              maxConcurrentTickets: true,
            },
          },
        },
      });

      const agentMap = new Map(agents.map((a) => [a.id, a]));

      return suggestions.map((suggestion) => {
        const agent = agentMap.get(suggestion.agentId);
        return {
          ...suggestion,
          agent: agent
            ? {
                id: agent.id,
                firstName: agent.firstName,
                lastName: agent.lastName,
                email: agent.email,
                avatar: agent.avatar,
                skills: (agent.agentProfile?.skills as string[]) || [],
                languages: (agent.agentProfile?.languages as string[]) || [],
              }
            : null,
        };
      });
    } catch (error) {
      this.logger.error(`Failed to get routing suggestions for ticket ${id}: ${String(error)}`);
      throw error;
    }
  }

  async addTags(ticketId: string, tags: string[], tenantId: string) {
    try {
      const ticket = await this.databaseService.ticket.findFirst({
        where: { id: ticketId, tenantId }
      });

      if (!ticket) {
        throw new NotFoundException('Ticket not found');
      }

      const updatedTags = Array.from(new Set([...ticket.tags, ...tags]));

      return await this.databaseService.ticket.update({
        where: { id: ticketId },
        data: { tags: updatedTags }
      });
    } catch (error) {
      console.error(`Failed to add tags to ticket ${ticketId}:`, error);
      throw error;
    }
  }

  async removeTags(ticketId: string, tags: string[], tenantId: string) {
    try {
      const ticket = await this.databaseService.ticket.findFirst({
        where: { id: ticketId, tenantId }
      });

      if (!ticket) {
        throw new NotFoundException('Ticket not found');
      }

      const updatedTags = ticket.tags.filter((tag: string) => !tags.includes(tag));

      const updated = await this.databaseService.ticket.update({
        where: { id: ticketId },
        data: { tags: updatedTags }
      });
      try {
        await this.publishSafe({
          eventType: 'ticket.tags_updated',
          tenantId,
          timestamp: new Date().toISOString(),
          data: { ticketId, tenantId, tags: updatedTags },
        } as any)
      } catch { /* non-fatal */ }
      return updated
    } catch (error) {
      console.error(`Failed to remove tags from ticket ${ticketId}:`, error);
      throw error;
    }
  }

  // Helper: rescore CRM leads for a customer
  /**
   * Perform triage and auto-assign ticket based on autopilot configuration.
   * Called asynchronously after ticket creation.
   */
  private async triageAndAutoAssignTicket(
    ticketId: string,
    tenantId: string,
    context: {
      subject?: string;
      description?: string;
      channelType?: string;
      customerId?: string;
      teamId?: string;
    }
  ) {
    try {
      // Get autopilot configuration
      const autopilotConfig = await (this.databaseService as any).aISettings?.findUnique?.({
        where: { tenantId },
        select: {
          autopilotMode: true,
          minConfidence: true,
          maxAutoRepliesPerHour: true,
          allowedChannels: true,
        },
      });

      const autopilotMode = autopilotConfig?.autopilotMode || 'off';
      const minConfidence = autopilotConfig?.minConfidence || 0.7;
      const allowedChannels = autopilotConfig?.allowedChannels || [];

      // Check if triage is enabled for this channel
      if (autopilotMode === 'off') {
        this.logger.debug(`Autopilot is off for tenant ${tenantId}, skipping triage`);
        return;
      }

      if (allowedChannels.length > 0 && context.channelType && !allowedChannels.includes(context.channelType)) {
        this.logger.debug(`Channel ${context.channelType} not in allowed channels for tenant ${tenantId}`);
        return;
      }

      // Perform triage
      const triageResult = await this.analyzeAndEnrichTicket(ticketId, tenantId, {
        subject: context.subject,
        description: context.description,
        channelType: context.channelType,
      });

      if (!triageResult) {
        this.logger.debug(`Triage failed for ticket ${ticketId}`);
        return;
      }

      // Auto-assign if in auto mode and confidence is sufficient
      if (autopilotMode === 'auto' && triageResult.confidence >= minConfidence) {
        const recommendedAgentId = await this.routingService.recommendAssignment({
          tenantId,
          intent: triageResult.intent,
          category: triageResult.category,
          priority: triageResult.priority,
          urgencyLevel: triageResult.urgencyLevel,
          language: triageResult.language,
          entities: triageResult.entities,
          customerId: context.customerId,
          teamId: context.teamId,
        });

        if (recommendedAgentId) {
          // Check if ticket is not already assigned
          const current = await this.databaseService.ticket.findUnique({
            where: { id: ticketId },
            select: { assignedAgentId: true },
          });

          if (!(current as any).assignedAgentId) {
            await this.databaseService.ticket.update({
              where: { id: ticketId },
              data: {
                assignedAgentId: recommendedAgentId,
                assignedByAI: true,
              } as any,
            });

            // Publish auto-assign event
            try {
              await this.publishSafe({
                eventType: 'ticket.auto_assigned',
                tenantId,
                userId: recommendedAgentId,
                timestamp: new Date().toISOString(),
                data: {
                  ticketId,
                  assignedAgentId: recommendedAgentId,
                  confidence: triageResult.confidence,
                  intent: triageResult.intent,
                  category: triageResult.category,
                },
              });

              this.gateway.broadcast('ticket.auto_assigned', {
                ticketId,
                assignedAgentId: recommendedAgentId,
                confidence: triageResult.confidence,
              }, tenantId);
            } catch (_e) { /* noop */ }

            this.logger.log(`Auto-assigned ticket ${ticketId} to agent ${recommendedAgentId} with confidence ${triageResult.confidence}`);
          }
        }
      } else if (autopilotMode === 'draft') {
        this.logger.debug(`Draft mode: triage completed for ticket ${ticketId}, but not auto-assigning`);
      }
    } catch (error) {
      this.logger.error(`Failed to triage and auto-assign ticket ${ticketId}: ${String(error)}`);
    }
  }

  private async rescoreLeadsForCustomer(tenantId: string, customerId: string) {
    try {
      const leads = await (this.databaseService as any).lead.findMany({ where: { tenantId, customerId }, take: 20 });
      if (!Array.isArray(leads) || leads.length === 0) return;

      // Gather context
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const interactionsLast30d = await (this.databaseService as any).conversation.count({ where: { tenantId, customerId, updatedAt: { gte: since } } }).catch(() => 0);
      const ticketsCount = await this.databaseService.ticket.count({ where: { tenantId, customerId } }).catch(() => 0);

      for (const lead of leads) {
        // Best-effort: computeLeadScore may not be available on injected AI stub
        const aiAny = this.ai as unknown as { computeLeadScore?: (lead: any, ctx: any) => Promise<{ score: number; factors?: any; reasoning?: any }> };
        if (!aiAny.computeLeadScore) continue;
        const { score, factors, reasoning } = await aiAny.computeLeadScore(lead, { interactionsLast30d, ticketsCount });
        await (this.databaseService as any).lead.update({ where: { id: lead.id }, data: { score, scoreReason: { factors, reasoning } } });
      }
    } catch (err) {
      // best-effort
    }
  }

  // Private helper methods (intentionally omitted for now)

  private async getSLAAtRiskCount(tenantId: string) {
    try {
      return await this.databaseService.ticket.count({
        where: {
          tenantId,
          slaInstance: {
            status: 'active',
            OR: [
              {
                firstResponseDue: {
                  lt: new Date(Date.now() + 2 * 60 * 60 * 1000)
                },
                firstResponseAt: null
              },
              {
                resolutionDue: {
                  lt: new Date(Date.now() + 4 * 60 * 60 * 1000)
                },
                resolutionAt: null
              }
            ]
          }
        }
      });
    } catch (error) {
      console.error('Failed to get SLA at risk count:', error);
      return 0;
    }
  }

  private async getSLAOverdueCount(tenantId: string) {
    try {
      const now = new Date();
      return await this.databaseService.ticket.count({
        where: {
          tenantId,
          slaInstance: {
            status: 'active',
            OR: [
              { AND: [{ resolutionDue: { lt: now } }, { resolutionAt: null }] },
              { AND: [{ firstResponseDue: { lt: now } }, { firstResponseAt: null }] },
            ],
          } as any,
        },
      });
    } catch (error) {
      console.error('Failed to get SLA overdue count:', error);
      return 0;
    }
  }

  private async getTrendsData(tenantId: string, daysWindow = 7) {
    try {
      // Build last 7 days windows [start, end]
      const startOfDay = (d: Date) => {
        const x = new Date(d);
        x.setHours(0, 0, 0, 0);
        return x;
      };
      const endOfDay = (d: Date) => {
        const x = new Date(d);
        x.setHours(23, 59, 59, 999);
        return x;
      };

      const days: Array<{ start: Date; end: Date; label: string }> = [];
      const todayStart = startOfDay(new Date());
      const span = Math.max(1, Math.min(180, Number(daysWindow) || 7));
      for (let i = span - 1; i >= 0; i--) {
        const start = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000);
        const end = endOfDay(start);
        const label = start.toISOString().slice(0, 10);
        days.push({ start, end, label });
      }

      const series: Array<{ date: string; total: number; resolved: number; avgFirstResponseMinutes: number }> = [];

      for (const day of days) {
        const [totalCount, resolvedCount, firstRespAgg] = await Promise.all([
          this.databaseService.ticket.count({
            where: { tenantId, createdAt: { gte: day.start, lte: day.end } },
          }),
          this.databaseService.ticket.count({
            where: { tenantId, resolvedAt: { gte: day.start, lte: day.end } },
          }),
          (this.databaseService.ticket as any).aggregate({
            where: { tenantId, firstResponseAt: { gte: day.start, lte: day.end }, firstResponseTime: { not: null } },
            _avg: { firstResponseTime: true },
          }),
        ]);

        series.push({
          date: day.label,
          total: totalCount || 0,
          resolved: resolvedCount || 0,
          avgFirstResponseMinutes: (firstRespAgg?._avg?.firstResponseTime as number) || 0,
        });
      }

      return series;
    } catch (error) {
      console.error('Failed to get trends data:', error);
      return [];
    }
  }

  /**
   * Tenant-wide or agent-scoped activity feed built from timeline events and audit logs
   */
  async getActivityFeed(
    tenantId: string,
    opts?: { limit?: number; agentId?: string }
  ): Promise<Array<{ id: string; type: 'ticket' | 'agent' | 'customer' | 'system' | 'message' | 'sla'; title: string; description?: string; user: string; time: string; priority?: 'low' | 'medium' | 'high' | 'urgent'; metadata?: Record<string, unknown> }>> {
    const limit = Math.max(1, Math.min(100, opts?.limit ?? 20));
    const agentId = opts?.agentId;

    // Pull recent ticket timeline events (scoped to tenant)
    const timelineWhere: any = { ticket: { tenantId } };
    if (agentId) {
      // Scope to events on tickets assigned to this agent
      timelineWhere.ticket = { tenantId, assignedAgentId: agentId };
    }

    const [timeline, audits] = await Promise.all([
      this.databaseService.ticketTimelineEvent.findMany({
        where: timelineWhere,
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          ticket: { select: { id: true, subject: true, priority: true } },
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      }),
      (this.databaseService as any).auditLog.findMany?.({
        where: {
          tenantId,
          resource: 'ticket',
          ...(agentId ? { userId: agentId } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { id: true, userId: true, action: true, resourceId: true, createdAt: true, newValues: true },
      }).catch(() => []),
    ]);

    const toName = (u?: { firstName?: string | null; lastName?: string | null; email?: string | null }) =>
      ((u?.firstName || '') + ' ' + (u?.lastName || '')).trim() || (u?.email || 'System');

    const mapTimeline = timeline.map((e: any) => {
      const kind = String(e.eventType || '').toLowerCase();
      let type: 'ticket' | 'agent' | 'customer' | 'system' | 'message' | 'sla' = 'ticket';
      if (kind.includes('note')) type = 'message';
      else if (kind.includes('snooz') || kind.includes('sla')) type = 'sla';

      const title = (
        kind === 'note_added' ? 'Note added to ticket' :
        kind === 'snoozed' ? 'Ticket snoozed' :
        kind === 'assign' ? 'Ticket assignment change' :
        'Ticket update'
      );

      const priority = (e.ticket?.priority as 'low' | 'medium' | 'high' | 'urgent' | undefined) || undefined;

      return {
        id: `tl_${e.id}`,
        type,
        title,
        description: (e as any).description || undefined,
        user: toName(e.user as any),
        time: (e.createdAt as Date).toISOString(),
        priority,
        metadata: {
          ticketId: e.ticket?.id,
          subject: e.ticket?.subject,
        },
      };
    });

    const mapAudit = (audits as any[]).map((a: any) => {
      const act = String(a.action || '').toLowerCase();
      let type: 'ticket' | 'agent' | 'customer' | 'system' | 'message' | 'sla' = 'ticket';
      let title = 'Ticket activity';
      if (act.includes('created')) title = 'New ticket created';
      else if (act.includes('resolved')) title = 'Ticket resolved';
      else if (act.includes('updated')) title = 'Ticket updated';
      else if (act.includes('assigned')) title = 'Ticket assigned';

      return {
        id: `al_${a.id}`,
        type,
        title,
        description: undefined,
        user: 'System',
        time: (a.createdAt as Date).toISOString(),
        priority: undefined,
        metadata: {
          ticketId: a.resourceId,
          changes: a.newValues || undefined,
        },
      };
    });

    const combined = [...mapTimeline, ...mapAudit]
      .sort((x, y) => new Date(y.time).getTime() - new Date(x.time).getTime())
      .slice(0, limit);

    return combined;
  }

  /**
   * Aggregate basic stats for the current agent
   */
  async getAgentStats(tenantId: string, agentId: string) {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [assigned, open, waiting, urgent, resolvedToday] = await Promise.all([
      this.databaseService.ticket.count({ where: { tenantId, assignedAgentId: agentId } }),
      this.databaseService.ticket.count({ where: { tenantId, assignedAgentId: agentId, status: { in: ['open', 'in_progress'] } } }),
      this.databaseService.ticket.count({ where: { tenantId, assignedAgentId: agentId, status: 'waiting' } }),
      this.databaseService.ticket.count({ where: { tenantId, assignedAgentId: agentId, priority: { in: ['urgent', 'high'] } } }),
      this.databaseService.ticket.count({ where: { tenantId, assignedAgentId: agentId, status: 'resolved', createdAt: { gte: since24h } } }),
    ]);

    return { assigned, open, waiting, urgent, resolvedToday } as const;
  }

  /**
   * Analyze ticket content, store AI analysis, and enrich ticket (priority/tags) best-effort
   */
  private async analyzeAndEnrichTicket(
    ticketId: string,
    tenantId: string,
    content: { subject?: string; description?: string; channelType?: string }
  ) {
    try {
      const text = `${content.subject || ''}\n${content.description || ''}`.trim();
      if (!text) return;

      // Get customer history for better triage
      const ticket = await this.databaseService.ticket.findUnique({
        where: { id: ticketId },
        select: {
          customerId: true,
          customer: {
            select: {
              tickets: { select: { id: true } },
              createdAt: true,
            },
          },
        },
      });

      const ticketCount = ticket?.customer?.tickets?.length || 0;
      const lastInteractionDays = ticket?.customer?.createdAt
        ? Math.floor((Date.now() - new Date(ticket.customer.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        : undefined;

      // Perform comprehensive triage using new DashScope-powered method
      const triageResult = await (this.ai as any).performTriage({
        content: text,
        subject: content.subject,
        channel: content.channelType,
        customerHistory: { ticketCount, lastInteractionDays },
      });

      // Also run legacy analysis for sentiment and knowledge suggestions
      const result = await this.ai.analyzeContent({
        content: text,
        context: { tenantId, channelType: content.channelType },
        analysisTypes: [
          'sentiment_analysis',
          'knowledge_suggestions',
        ] as any,
      });

      // Persist combined AI analysis snapshot
      try {
        await (this.databaseService as any).ticketAIAnalysis.upsert({
          where: { ticketId },
          create: {
            ticketId,
            analysisType: 'triage,sentiment,knowledge',
            confidence: Number(triageResult.confidence || 0),
            results: {
              triage: triageResult,
              sentiment: (result.results as any)?.sentimentAnalysis,
              knowledge: (result.results as any)?.knowledgeSuggestions,
            } as any,
            suggestions: ((result.results as any)?.responseGeneration?.suggestedResponses || []) as any,
            metadata: { triageAt: new Date().toISOString() },
          },
          update: {
            analysisType: 'triage,sentiment,knowledge',
            confidence: Number(triageResult.confidence || 0),
            results: {
              triage: triageResult,
              sentiment: (result.results as any)?.sentimentAnalysis,
              knowledge: (result.results as any)?.knowledgeSuggestions,
            } as any,
            suggestions: ((result.results as any)?.responseGeneration?.suggestedResponses || []) as any,
            metadata: { triageAt: new Date().toISOString() },
          },
        });
      } catch (_e) {
        this.logger.warn(`Failed to persist triage analysis: ${String(_e)}`);
      }

      // Extract intent as tag
      const extraTags = [triageResult.intent ? `ai:${triageResult.intent}` : null].filter(Boolean) as string[];

      // Update ticket with triage predictions
        try {
        const current = await this.databaseService.ticket.findUnique({
          where: { id: ticketId },
          select: { priority: true, tags: true, assignedAgentId: true, language: true },
        });

        const updateData: any = {
          predictedIntent: triageResult.intent,
          predictedCategory: triageResult.category,
          predictedPriority: triageResult.priority,
          triageConfidence: triageResult.confidence,
          aiTriageAt: new Date(),
          language: triageResult.language || (current as any).language,
          tags: Array.from(new Set([...(current as any).tags || [], ...extraTags])),
        };

        // Only update priority if not already set by human or if AI confidence is high
        if (triageResult.confidence >= 0.7 && !(current as any).assignedAgentId) {
          updateData.priority = triageResult.priority;
        }

          await this.databaseService.ticket.update({
            where: { id: ticketId },
          data: updateData,
          });

        // Broadcast triage completion
        try {
          this.gateway.broadcast('ticket.triage', {
            ticketId,
            intent: triageResult.intent,
            category: triageResult.category,
            priority: triageResult.priority,
            confidence: triageResult.confidence,
          }, tenantId);
          } catch (_e) { /* noop */ }
      } catch (_e) {
        this.logger.warn(`Failed to update ticket with triage: ${String(_e)}`);
      }

      // Return triage result for potential auto-assignment
      return triageResult;
    } catch (error) {
      this.logger.warn(`AI analyzeAndEnrichTicket failed: ${String((error as any)?.message || error)}`);
      return undefined;
    }
  }

  private async validateAndNormalizeCustomFields(
    tenantId: string,
    entity: 'ticket' | 'customer' | 'lead' | 'deal',
    payload: Record<string, unknown>,
  ) {
    try {
      const defs = (await this.databaseService.customFieldDefinition.findMany({
        where: { tenantId, entity, isActive: true },
      })) as Array<{ name: string; required: boolean; readOnly?: boolean }>;
      const allowed = new Set(defs.map((d) => d.name));
      const normalized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(payload || {})) {
        if (!allowed.has(key)) continue; // drop unknown
        const def = defs.find((d) => d.name === key);
        if (!def) {
          continue;
        }
        if ((def as any).readOnly) continue;
        if (def.required && (value === null || value === undefined || value === '')) {
          continue; // drop invalid required empty; could throw instead
        }
        normalized[key] = value;
      }
      return normalized;
    } catch {
      return payload || {};
    }
  }

  /**
   * Send satisfaction survey after ticket resolution
   */
  private async sendSatisfactionSurvey(ticketId: string, tenantId: string, customerId: string) {
    try {
      // Get customer details to determine preferred channel
      const customer = await this.databaseService.customer.findUnique({
        where: { id: customerId },
        select: { email: true, phone: true, firstName: true, lastName: true },
      });

      if (!customer) {
        this.logger.warn(`Customer ${customerId} not found for satisfaction survey`);
        return;
      }

      // Get tenant settings for satisfaction surveys
      const tenant = await this.databaseService.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true },
      });

      const settings = (tenant?.settings as any) || {};
      const satisfactionSettings = settings.satisfaction || {
        enabled: true,
        autoSend: true,
        preferredChannel: 'email', // email | whatsapp | both
        delay: 0, // minutes to wait before sending
      };

      if (!satisfactionSettings.enabled || !satisfactionSettings.autoSend) {
        return;
      }

      // Dedupe: avoid sending if a survey was already created for this ticket
      try {
        const existing = await (this.databaseService as any).customerSatisfactionSurvey?.findFirst?.({
          where: { tenantId, ticketId },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        });
        if (existing?.id) {
          this.logger.debug(`Survey already exists for ticket ${ticketId}, skipping`);
          return;
        }
      } catch { /* ignore if model not available */ }

      // Preferences: respect opt-outs and quiet hours
      let preferEmail = true;
      let preferWhatsApp = true;
      let extraDelayMinutes = 0;
      try {
        const prefs = await this.customersService.getPreferences(customerId, tenantId);
        if (prefs?.marketingPreferences) {
          if (prefs.marketingPreferences.emailOptOut) preferEmail = false;
          if (prefs.marketingPreferences.whatsappOptOut) preferWhatsApp = false;
        }
        // crude quiet-hours delay: if within quiet window, delay 60 minutes
        if (prefs?.quietHours?.start && prefs?.quietHours?.end) {
          extraDelayMinutes = Math.max(extraDelayMinutes, 60);
        }
      } catch { /* best-effort */ }

      // Determine which channels to use
      const channels: ('email' | 'whatsapp')[] = [];
      
      if (satisfactionSettings.preferredChannel === 'both') {
        if (customer.email && preferEmail) channels.push('email');
        if (customer.phone && preferWhatsApp) channels.push('whatsapp');
      } else if (satisfactionSettings.preferredChannel === 'whatsapp' && customer.phone && preferWhatsApp) {
        channels.push('whatsapp');
      } else if (customer.email && preferEmail) {
        channels.push('email');
      }

      // Send surveys with optional delay
      const sendDelay = (satisfactionSettings.delay || 0) + (extraDelayMinutes || 0);
      
      for (const channel of channels) {
        setTimeout(async () => {
          try {
            const surveyRequest = {
              tenantId,
              customerId,
              ticketId,
              channel,
              surveyType: 'post_resolution' as const,
              metadata: {
                ticketId,
                resolvedAt: new Date().toISOString(),
                autoSent: true,
              },
            };

            if (channel === 'email') {
              await this.satisfactionService.sendEmailSurvey(surveyRequest);
              this.logger.log(`Email satisfaction survey sent for ticket ${ticketId}`);
            } else if (channel === 'whatsapp') {
              await this.satisfactionService.sendWhatsAppFlowSurvey(surveyRequest);
              this.logger.log(`WhatsApp satisfaction survey sent for ticket ${ticketId}`);
            }
          } catch (error) {
            this.logger.error(`Failed to send ${channel} satisfaction survey for ticket ${ticketId}:`, error);
          }
        }, sendDelay * 60 * 1000);
      }
    } catch (error) {
      this.logger.error(`Failed to process satisfaction survey for ticket ${ticketId}:`, error);
    }
  }

}