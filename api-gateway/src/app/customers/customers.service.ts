import { Injectable, Inject, Optional } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import { WorkflowService } from '@glavito/shared-workflow';

@Injectable()
export class CustomersService {
  constructor(
    private readonly databaseService: DatabaseService,
    @Optional() @Inject('AI_INTELLIGENCE_SERVICE') private readonly ai?: { computeCustomerHealth?: (args: { tenantId: string; customerId: string }) => Promise<{ healthScore: number; churnRisk: number; factors: any; reasoning: any }> },
    @Optional() private readonly workflow?: WorkflowService,
    @Optional() @Inject('EVENT_PUBLISHER') private readonly eventPublisher?: { publishWorkflowEvent?: (e: any) => Promise<void> }
  ) {}

  create(createCustomerDto: Record<string, unknown>) {
    return (async () => {
      const normalized = await this.validateAndNormalizeCustomFields((createCustomerDto as any)?.tenantId as string, 'customer', (createCustomerDto as any)?.customFields || {});
      const data: any = { ...(createCustomerDto as any), customFields: normalized as any };
      const cust = await (this.databaseService as any).customer.create({ data });
      // Audit log best-effort
      try {
        await (this.databaseService as any).auditLog.create({ data: {
          tenantId: (cust as any).tenantId,
          userId: (createCustomerDto as any)?.userId || null,
          action: 'customer.created',
          resource: 'customer',
          resourceId: (cust as any).id,
          newValues: { id: (cust as any).id, email: (cust as any).email },
        } });
      } catch { /* noop */ }
      // Best-effort: update segment memberships for this customer
      try {
        await this.recalcSegmentsForCustomer((cust as any).tenantId, (cust as any).id);
      } catch { /* noop */ void 0 }
      return cust;
    })();
  }

  findAll(tenantId?: string, q?: string) {
    return this.databaseService.customer.findMany({
      where: {
        ...(tenantId ? { tenantId } : {}),
        ...(q
          ? {
              OR: [
                { firstName: { contains: q, mode: 'insensitive' } },
                { lastName: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
                { company: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      take: 50,
      orderBy: { updatedAt: 'desc' },
    });
  }

  // --- Preferences & Consent ---
  async getPreferences(id: string, tenantId?: string) {
    const customer = await this.databaseService.customer.findFirst({ where: { id, ...(tenantId ? { tenantId } : {}) }, select: { id: true, tenantId: true, customFields: true } })
    if (!customer) return null
    const cf = ((customer as any).customFields || {}) as Record<string, unknown>
    const marketing = (cf.marketingPreferences || {}) as { whatsappOptOut?: boolean; emailOptOut?: boolean; smsOptOut?: boolean }
    const quietHours = (cf.quietHours || {}) as { start?: string; end?: string; timezone?: string }
    const language = (cf.language || 'en') as string
    return { marketingPreferences: marketing, quietHours, language }
  }

  async updatePreferences(
    id: string,
    tenantId: string | undefined,
    payload: { marketingPreferences?: { whatsappOptOut?: boolean; emailOptOut?: boolean; smsOptOut?: boolean }; quietHours?: { start?: string; end?: string; timezone?: string }; language?: string }
  ) {
    const existing = await this.databaseService.customer.findFirst({ where: { id, ...(tenantId ? { tenantId } : {}) }, select: { id: true, tenantId: true, customFields: true } })
    if (!existing) return null
    const cf = ((existing as any).customFields || {}) as Record<string, unknown>
    const newCf = {
      ...cf,
      ...(payload.marketingPreferences ? { marketingPreferences: { ...(cf as any).marketingPreferences, ...payload.marketingPreferences } } : {}),
      ...(payload.quietHours ? { quietHours: { ...(cf as any).quietHours, ...payload.quietHours } } : {}),
      ...(payload.language ? { language: payload.language } : {}),
    }
    const updated = await this.databaseService.customer.update({ where: { id }, data: { customFields: newCf as any } })
    // Best-effort audit log
    try {
      await (this.databaseService as any).auditLog.create({ data: {
        tenantId: (updated as any).tenantId,
        userId: null,
        action: 'customer.preferences.updated',
        resource: 'customer',
        resourceId: id,
        newValues: { marketingPreferences: payload.marketingPreferences, quietHours: payload.quietHours, language: payload.language },
      } })
    } catch { /* noop */ }
    return updated
  }

  async listConsentLogs(id: string, tenantId?: string) {
    try {
      const logs = await (this.databaseService as any).auditLog.findMany?.({
        where: { tenantId, resource: 'customer', resourceId: id, action: { in: ['customer.consent.updated','customer.preferences.updated'] } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
      return logs || []
    } catch {
      return []
    }
  }

  async appendConsent(id: string, tenantId: string | undefined, body: { channel?: 'whatsapp'|'email'|'sms'|'web'; consent: boolean; reason?: string }) {
    const existing = await this.databaseService.customer.findFirst({ where: { id, ...(tenantId ? { tenantId } : {}) }, select: { id: true, tenantId: true, customFields: true } })
    if (!existing) return null
    const cf = ((existing as any).customFields || {}) as Record<string, any>
    const now = new Date().toISOString()
    const consentEvent = { channel: body.channel || 'web', consent: !!body.consent, reason: body.reason || null, timestamp: now }
    const prevLog: any[] = Array.isArray((cf as any).consentLog) ? (cf as any).consentLog : []
    const newCf = { ...cf, consentLog: [consentEvent, ...prevLog].slice(0, 100) }
    const updated = await this.databaseService.customer.update({ where: { id }, data: { customFields: newCf as any } })
    try {
      await (this.databaseService as any).auditLog.create({ data: {
        tenantId: (updated as any).tenantId,
        userId: null,
        action: 'customer.consent.updated',
        resource: 'customer',
        resourceId: id,
        newValues: consentEvent,
      } })
    } catch { /* noop */ }
    return updated
  }

  findOne(id: string, tenantId?: string) {
    return this.databaseService.customer.findFirst({ where: { id, ...(tenantId ? { tenantId } : {}) } });
  }

  update(id: string, updateCustomerDto: Record<string, unknown>) {
    return (async () => {
      const tenantId = (updateCustomerDto as any)?.tenantId;
      const data: any = { ...updateCustomerDto };
      if (data.customFields) {
        data.customFields = await this.validateAndNormalizeCustomFields(tenantId, 'customer', data.customFields);
      }
      const cust = await this.databaseService.customer.update({ where: { id }, data });
      try {
        await (this.databaseService as any).auditLog.create({ data: {
          tenantId: tenantId || (cust as any).tenantId,
          userId: (updateCustomerDto as any)?.userId || null,
          action: 'customer.updated',
          resource: 'customer',
          resourceId: id,
          newValues: data,
        } });
      } catch { /* noop */ }
      // Best-effort: update segment memberships if attributes changed
      try {
        await this.recalcSegmentsForCustomer((cust as any).tenantId, (cust as any).id);
      } catch { /* noop */ void 0 }
      return cust;
    })();
  }

  remove(id: string) {
    return (async () => {
      const existing = await this.databaseService.customer.findUnique({ where: { id } })
      const deleted = await this.databaseService.customer.delete({ where: { id } });
      try {
        await (this.databaseService as any).auditLog.create({ data: {
          tenantId: (existing as any)?.tenantId || (deleted as any)?.tenantId,
          userId: null,
          action: 'customer.deleted',
          resource: 'customer',
          resourceId: id,
          oldValues: { id },
        } });
      } catch { /* noop */ }
      return deleted
    })();
  }

  // --- Data Subject Rights (Export/Erase) ---
  async exportDSR(id: string, tenantId: string) {
    const customer = await this.databaseService.customer.findFirst({ where: { id, tenantId }, include: {
      tickets: { include: { conversations: true, timelineEvents: true, aiAnalysis: true } },
      leads: true,
      deals: true,
      conversations: { include: { messages: true, calls: true } },
      satisfactionSurveys: true,
      segmentMemberships: { include: { segment: true } },
      paymentIntents: true,
      paymentMethods: true,
      knowledgeArticleEvents: true,
    } as any });
    return { customer };
  }

  async eraseDSR(id: string, tenantId: string) {
    // Best-effort pseudonymization/deletion: cascade delete on foreign keys already set where applicable
    await this.databaseService.$transaction([
      // Delete memberships and analytics that reference customer
      (this.databaseService as any).customerSegmentMembership.deleteMany({ where: { customerId: id } }),
      (this.databaseService as any).customerSatisfactionSurvey.deleteMany?.({ where: { customerId: id } }).catch(() => undefined),
      this.databaseService.paymentMethod.updateMany({ where: { customerId: id }, data: { metadata: {} } }),
      this.databaseService.paymentIntent.updateMany({ where: { customerId: id }, data: { receiptEmail: null, metadata: {} } }),
    ]);

    // Finally delete the customer record
    return this.databaseService.customer.delete({ where: { id } });
  }

  async rescoreHealth(id: string, tenantId: string) {
    const existing = await this.databaseService.customer.findFirst({ where: { id, tenantId } });
    if (!existing) return null;
    if (!this.ai?.computeCustomerHealth) return null;
    const { healthScore, churnRisk, factors, reasoning } = await this.ai.computeCustomerHealth({ tenantId, customerId: id });
    return (this.databaseService.customer.update as any)({ where: { id }, data: { healthScore, churnRisk, healthReasons: { factors, reasoning } } });
  }

  // --- Orders (for 360) ---
  async getRecentOrders(customerId: string, tenantId: string, limit = 10) {
    try {
      const deals = await (this.databaseService as any)['deal']?.findMany?.({
        where: { tenantId, customerId },
        take: Math.min(Math.max(Number(limit) || 10, 1), 50),
        orderBy: { createdAt: 'desc' }
      })
      return (deals || []).map((d: any) => ({
        id: String(d.id),
        total: Number(((d.customFields as any)?.total) ?? ((d.metadata as any)?.total) ?? d.value ?? 0),
        currency: ((d.customFields as any)?.currency) || ((d.metadata as any)?.currency) || d.currency || 'USD',
        status: (String(d.stage || '').toUpperCase() === 'WON') ? 'fulfilled' : (String(d.stage || '').toUpperCase() === 'LOST') ? 'canceled' : 'processing',
        createdAt: (d.createdAt as Date)?.toISOString?.() || new Date().toISOString(),
        items: Array.isArray((d.customFields as any)?.items) ? (d.customFields as any).items : (Array.isArray((d.metadata as any)?.items) ? (d.metadata as any).items : [])
      }))
    } catch {
      return []
    }
  }

  // --- Customer Activity Feed (360) ---
  async getActivitiesForCustomer(
    customerId: string,
    tenantId: string,
    opts?: { limit?: number; since?: string | Date; types?: Array<'conversation'|'message'|'ticket'|'sla'|'note'|'csat'|'call'|'order'|'consent'> }
  ): Promise<Array<{ id: string; type: 'conversation'|'message'|'ticket'|'sla'|'note'|'csat'|'call'|'order'|'consent'; subject?: string; status?: string; channel?: { id: string; type?: string; name?: string } | string; timestamp: string; metadata?: Record<string, unknown> }>> {
    const limit = Math.max(1, Math.min(200, Number(opts?.limit || 50)));
    const since = opts?.since ? new Date(opts.since) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const typeFilter = Array.isArray(opts?.types) && opts?.types?.length ? new Set(opts.types) : undefined;

    const events: Array<{ id: string; type: 'conversation'|'message'|'ticket'|'sla'|'note'|'csat'|'call'|'order'|'consent'; subject?: string; status?: string; channel?: { id: string; type?: string; name?: string } | string; timestamp: string; metadata?: Record<string, unknown> }> = [];

    // Tickets timeline events
    try {
      const timeline = await this.databaseService.ticketTimelineEvent.findMany({
        where: { createdAt: { gte: since }, ticket: { tenantId, customerId } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          ticket: { select: { id: true, subject: true, status: true, priority: true, channelId: true, channel: { select: { id: true, type: true, name: true } } } },
          user: { select: { id: true, firstName: true, lastName: true, email: true } }
        }
      });
      for (const t of timeline as Array<any>) {
        const kind = String(t.eventType || '').toLowerCase();
        const evType: 'ticket' | 'sla' | 'message' = kind.includes('sla') ? 'sla' : (kind.includes('note') ? 'message' : 'ticket');
        events.push({
          id: `tl_${t.id}`,
          type: evType,
          subject: t.ticket?.subject || 'Ticket activity',
          status: String(t.eventType || t.ticket?.status || ''),
          channel: t.ticket?.channel ? { id: String(t.ticket.channel.id), type: (t.ticket.channel as any).type, name: (t.ticket.channel as any).name } : undefined,
          timestamp: (t.createdAt as Date)?.toISOString?.() || new Date().toISOString(),
          metadata: { ticketId: t.ticket?.id }
        });
      }
    } catch { /* best-effort */ }

    // Email deliveries (marketing/automation)
    try {
      const customer = await this.databaseService.customer.findUnique({ where: { id: customerId }, select: { email: true } });
      const email = (customer as any)?.email as string | undefined;
      if (email) {
        const emails = await this.databaseService.emailDelivery.findMany({
          where: { tenantId, to: email, createdAt: { gte: since } },
          orderBy: { createdAt: 'desc' },
          take: limit,
        }).catch(() => [] as any[]);
        for (const d of emails as Array<any>) {
          events.push({
            id: `em_${d.id}`,
            type: 'message',
            subject: d.subject || 'Email',
            channel: 'email',
            status: d.status,
            timestamp: (d.createdAt as Date)?.toISOString?.() || new Date().toISOString(),
            metadata: { openCount: d.openCount, clickCount: d.clickCount },
          });
        }
      }
    } catch { /* best-effort */ }

    // Campaign deliveries (all channels)
    try {
      const deliveries = await (this.databaseService as any).campaignDelivery.findMany?.({
        where: { tenantId, customerId, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { id: true, channel: true, status: true, sentAt: true, openedAt: true, clickedAt: true, campaignId: true }
      }).catch?.(() => []) || [];
      for (const d of deliveries as Array<any>) {
        events.push({
          id: `cd_${d.id}`,
          type: 'message',
          subject: 'Campaign delivery',
          channel: String(d.channel || ''),
          status: d.status,
          timestamp: (d.sentAt as Date)?.toISOString?.() || (d.createdAt as Date)?.toISOString?.() || new Date().toISOString(),
          metadata: { campaignId: d.campaignId, openedAt: d.openedAt, clickedAt: d.clickedAt },
        });
      }
    } catch { /* best-effort */ }

    // Campaign conversions (requires link to delivery)
    try {
      const myDeliveries = await (this.databaseService as any).campaignDelivery.findMany?.({
        where: { tenantId, customerId, createdAt: { gte: since } },
        select: { id: true }
      }).catch?.(() => []) || [];
      const deliveryIds = myDeliveries.map((d: any) => d.id);
      if (deliveryIds.length) {
        const conversions = await (this.databaseService as any).campaignConversion.findMany?.({
          where: { tenantId, deliveryId: { in: deliveryIds } },
          orderBy: { occurredAt: 'desc' },
          take: limit,
        }).catch?.(() => []) || [];
        for (const c of conversions as Array<any>) {
          events.push({
            id: `conv_${c.id}`,
            type: 'order',
            subject: 'Conversion',
            status: 'purchased',
            timestamp: (c.occurredAt as Date)?.toISOString?.() || new Date().toISOString(),
            metadata: { campaignId: c.campaignId, amount: c.amount, currency: c.currency, channel: c.channel, source: c.source },
          });
        }
      }
    } catch { /* best-effort */ }

    // Ticket notes
    try {
      const notes = await this.databaseService.ticketNote.findMany({
        where: { createdAt: { gte: since }, ticket: { tenantId, customerId } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { ticket: { select: { id: true, subject: true } }, user: { select: { id: true, firstName: true, lastName: true } } }
      });
      for (const n of notes as Array<any>) {
        events.push({
          id: `tn_${n.id}`,
          type: 'note',
          subject: n.ticket?.subject || 'Ticket note',
          status: 'note_added',
          timestamp: (n.createdAt as Date)?.toISOString?.() || new Date().toISOString(),
          metadata: { ticketId: n.ticket?.id }
        });
      }
    } catch { /* best-effort */ }

    // Conversation messages (advanced)
    try {
      const msgs = await (this.databaseService as any).messageAdvanced?.findMany?.({
        where: { tenantId, customerId, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { id: true, conversationId: true, channelId: true, createdAt: true, messageType: true }
      }).catch?.(() => []) || [];
      for (const m of msgs as Array<any>) {
        let ch: any = undefined;
        try {
          ch = await this.databaseService.channel.findFirst({ where: { id: m.channelId }, select: { id: true, type: true, name: true } });
        } catch { /* noop */ }
        events.push({
          id: `msg_${m.id}`,
          type: 'message',
          subject: String(m.messageType || 'message'),
          channel: ch ? { id: String(ch.id), type: ch.type, name: ch.name } : undefined,
          timestamp: (m.createdAt as Date)?.toISOString?.() || new Date().toISOString(),
          metadata: { conversationId: m.conversationId }
        });
      }
    } catch { /* best-effort */ }

    // Conversation event logs
    try {
      const evs = await (this.databaseService as any).conversationEventLog?.findMany?.({
        where: { tenantId, customerId, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { id: true, type: true, createdAt: true, conversationId: true }
      }).catch?.(() => []) || [];
      for (const e of evs as Array<any>) {
        events.push({
          id: `cev_${e.id}`,
          type: 'conversation',
          subject: String(e.type || 'Conversation event'),
          timestamp: (e.createdAt as Date)?.toISOString?.() || new Date().toISOString(),
          metadata: { conversationId: e.conversationId }
        });
      }
    } catch { /* best-effort */ }

    // Conversation notes
    try {
      const cnotes = await (this.databaseService as any).conversationNote?.findMany?.({
        where: { tenantId, customerId, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { id: true, createdAt: true, conversationId: true }
      }).catch?.(() => []) || [];
      for (const cn of cnotes as Array<any>) {
        events.push({
          id: `cn_${cn.id}`,
          type: 'note',
          subject: 'Conversation note',
          timestamp: (cn.createdAt as Date)?.toISOString?.() || new Date().toISOString(),
          metadata: { conversationId: cn.conversationId }
        });
      }
    } catch { /* best-effort */ }

    // Calls
    try {
      const calls = await this.databaseService.call.findMany({
        where: {
          tenantId,
          OR: [
            { conversation: { customerId } },
            // best-effort JSON metadata check omitted for portability
          ],
          createdAt: { gte: since }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { id: true, type: true, status: true, createdAt: true, conversationId: true }
      }).catch(() => [] as any[]);
      for (const c of calls as Array<any>) {
        events.push({
          id: `call_${c.id}`,
          type: 'call',
          subject: String(c.type || 'call'),
          status: String(c.status || ''),
          timestamp: (c.createdAt as Date)?.toISOString?.() || new Date().toISOString(),
          metadata: { conversationId: c.conversationId }
        });
      }
    } catch { /* best-effort */ }

    // CSAT
    try {
      const csats = await (this.databaseService as any).customerSatisfactionSurvey?.findMany?.({
        where: { tenantId, customerId, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { id: true, rating: true, channel: true, createdAt: true, ticketId: true }
      }).catch?.(() => []) || [];
      for (const s of csats as Array<any>) {
        events.push({
          id: `csat_${s.id}`,
          type: 'csat',
          subject: `CSAT rating ${Number(s.rating || 0)}/5`,
          channel: String(s.channel || ''),
          timestamp: (s.createdAt as Date)?.toISOString?.() || new Date().toISOString(),
          metadata: { ticketId: s.ticketId }
        });
      }
    } catch { /* best-effort */ }

    // Consent / preferences (audit logs)
    try {
      const logs = await (this.databaseService as any).auditLog?.findMany?.({
        where: { tenantId, resource: 'customer', resourceId: customerId, action: { in: ['customer.consent.updated','customer.preferences.updated'] }, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { id: true, action: true, createdAt: true, newValues: true }
      }).catch?.(() => []) || [];
      for (const a of logs as Array<any>) {
        events.push({
          id: `consent_${a.id}`,
          type: 'consent',
          subject: String(a.action || 'Consent update'),
          timestamp: (a.createdAt as Date)?.toISOString?.() || new Date().toISOString(),
          metadata: a.newValues || {}
        });
      }
    } catch { /* best-effort */ }

    // Orders (best-effort)
    try {
      const orders = await this.getRecentOrders(customerId, tenantId, Math.min(10, limit));
      for (const o of orders as Array<any>) {
        events.push({
          id: `ord_${o.id}`,
          type: 'order',
          subject: 'Order',
          status: String(o.status || ''),
          timestamp: String(o.createdAt || new Date().toISOString()),
          metadata: { total: o.total, currency: o.currency }
        });
      }
    } catch { /* best-effort */ }

    // Apply filters, sort, limit
    const filtered = (typeFilter ? events.filter(e => typeFilter.has(e.type)) : events)
      .filter(e => {
        const ts = new Date(e.timestamp).getTime();
        return ts >= since.getTime();
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    return filtered;
  }

  async createOrderForCustomer(customerId: string, tenantId: string, payload: { items: Array<{ sku: string; quantity: number; unitPrice: number; currency?: string }>; notes?: string }) {
    const items = Array.isArray(payload?.items) ? payload.items : []
    const subtotal = items.reduce((s, it) => s + Number(it.quantity || 0) * Number(it.unitPrice || 0), 0)
    const total = subtotal
    const currency = items[0]?.currency || 'USD'

    // Ensure there is a sales pipeline to attach the deal/order to
    let pipeline = await (this.databaseService as any).salesPipeline.findFirst({ where: { tenantId, isActive: true }, orderBy: { createdAt: 'asc' } }).catch(() => null)
    if (!pipeline) {
      try {
        pipeline = await (this.databaseService as any).salesPipeline.create({
          data: {
            tenantId,
            name: 'Default Pipeline',
            description: 'Auto-created by order flow',
            stages: { stages: [
              { id: 'new', name: 'New' },
              { id: 'qualified', name: 'Qualified' },
              { id: 'proposal', name: 'Proposal' },
              { id: 'negotiation', name: 'Negotiation' },
              { id: 'won', name: 'Won' },
              { id: 'lost', name: 'Lost' },
            ]},
            isDefault: true,
            isActive: true,
          }
        })
      } catch { /* noop */ }
    }

    const name = `Order ${new Date().toISOString().slice(0, 10)} #${Math.floor(Math.random() * 10000)}`
    const created = await (this.databaseService as any)['deal']?.create?.({
      data: {
        tenantId,
        customerId,
        name,
        description: payload?.notes || 'Order created from customer profile',
        value: total,
        currency,
        probability: 60,
        stage: 'PROPOSAL',
        pipelineId: pipeline?.id,
        tags: ['order'],
        customFields: { items, subtotal, total, currency, notes: payload?.notes },
      }
    })
    // Fire workflow + event bus (best-effort)
    const orderId = String((created as any)?.id)
    try {
      await this.workflow?.executeWorkflowByTrigger('event', {
        eventType: 'order.created',
        tenantId,
        customerId,
        orderId,
        total,
        currency,
        items,
        timestamp: new Date().toISOString(),
      })
    } catch { /* noop */ }
    try {
      await (this.eventPublisher as any)?.publishWorkflowEvent?.({
        eventType: 'order.created',
        tenantId,
        timestamp: new Date().toISOString(),
        data: { tenantId, customerId, orderId, total, currency, items }
      })
    } catch { /* noop */ }
    return { id: orderId, total, currency }
  }

  // --- Segment membership helpers (scoped to a single customer) ---
  private buildCustomerWhereFromCriteria(tenantId: string, criteria: any): any {
    const where: any = { tenantId };
    const and: any[] = [];
    const or: any[] = [];
    const applyCondition = (cond: any) => {
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
        case 'deal.totalValue':
          if (operator === 'gte') and.push({ deals: { some: { value: { gte: Number(value) } } } });
          if (operator === 'lte') and.push({ deals: { some: { value: { lte: Number(value) } } } });
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
          const nested = this.buildCustomerWhereFromCriteria(tenantId, c);
          if (nested && (nested.AND || nested.OR)) bucket.push(nested);
        } else {
          applyCondition(c);
        }
      }
    };
    if (criteria && criteria.logic) {
      walk(criteria);
    }
    if (and.length) where.AND = and;
    if (or.length) where.OR = or;
    return where;
  }

  private async recalcSegmentsForCustomer(tenantId: string, customerId: string) {
    try {
      const segments = await (this.databaseService as any).customerSegment.findMany({ where: { tenantId, isActive: true } });
      for (const seg of segments) {
        const where = this.buildCustomerWhereFromCriteria(tenantId, (seg as any).criteria || {});
        const matches = await this.databaseService.customer.count({ where: { ...(where as any), id: customerId } });
        const existing = await (this.databaseService as any).customerSegmentMembership.findFirst({ where: { segmentId: (seg as any).id, customerId } });
        if (matches && !existing) {
          await (this.databaseService as any).customerSegmentMembership.create({ data: { segmentId: (seg as any).id, customerId } });
        } else if (!matches && existing) {
          await (this.databaseService as any).customerSegmentMembership.delete({ where: { id: (existing as any).id } });
        }
      }
      // Optionally refresh counts (best-effort)
      for (const seg of await (this.databaseService as any).customerSegment.findMany({ where: { tenantId, isActive: true } })) {
        const cnt = await (this.databaseService as any).customerSegmentMembership.count({ where: { segmentId: (seg as any).id } });
        await (this.databaseService as any).customerSegment.update({ where: { id: (seg as any).id }, data: { customerCount: cnt, lastCalculated: new Date() } });
      }
    } catch {
      // ignore
    }
  }

  // --- Custom fields validation (reused across create/update) ---
  private async validateAndNormalizeCustomFields(
    tenantId: string,
    entity: 'ticket' | 'customer' | 'lead' | 'deal',
    payload: Record<string, unknown>,
  ) {
    try {
      if (!tenantId) return payload || {};
      const defs = (await this.databaseService.customFieldDefinition.findMany({
        where: { tenantId, entity, isActive: true },
      })) as Array<{ name: string; required: boolean; readOnly?: boolean }>;
      const allowed = new Set(defs.map((d) => d.name));
      const normalized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(payload || {})) {
        if (!allowed.has(key)) continue; // drop unknown
        const def = defs.find((d) => d.name === key);
        if (!def) continue;
        if (def.readOnly) continue;
        if (def.required && (value === null || value === undefined || value === '')) {
          continue;
        }
        normalized[key] = value;
      }
      return normalized;
    } catch {
      return payload || {};
    }
  }
}