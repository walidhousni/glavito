import { Injectable, NotFoundException, Inject, Optional, Logger } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import type { Ticket, CreateTicketRequest, UpdateTicketRequest, TicketFilters, PaginationParams } from '@glavito/shared-types';
import { TicketsRoutingService } from './tickets-routing.service';
import { TicketsGateway } from './tickets.gateway';
import { TicketsSearchService } from './tickets-search.service';
import { AIIntelligenceService } from '@glavito/shared-ai';
import { CustomersService } from '../customers/customers.service';
import { CustomerSatisfactionService } from '../customers/customer-satisfaction.service';
import { SLAService } from '../sla/sla.service';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly routingService: TicketsRoutingService,
    private readonly gateway: TicketsGateway,
    private readonly search: TicketsSearchService,
    private readonly ai: AIIntelligenceService,
    private readonly customersService: CustomersService,
    private readonly satisfactionService: CustomerSatisfactionService,
    private readonly slaService: SLAService,
    @Optional() @Inject('EVENT_PUBLISHER') private readonly events?: { publishTicketEvent?: (event: any) => Promise<any> },
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

    const createData: any = {
      tenantId: (createTicketDto as any).tenantId,
      subject: (createTicketDto as any).subject,
      description: (createTicketDto as any).description,
      customerId: (createTicketDto as any).customerId,
      channelId: (createTicketDto as any).channelId,
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

  async getStats(tenantId?: string) {
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
        this.getTrendsData(tenantId || ''),
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
  private async rescoreLeadsForCustomer(tenantId: string, customerId: string) {
    try {
      const leads = await (this.databaseService as any).lead.findMany({ where: { tenantId, customerId }, take: 20 });
      if (!Array.isArray(leads) || leads.length === 0) return;

      // Gather context
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const interactionsLast30d = await (this.databaseService as any).conversation.count({ where: { tenantId, customerId, updatedAt: { gte: since } } }).catch(() => 0);
      const ticketsCount = await this.databaseService.ticket.count({ where: { tenantId, customerId } }).catch(() => 0);

      for (const lead of leads) {
        const { score, factors, reasoning } = await this.ai.computeLeadScore(lead, { interactionsLast30d, ticketsCount });
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

  private async getTrendsData(tenantId: string) {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const trends = await this.databaseService.ticket.groupBy({
        by: ['status'],
        where: {
          tenantId,
          createdAt: { gte: thirtyDaysAgo }
        },
        _count: { status: true }
      });

      return trends;
    } catch (error) {
      console.error('Failed to get trends data:', error);
      return [];
    }
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

      const result = await this.ai.analyzeContent({
        content: text,
        context: { tenantId, channelType: content.channelType },
        analysisTypes: [
          'intent_classification',
          'sentiment_analysis',
          'urgency_detection',
          'language_detection',
          'knowledge_suggestions',
        ] as any,
      });

      // Persist AI analysis snapshot
      try {
        await (this.databaseService as any).ticketAIAnalysis.create({
          data: {
            ticketId,
            analysisType: 'intent,sentiment,urgency,language,knowledge',
            confidence: Number(result.confidence || 0),
            results: (result.results || {}) as any,
            suggestions: ((result.results as any)?.responseGeneration?.suggestedResponses || []) as any,
            metadata: { processingTime: result.processingTime, at: result.timestamp },
          },
        });
      } catch (_e) { /* non-fatal */ }

      // Compute suggested priority from urgency
      let suggestedPriority: string | undefined;
      const urgency = (result.results as any)?.urgencyDetection?.urgencyLevel as
        | 'low'
        | 'medium'
        | 'high'
        | 'critical'
        | undefined;
      if (urgency === 'critical' || urgency === 'high') suggestedPriority = 'urgent';
      else if (urgency === 'medium') suggestedPriority = 'medium';
      else if (urgency === 'low') suggestedPriority = 'low';

      // Extract intent as tag
      const primaryIntent = (result.results as any)?.intentClassification?.primaryIntent as string | undefined;
      const extraTags = [primaryIntent ? `ai:${primaryIntent}` : null].filter(Boolean) as string[];

      // Apply enrichment if changed
      if (suggestedPriority || extraTags.length) {
        try {
          const current = await this.databaseService.ticket.findUnique({ where: { id: ticketId }, select: { priority: true, tags: true } });
          const newPriority = suggestedPriority || (current as any).priority;
          const newTags = Array.from(new Set([...(current as any).tags || [], ...extraTags]));
          await this.databaseService.ticket.update({
            where: { id: ticketId },
            data: { priority: newPriority as any, tags: newTags as any },
          });
          // broadcast update
          try {
            await this.publishSafe({
              eventType: 'ticket.updated',
              tenantId,
              timestamp: new Date().toISOString(),
              data: { ticketId, changes: { priority: newPriority, tags: newTags } },
            });
            this.gateway.broadcast('ticket.updated', { ticketId, changes: { priority: newPriority, tags: newTags } }, tenantId);
          } catch (_e) { /* noop */ }
        } catch (_e) { /* noop */ }
      }

    } catch (error) {
      this.logger.warn(`AI analyzeAndEnrichTicket failed: ${String((error as any)?.message || error)}`);
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

      // Determine which channels to use
      const channels: ('email' | 'whatsapp')[] = [];
      
      if (satisfactionSettings.preferredChannel === 'both') {
        if (customer.email) channels.push('email');
        if (customer.phone) channels.push('whatsapp');
      } else if (satisfactionSettings.preferredChannel === 'whatsapp' && customer.phone) {
        channels.push('whatsapp');
      } else if (customer.email) {
        channels.push('email');
      }

      // Send surveys with optional delay
      const sendDelay = satisfactionSettings.delay || 0;
      
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