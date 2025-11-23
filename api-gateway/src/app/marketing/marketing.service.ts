/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, Logger, Optional, Inject } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DatabaseService } from '@glavito/shared-database'
import { EmailService } from '../email/email.service'
import { WhatsAppAdapter, InstagramAdapter, SMSAdapter } from '@glavito/shared-conversation'
import { NotificationsService } from '../notifications/notifications.service';
import { TicketsSearchService } from '../tickets/tickets-search.service';
import { WalletService } from '../wallet/wallet.service';
import { calculateMessageCost } from '../wallet/pricing.config';
import * as Handlebars from 'handlebars';
import { StripeService } from '../stripe/stripe.service';

export interface RelatedTicket {
  id: string
  subject: string
  status: string
  priority: string
  createdAt: string
  tags: string[]
}

@Injectable()
export class MarketingService {
  private readonly logger = new Logger(MarketingService.name)
  constructor(
    private readonly db: DatabaseService,
    private readonly email: EmailService,
    private readonly whatsapp: WhatsAppAdapter,
    private readonly instagram: InstagramAdapter,
    private readonly sms: SMSAdapter,
    private readonly config: ConfigService,
    private readonly search: TicketsSearchService,
    @Optional() private readonly stripe?: StripeService,
    @Optional() @Inject('AI_SERVICE') private readonly ai?: any,
    @Optional() @Inject('EVENT_PUBLISHER') private readonly eventPublisher?: any,
    @Optional() private readonly notifications?: NotificationsService,
    @Optional() private readonly walletService?: WalletService,
  ) {}

  async list(tenantId: string) {
    return this.db.marketingCampaign.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } })
  }

  async get(id: string, tenantId: string) {
    const campaign = await this.db.marketingCampaign.findFirst({
      where: { id, tenantId },
      include: {
        deliveries: { take: 5, orderBy: { scheduledAt: 'desc' }, include: { customer: true } },
        variants: true
      }
    })
    if (!campaign) throw new Error('Campaign not found')
    return campaign
  }

  private async saveEvent(data: { eventId: string; eventType: string; aggregateId: string; aggregateType: string; eventData: unknown; metadata?: unknown; timestamp?: Date; version?: string; tenantId?: string }) {
    try {
      await (this.db as any)['eventStore'].create({
        data: {
          eventId: data.eventId,
          eventType: data.eventType,
          eventVersion: (data.version as any) || '1.0',
          aggregateId: data.aggregateId,
          aggregateType: data.aggregateType,
          aggregateVersion: 1,
          eventData: data.eventData as any,
          metadata: (data.metadata as any) || {},
          timestamp: (data.timestamp as any) || new Date(),
        }
      })
    } catch { /* best-effort */ }
  }

  async create(tenantId: string, payload: Record<string, unknown>) {
    const campaign = await this.db.marketingCampaign.create({ data: { tenantId, ...(payload as any) } as any })
    await this.saveEvent({
      eventId: `${campaign.id}-created`,
      eventType: 'marketing.campaign.created',
      aggregateId: campaign.id,
      aggregateType: 'marketing',
      eventData: { campaignId: campaign.id },
      metadata: { source: 'marketing-service', tenantId } as any,
    })
    // Index campaign for search (best-effort)
    try {
      await this.search.indexCampaign(campaign.id, tenantId);
    } catch { /* noop */ }
    return campaign
  }

  async update(id: string, tenantId: string, payload: Record<string, unknown>) {
    await this.get(id, tenantId)
    const updated = await this.db.marketingCampaign.update({ where: { id }, data: payload as any })
    await this.saveEvent({
      eventId: `${id}-updated-${Date.now()}`,
      eventType: 'marketing.campaign.updated',
      aggregateId: id,
      aggregateType: 'marketing',
      eventData: { campaignId: id, changes: Object.keys(payload) },
      metadata: { source: 'marketing-service', tenantId } as any,
    })
    // Index updated campaign for search (best-effort)
    try {
      await this.search.indexCampaign(id, tenantId);
    } catch { /* noop */ }
    return updated
  }

  /**
   * Create a broadcast campaign and immediately enqueue deliveries to segment members.
   */
  async createBroadcast(tenantId: string, payload: { name: string; description?: string; type: string; segmentId: string }) {
    const campaign = await this.create(tenantId, {
      name: payload.name,
      description: payload.description,
      type: payload.type,
      segmentId: payload.segmentId,
      status: 'DRAFT',
    });
    const result = await this.launchNow(campaign.id, tenantId);
    return { id: campaign.id, ...result };
  }

  /**
   * Simple retargeting: re-enqueue messages for recipients that didn't open/click within a window.
   */
  async retargetCampaign(
    id: string,
    tenantId: string,
    rules: { afterHours?: number; condition?: 'no_open' | 'no_click' } = {}
  ): Promise<{ enqueued: number }> {
    const afterHours = Math.max(1, Number(rules.afterHours || 24));
    const cutoff = new Date(Date.now() - afterHours * 60 * 60 * 1000);
    const condition = rules.condition || 'no_open';

    const baseWhere: any = { campaignId: id, tenantId, sentAt: { lte: cutoff } };
    if (condition === 'no_open') baseWhere.openedAt = null;
    if (condition === 'no_click') baseWhere.clickedAt = null;

    const stale = await this.db.campaignDelivery.findMany({
      where: baseWhere,
      select: { customerId: true, channel: true, variantId: true },
      take: 1000,
    });
    if (!stale.length) return { enqueued: 0 };

    // Load preferences for affected customers
    const customerIds = [...new Set(stale.map(s => s.customerId))];
    const customers = await this.db.customer.findMany({ where: { id: { in: customerIds } }, select: { id: true, customFields: true } });
    const idToPrefs = new Map<string, { marketingPreferences?: { whatsappOptOut?: boolean; emailOptOut?: boolean; smsOptOut?: boolean }; quietHours?: { start?: string; end?: string; timezone?: string } }>();
    for (const c of customers as Array<any>) {
      const cf = (c.customFields || {}) as any;
      idToPrefs.set(c.id, { marketingPreferences: cf.marketingPreferences || {}, quietHours: cf.quietHours || {} });
    }
    const isOptedOut = (customerId: string, channel: string): boolean => {
      const prefs = idToPrefs.get(customerId)?.marketingPreferences || {};
      const c = (channel || '').toUpperCase();
      if (c === 'EMAIL' && prefs.emailOptOut) return true;
      if (c === 'SMS' && prefs.smsOptOut) return true;
      if (c === 'WHATSAPP' && prefs.whatsappOptOut) return true;
      return false;
    };
    const computeScheduledAt = (customerId: string): Date => {
      const qh = idToPrefs.get(customerId)?.quietHours || {};
      const now = new Date();
      const start = typeof qh.start === 'string' ? qh.start : undefined;
      const end = typeof qh.end === 'string' ? qh.end : undefined;
      if (!start || !end) return now;
      const toMinutes = (hhmm: string) => {
        const [h, m] = hhmm.split(':').map((x) => parseInt(x || '0', 10));
        return h * 60 + m;
      };
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const startMin = toMinutes(start);
      const endMin = toMinutes(end);
      const within = startMin <= endMin
        ? (nowMinutes >= startMin && nowMinutes < endMin)
        : (nowMinutes >= startMin || nowMinutes < endMin);
      if (!within) return now;
      const scheduled = new Date(now);
      if (startMin > endMin && nowMinutes >= startMin) {
        scheduled.setDate(now.getDate() + 1);
      }
      scheduled.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0);
      return scheduled;
    };

    const queued = stale
      .filter(s => !isOptedOut(s.customerId, s.channel))
      .map(s => ({
        tenantId,
        campaignId: id,
        variantId: s.variantId || undefined,
        customerId: s.customerId,
        channel: s.channel,
        status: 'pending',
        scheduledAt: computeScheduledAt(s.customerId),
      }));
    await this.db.campaignDelivery.createMany({ data: queued });
    await this.saveEvent({
      eventId: `${id}-retarget-${Date.now()}`,
      eventType: 'marketing.campaign.retarget',
      aggregateId: id,
      aggregateType: 'marketing',
      eventData: { campaignId: id, enqueued: queued.length, condition, afterHours },
      metadata: { source: 'marketing-service', tenantId } as any,
    });
    return { enqueued: queued.length };
  }

  /**
   * Generate a one-time checkout link (Stripe Checkout) to embed in outbound message content.
   */
  async injectCheckoutLink(tenantId: string, args: { campaignId: string; customerId?: string; amount: number; currency: string; description?: string; metadata?: Record<string, string> }): Promise<{ url: string }> {
    if (!this.stripe) {
      this.logger.warn('Stripe service unavailable, cannot create checkout link');
      return { url: '' };
    }
    const urlResp = await this.stripe.createCheckoutSessionForOrder(tenantId, {
      lineItems: [{ amount: args.amount, currency: args.currency, name: args.description || 'Order' }],
      metadata: { campaignId: args.campaignId, customerId: args.customerId || '', ...(args.metadata || {}) },
    });
    return urlResp;
  }

  async schedule(id: string, tenantId: string, startDate: Date) {
    await this.get(id, tenantId)
    const scheduled = await this.db.marketingCampaign.update({ where: { id }, data: { status: 'SCHEDULED', startDate } })
    await this.saveEvent({
      eventId: `${id}-scheduled-${Date.now()}`,
      eventType: 'marketing.campaign.scheduled',
      aggregateId: id,
      aggregateType: 'marketing',
      eventData: { campaignId: id, startDate: startDate.toISOString() },
      metadata: { source: 'marketing-service', tenantId } as any,
    })
    return scheduled
  }

  async launchNow(id: string, tenantId: string) {
    // Mark active and enqueue deliveries for segment members
    const campaign = await this.get(id, tenantId)
    const members = campaign.segmentId
      ? await this.db.customerSegmentMembership.findMany({ where: { segmentId: campaign.segmentId }, select: { customerId: true } })
      : []
    await this.db.marketingCampaign.update({ where: { id }, data: { status: 'ACTIVE', startDate: new Date() } })
    if (members.length === 0) return { enqueued: 0 }
    const variants = await this.db.campaignVariant.findMany({ where: { campaignId: id } })
    // Load customer preferences once
    const customerIds = members.map((m: { customerId: string }) => m.customerId);
    const customers = await this.db.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, customFields: true },
    });
    const idToPrefs = new Map<string, { marketingPreferences?: { whatsappOptOut?: boolean; emailOptOut?: boolean; smsOptOut?: boolean }; quietHours?: { start?: string; end?: string; timezone?: string } }>();
    for (const c of customers as Array<any>) {
      const cf = (c.customFields || {}) as any;
      idToPrefs.set(c.id, {
        marketingPreferences: cf.marketingPreferences || {},
        quietHours: cf.quietHours || {},
      });
    }
    const channelType = (campaign.type || 'EMAIL').toUpperCase();
    const isOptedOut = (customerId: string): boolean => {
      const prefs = idToPrefs.get(customerId)?.marketingPreferences || {};
      if (channelType === 'EMAIL' && prefs.emailOptOut) return true;
      if (channelType === 'SMS' && prefs.smsOptOut) return true;
      if (channelType === 'WHATSAPP' && prefs.whatsappOptOut) return true;
      return false;
    };
    const computeScheduledAt = (customerId: string): Date => {
      const qh = idToPrefs.get(customerId)?.quietHours || {};
      const now = new Date();
      const start = typeof qh.start === 'string' ? qh.start : undefined;
      const end = typeof qh.end === 'string' ? qh.end : undefined;
      if (!start || !end) return now;
      const toMinutes = (hhmm: string) => {
        const [h, m] = hhmm.split(':').map((x) => parseInt(x || '0', 10));
        return h * 60 + m;
      };
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const startMin = toMinutes(start);
      const endMin = toMinutes(end);
      const within = startMin <= endMin
        ? (nowMinutes >= startMin && nowMinutes < endMin)
        : (nowMinutes >= startMin || nowMinutes < endMin); // spans midnight
      if (!within) return now;
      // schedule at end time (today or next day if already past end in wrap-around)
      const scheduled = new Date(now);
      let targetDay = now;
      if (startMin > endMin && nowMinutes < endMin) {
        // we are after midnight before end
        targetDay = now;
      } else if (startMin > endMin && nowMinutes >= startMin) {
        // before midnight after start -> schedule tomorrow at end
        targetDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      } else if (startMin <= endMin) {
        // same-day quiet hours, schedule today at end
        targetDay = now;
      }
      scheduled.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0);
      if (targetDay !== now) {
        scheduled.setDate(now.getDate() + 1);
      }
      return scheduled;
    };
    let deliveriesData: Array<{ tenantId: string; campaignId: string; variantId?: string; customerId: string; channel: string; status: string; scheduledAt: Date }>
    if (!variants.length) {
      deliveriesData = members
        .filter((m: { customerId: string }) => !isOptedOut(m.customerId))
        .map((m: { customerId: string }) => ({
          tenantId,
          campaignId: id,
          customerId: m.customerId,
          channel: (campaign.type || 'EMAIL'),
          status: 'pending',
          scheduledAt: computeScheduledAt(m.customerId),
        }))
    } else {
      // Distribute by variant weight
      const totalWeight = variants.reduce((sum: number, v: { weight?: number }) => sum + (v?.weight || 0), 0) || 100
      let idx = 0
      deliveriesData = members
        .filter((m: { customerId: string }) => !isOptedOut(m.customerId))
        .map((m: { customerId: string }) => {
        const cursor = (idx++ % totalWeight)
        let acc = 0
        let chosenVariantId: string | undefined = (variants[0] as any)?.id as string | undefined
        for (const v of variants as Array<{ id: string; weight?: number }>) {
          acc += v.weight || 0
          if (cursor < acc) { chosenVariantId = v.id; break }
        }
        return {
          tenantId,
          campaignId: id,
          variantId: chosenVariantId,
          customerId: m.customerId,
          channel: (campaign.type || 'EMAIL'),
          status: 'pending',
          scheduledAt: computeScheduledAt(m.customerId),
        }
      })
    }
    await this.db.campaignDelivery.createMany({ data: deliveriesData })
    await this.saveEvent({
      eventId: `${id}-launched-${Date.now()}`,
      eventType: 'marketing.campaign.launched',
      aggregateId: id,
      aggregateType: 'marketing',
      eventData: { campaignId: id, deliveries: deliveriesData.length },
      metadata: { source: 'marketing-service', tenantId } as any,
    })
    // Notify ticket agents of high-volume launch (best-effort)
    try {
      if (this.notifications) {
        // Fetch relevant agents (e.g., support team or all active agents; fallback to tenant admins if no team)
        const agents = await this.db.user.findMany({
          where: { tenantId, role: { in: ['agent', 'admin'] } },
          select: { id: true },
        });
        if (agents.length > 0) {
          const agentIds = agents.map(a => a.id);
          for (const agentId of agentIds) {
            await this.notifications.publishNotification(
              'system',
              `High-volume campaign launched (${deliveriesData.length} deliveries)`,
              'Monitor for delivery issues or customer responses.',
              'medium',
              agentId,
              { campaignId: id, enqueued: deliveriesData.length, type: 'campaign_launch' },
              tenantId
            );
          }
        }
      }
    } catch { /* noop */ }
    // Index launched campaign for search (best-effort)
    try {
      await this.search.indexCampaign(id, tenantId);
    } catch { /* noop */ }
    return { enqueued: deliveriesData.length }
  }

  async processPendingDeliveries(limit = 100) {
    // Implementation for scheduler - process pending deliveries
    const now = new Date()
    const pending = await this.db.campaignDelivery.findMany({
      where: { status: 'pending', scheduledAt: { lte: now } },
      take: limit,
      include: { campaign: true, customer: true, variant: true }
    })
    const results = []
    for (const delivery of pending) {
      try {
        const sent = await this.sendDelivery(delivery)
        results.push({ deliveryId: delivery.id, success: true, ...sent })
      } catch (error: any) {
        try {
          await this.db.campaignDelivery.update({ where: { id: delivery.id }, data: { status: 'failed', errorMessage: error?.message || 'send failed' } })
        } catch { /* noop */ }
        try {
          await this.eventPublisher?.publishWorkflowEvent?.({
            eventType: 'marketing.delivery.failed', tenantId: delivery.tenantId, userId: undefined, timestamp: new Date().toISOString(), data: { deliveryId: delivery.id, campaignId: delivery.campaignId, customerId: delivery.customerId, channel: delivery.channel, error: error?.message || 'failed' }
          })
        } catch { /* noop */ }
        results.push({ deliveryId: delivery.id, success: false, error: error?.message || 'failed' })
      }
    }
    return results
  }

  private async sendDelivery(delivery: any): Promise<{ messageId?: string }> {
    let messageId: string | undefined
    // lazily load needed entities
    const customer = delivery.customer || await this.db.customer.findUnique({ where: { id: delivery.customerId } })
    const campaign = delivery.campaign || await this.db.marketingCampaign.findUnique({ where: { id: delivery.campaignId } })
    const variant = delivery.variant || (delivery.variantId ? await this.db.campaignVariant.findUnique({ where: { id: delivery.variantId } }) : null)

    const phoneNumbers: string[] = typeof (customer as any)?.phoneNumbers === 'string' ? JSON.parse((customer as any).phoneNumbers) : []
    const externalIds: Array<{ platform: string; id: string }> = typeof (customer as any)?.externalIds === 'string' ? JSON.parse((customer as any).externalIds) : []

    let textContent = (variant as any)?.content?.text || campaign?.description || ''
    let subject = (variant as any)?.subject || campaign?.subject || campaign?.name || 'Update'
    try {
      if (customer?.id) {
        subject = await this.generatePersonalizedContent(customer.id, subject, 'subject', campaign?.tenantId || '')
        textContent = await this.generatePersonalizedContent(customer.id, textContent, 'body', campaign?.tenantId || '')
      }
    } catch { /* noop */ }
    const templateVars = { firstName: (customer as any)?.firstName || '', lastName: (customer as any)?.lastName || '' }
    const renderedText = Handlebars.compile(textContent || '')(templateVars)

    switch (delivery.channel) {
      case 'EMAIL': {
        const html = (variant as any)?.content?.html || undefined
        const rendered = this.addEmailTracking(html, renderedText, delivery.id)
        const sent = await (this.email as any).sendTransactionalEmail?.({ to: customer?.email, subject, html: rendered.html, text: rendered.text })
        messageId = sent?.messageId || sent?.id
        break
      }
      case 'WHATSAPP': {
        const to = phoneNumbers[0]
        if (!to) throw new Error('No customer phone')
        // Check if campaign has template configuration
        const campaignContent = (campaign as any)?.content || (variant as any)?.content || {}
        const templateId = campaignContent.templateId
        const templateParams = campaignContent.templateParams
        
        if (templateId) {
          // Send as template message
          const result = await this.whatsapp.sendMessage(delivery.campaignId, {
            content: renderedText, // Fallback text
            messageType: 'template',
            templateId,
            templateParams: templateParams || {},
            to,
            metadata: {
              language: campaignContent.templateLanguage || 'en',
              fallbackText: renderedText,
            },
          } as any)
          messageId = (result as any)?.id || (result as any)?.messageId
        } else {
          // Send as regular text message
        const result = await this.whatsapp.sendMessage(delivery.campaignId, { content: { text: renderedText }, to } as any)
        messageId = (result as any)?.id || (result as any)?.messageId
        }
        break
      }
      case 'INSTAGRAM': {
        const igId = externalIds.find(x => x.platform === 'instagram')?.id
        if (!igId) throw new Error('No Instagram id')
        const result = await this.instagram.sendMessage(delivery.campaignId, { content: { text: renderedText }, to: igId } as any)
        messageId = (result as any)?.id || (result as any)?.messageId
        break
      }
      case 'SMS': {
        const to = phoneNumbers[0]
        if (!to) throw new Error('No customer phone for SMS')
        const result = await this.sms.sendMessage(delivery.campaignId, { content: { text: renderedText }, recipient: { phone: to } } as any)
        messageId = (result as any)?.id
        break
      }
      default:
        throw new Error(`Unsupported channel type: ${delivery.channel}`)
    }

    await this.db.campaignDelivery.update({ where: { id: delivery.id }, data: { status: 'sent', sentAt: new Date(), messageId } })
    
    // Record usage for campaign message (best-effort)
    try {
      if (this.walletService) {
        const channelType = delivery.channel.toLowerCase();
        const messageType = 'text'; // Campaign messages are typically text
        const cost = calculateMessageCost(channelType, messageType, false);
        
        if (cost > 0) {
          await this.walletService.recordUsage(
            delivery.tenantId,
            channelType,
            cost,
            `Campaign message via ${channelType}`,
            messageId,
            messageType,
          );
        }
      }
    } catch (err) {
      this.logger.debug(`Failed to record usage for campaign message: ${(err as Error).message}`);
    }
    
    try {
      await this.eventPublisher?.publishWorkflowEvent?.({
        eventType: 'marketing.delivery.sent', tenantId: delivery.tenantId, userId: undefined, timestamp: new Date().toISOString(), data: { deliveryId: delivery.id, campaignId: delivery.campaignId, customerId: delivery.customerId, channel: delivery.channel },
      })
    } catch { /* noop */ }

    return { messageId }
  }

  async getFailedDeliveriesForRetry(tenantId: string, limit: number) {
    // Note: retryCount field doesn't exist in schema, using metadata approach
    return this.db.campaignDelivery.findMany({
      where: { tenantId, status: 'failed' },
      take: limit,
      orderBy: { updatedAt: 'asc' }
    })
  }

  async requeueFailedDeliveries(tenantId: string, limit = 50): Promise<number> {
    const failed = await this.getFailedDeliveriesForRetry(tenantId, limit)
    let count = 0
    for (const delivery of failed) {
      try {
        const meta = (delivery.metadata as any) || {}
        const retries = (meta.retryCount || 0) as number
        if (retries >= 3) continue
        await this.db.campaignDelivery.update({
          where: { id: delivery.id },
          data: { 
            status: 'pending', 
            errorMessage: null,
            metadata: { ...meta, retryCount: retries + 1 } as any
          }
        })
        count++
      } catch { /* noop */ }
    }
    return count
  }

  private addEmailTracking(htmlInput: string | undefined, textInput: string | undefined, deliveryId: string): { html: string; text?: string } {
    if (!htmlInput) return { html: '' }
    const trackingPixel = `<img src="${this.config.get('API_URL')}/marketing/track/open/${deliveryId}" width="1" height="1" style="display:none" alt="" />`
    const html = htmlInput.replace('</body>', `${trackingPixel}</body>`)
    const text = textInput // No tracking for plain text
    return { html, text }
  }

  private async recordLeadActivityForCustomer(tenantId: string, customerId: string, type: string, meta: Record<string, unknown>) {
    try {
      // Find lead for this customer
      const lead = await this.db.lead.findFirst({ where: { customerId, tenantId } })
      if (!lead) return // No lead record, skip activity
      await this.db.leadActivity.create({
        data: {
          leadId: lead.id,
          userId: undefined,
          type,
          description: `Marketing activity: ${type}`,
          metadata: meta as any,
        }
      })
      // Trigger AI rescoring (best-effort) - method not available, skip
    } catch { /* noop */ }
  }

  async processScheduledCampaigns() {
    const scheduled = await this.db.marketingCampaign.findMany({
      where: { status: 'SCHEDULED', startDate: { lte: new Date() } }
    })
    for (const campaign of scheduled) {
      await this.launchNow(campaign.id, campaign.tenantId)
    }
  }

  async listVariants(campaignId: string, tenantId: string) {
    return this.db.campaignVariant.findMany({ where: { campaignId }, orderBy: { weight: 'desc' } })
  }

  async createVariant(campaignId: string, tenantId: string, payload: { name: string; weight?: number; subject?: string; content?: Record<string, unknown> }) {
    await this.get(campaignId, tenantId)
    return this.db.campaignVariant.create({ data: { campaignId, ...payload } as any })
  }

  async getPerformance(campaignId: string, tenantId: string) {
    const deliveries = await this.db.campaignDelivery.count({ where: { campaignId } })
    if (deliveries === 0) return { openRate: 0, clickRate: 0, totals: {} }
    const opens = await this.db.emailEvent.count({ where: { type: 'open', deliveryId: { in: await this.db.campaignDelivery.findMany({ where: { campaignId }, select: { id: true } }).then(ds => ds.map(d => d.id)) } } })
    const clicks = await this.db.emailEvent.count({ where: { type: 'click', deliveryId: { in: await this.db.campaignDelivery.findMany({ where: { campaignId }, select: { id: true } }).then(ds => ds.map(d => d.id)) } } })
    const statuses = await this.db.campaignDelivery.groupBy({
      by: ['status'],
      where: { campaignId },
      _count: { status: true }
    })
    const totals = statuses.reduce((acc, s) => ({ ...acc, [s.status]: s._count.status }), {})
    return {
      openRate: deliveries > 0 ? opens / deliveries : 0,
      clickRate: deliveries > 0 ? clicks / deliveries : 0,
      totals
    }
  }

  async listDeliveries(campaignId: string, tenantId: string, limit = 20) {
    return this.db.campaignDelivery.findMany({
      where: { campaignId },
      take: limit,
      orderBy: { scheduledAt: 'desc' },
      include: { customer: true, variant: true }
    })
  }

  async listConversions(campaignId: string, tenantId: string) {
    try {
      const rows = await (this.db as any).campaignConversion.findMany?.({
        where: { campaignId, tenantId },
        orderBy: { occurredAt: 'desc' },
        take: 1000,
      }) || [];
      return rows.map((r: any) => ({
        id: r.id,
        amount: r.amount,
        currency: r.currency,
        occurredAt: (r.occurredAt as Date)?.toISOString?.() || new Date().toISOString(),
        channel: r.channel,
        source: r.source,
      }));
    } catch {
      return [];
    }
  }
  async listTouchpointsForCustomer(customerId: string, tenantId: string, limit = 20) {
    return this.db.campaignDelivery.findMany({
      where: { customerId },
      take: limit,
      orderBy: { scheduledAt: 'desc' },
      include: { campaign: { select: { id: true, name: true } }, variant: true }
    }).then(deliveries => deliveries.map(d => ({
      id: d.id,
      campaignId: d.campaignId,
      campaignName: d.campaign?.name,
      channel: d.channel,
      status: d.status,
      sentAt: d.sentAt?.toISOString(),
      openedAt: d.openedAt?.toISOString(),
      clickedAt: d.clickedAt?.toISOString()
    })))
  }

  async trackDeliveryOpen(deliveryId: string) {
    const delivery = await this.db.campaignDelivery.findUnique({ where: { id: deliveryId } })
    if (!delivery) return
    await this.db.campaignDelivery.update({ where: { id: deliveryId }, data: { openedAt: new Date() } })
    await this.db.emailEvent.create({ data: { tenantId: delivery.tenantId, deliveryId, type: 'open' } as any })
    // Record activity and rescore
    if (delivery.customerId) {
      await this.recordLeadActivityForCustomer(delivery.tenantId, delivery.customerId, 'email_opened', { campaignId: delivery.campaignId })
    }
  }

  async trackDeliveryClick(deliveryId: string, url?: string) {
    const delivery = await this.db.campaignDelivery.findUnique({ where: { id: deliveryId } })
    if (!delivery) return
    await this.db.campaignDelivery.update({ where: { id: deliveryId }, data: { clickedAt: new Date() } })
    await this.db.emailEvent.create({ data: { tenantId: delivery.tenantId, deliveryId, type: 'click', metadata: { url } } as any })
    // Similar activity recording
    if (delivery.customerId) {
      await this.recordLeadActivityForCustomer(delivery.tenantId, delivery.customerId, 'email_clicked', { campaignId: delivery.campaignId, url })
    }
  }

  async unsubscribeCustomerFromEmailMarketing(deliveryId: string) {
    const delivery = await this.db.campaignDelivery.findUnique({ where: { id: deliveryId } })
    if (!delivery?.customerId) return
    // Store opt-out in customer metadata (emailOptOut doesn't exist in schema)
    const customer = await this.db.customer.findUnique({ where: { id: delivery.customerId } })
    const meta = (customer?.customFields as any) || {}
    await this.db.customer.update({
      where: { id: delivery.customerId },
      data: { customFields: { ...meta, emailOptOut: true } as any }
    })
    await this.recordLeadActivityForCustomer(delivery.tenantId, delivery.customerId, 'email_unsubscribed', {})
  }

  async listTemplates(_type: string, _tenantId: string): Promise<Array<{ id: string; name: string; category?: string; language?: string; content?: string; variables?: string[] }>> {
    // Mock or implement template listing
    return [] // Placeholder
  }

  async preview(content: string, vars: Record<string, any> = {}, _tenantId: string): Promise<string> {
    const template = Handlebars.compile(content)
    return template(vars)
  }

  async generatePersonalizedContent(customerId: string, baseContent: string, _type: 'subject' | 'body', _tenantId: string): Promise<string> {
    const customer = await this.db.customer.findUnique({ where: { id: customerId } })
    if (!customer) throw new Error('Customer not found')
    // AI generateText not available, return templated version
    const template = Handlebars.compile(baseContent)
    return template({ firstName: customer.firstName, lastName: customer.lastName })
  }

  async getCampaignContent(id: string, tenantId: string): Promise<string> {
    const campaign = await this.get(id, tenantId)
    return campaign.description || ''
  }

  async exportCampaignData(id: string, _format: 'csv' | 'pdf', tenantId: string): Promise<any[]> {
    await this.get(id, tenantId)
    const deliveries = await this.listDeliveries(id, tenantId, 1000)
    // Implement CSV/PDF generation logic
    return deliveries // Placeholder
  }

  async scheduleReport(_payload: { frequency: string; email: string }, _tenantId: string): Promise<{ success: boolean }> {
    // Implement report scheduling (e.g., cron job or queue)
    return { success: true }
  }

  async getWebhookConfigs(tenantId: string): Promise<any[]> {
    return this.db.webhookEndpoint.findMany({ where: { tenantId } })
  }

  async createWebhook(payload: { url: string; events: string[]; secret?: string }, tenantId: string) {
    return this.db.webhookEndpoint.create({ data: { tenantId, ...payload } as any })
  }

  async getRelatedTickets(campaignId: string, tenantId: string): Promise<RelatedTicket[]> {
    try {
      const tickets = await this.db.ticket.findMany({
        where: { campaignId, tenantId },
        select: {
          id: true,
          subject: true,
          status: true,
          priority: true,
          createdAt: true,
          tags: true
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
      return tickets.map(t => ({
        id: t.id,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        createdAt: t.createdAt.toISOString(),
        tags: t.tags
      }))
    } catch (error) {
      this.logger.warn(`Failed to fetch related tickets for campaign ${campaignId}:`, error)
      return []
    }
  }
}


