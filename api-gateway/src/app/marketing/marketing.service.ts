import { Injectable, NotFoundException } from '@nestjs/common'
import { DatabaseService } from '@glavito/shared-database'
import { EventStoreService } from '@glavito/shared-kafka'
import { EmailService } from '../auth/email.service'
import { WhatsAppAdapter, InstagramAdapter } from '@glavito/shared-conversation'

@Injectable()
export class MarketingService {
  constructor(
    private readonly db: DatabaseService,
    private readonly eventStore: EventStoreService,
    private readonly email: EmailService,
    private readonly whatsapp: WhatsAppAdapter,
    private readonly instagram: InstagramAdapter,
  ) {}

  async list(tenantId: string) {
    return this.db.marketingCampaign.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } })
  }

  async get(id: string, tenantId: string) {
    const campaign = await this.db.marketingCampaign.findFirst({ where: { id, tenantId } })
    if (!campaign) throw new NotFoundException('Campaign not found')
    return campaign
  }

  async create(tenantId: string, payload: Record<string, unknown>) {
    const campaign = await this.db.marketingCampaign.create({ data: { tenantId, ...(payload as any) } as any })
    await this.eventStore.saveEvent({
      eventId: `${campaign.id}-created`,
      eventType: 'marketing.campaign.created',
      aggregateId: campaign.id,
      aggregateType: 'marketing',
      eventData: { campaignId: campaign.id },
      metadata: { source: 'marketing-service', tenantId } as any,
      timestamp: new Date(),
      version: '1.0',
      tenantId,
    } as any)
    return campaign
  }

  async update(id: string, tenantId: string, payload: Record<string, unknown>) {
    await this.get(id, tenantId)
    const updated = await this.db.marketingCampaign.update({ where: { id }, data: payload as any })
    await this.eventStore.saveEvent({
      eventId: `${id}-updated-${Date.now()}`,
      eventType: 'marketing.campaign.updated',
      aggregateId: id,
      aggregateType: 'marketing',
      eventData: { campaignId: id, changes: Object.keys(payload) },
      metadata: { source: 'marketing-service', tenantId } as any,
      timestamp: new Date(),
      version: '1.0',
      tenantId,
    } as any)
    return updated
  }

  async schedule(id: string, tenantId: string, startDate: Date) {
    const updated = await this.update(id, tenantId, { status: 'SCHEDULED', startDate })
    return updated
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
    let deliveriesData: Array<{ campaignId: string; variantId?: string; customerId: string; channel: string; status: string; scheduledAt: Date }>
    if (!variants.length) {
      deliveriesData = members.map((m) => ({
        campaignId: id,
        customerId: m.customerId,
        channel: (campaign.type || 'EMAIL').toLowerCase(),
        status: 'pending',
        scheduledAt: new Date(),
      }))
    } else {
      // Distribute by variant weight
      const totalWeight = variants.reduce((sum: number, v: any) => sum + (v.weight || 0), 0) || 100
      let idx = 0
      deliveriesData = members.map((m) => {
        const cursor = (idx++ % totalWeight)
        let acc = 0
        let chosen = variants[0]
        for (const v of variants) {
          acc += v.weight || 0
          if (cursor < acc) { chosen = v; break }
        }
        return {
          campaignId: id,
          variantId: chosen?.id,
          customerId: m.customerId,
          channel: (campaign.type || 'EMAIL').toLowerCase(),
          status: 'pending',
          scheduledAt: new Date(),
        }
      })
    }
    await this.db.campaignDelivery.createMany({ data: deliveriesData })
    await this.eventStore.saveEvent({
      eventId: `${id}-launched-${Date.now()}`,
      eventType: 'marketing.campaign.launched',
      aggregateId: id,
      aggregateType: 'marketing',
      eventData: { campaignId: id, deliveries: deliveriesData.length },
      metadata: { source: 'marketing-service', tenantId } as any,
      timestamp: new Date(),
      version: '1.0',
      tenantId,
    } as any)
    return { enqueued: deliveriesData.length }
  }

  async processPendingDeliveries(limit = 100) {
    const deliveries = await this.db.campaignDelivery.findMany({
      where: { status: 'pending' },
      take: limit,
      orderBy: { createdAt: 'asc' },
      include: { campaign: true, customer: true, variant: true },
    })
    for (const d of deliveries) {
      try {
        const channel = (d.channel || 'email').toLowerCase()
        if (channel === 'email') {
          if (!d.customer.email) throw new Error('No customer email')
          const subject = d.variant?.subject || d.campaign.subject || d.campaign.name
          const html = (d.variant?.content as any)?.html || (d.campaign.content as any)?.html || `<p>${d.campaign.description || ''}</p>`
          await this.email.sendEmail({ to: d.customer.email, subject, html, text: (d.campaign.content as any)?.text })
          await this.db.campaignDelivery.update({ where: { id: d.id }, data: { status: 'sent', sentAt: new Date(), messageId: undefined } })
        } else if (channel === 'whatsapp') {
          if (!d.customer.phone) throw new Error('No customer phone')
          const content = (d.variant?.content as any)?.text || (d.campaign.content as any)?.text || d.campaign.name
          await this.whatsapp.sendMessage('', { recipientId: d.customer.phone, content, messageType: 'text' } as any)
          await this.db.campaignDelivery.update({ where: { id: d.id }, data: { status: 'sent', sentAt: new Date() } })
        } else if (channel === 'instagram') {
          // DM by ig user id expected in customFields
          const igId = (d.customer.customFields as any)?.instagramId
          if (!igId) throw new Error('No Instagram id')
          const content = (d.variant?.content as any)?.text || (d.campaign.content as any)?.text || d.campaign.name
          await this.instagram.sendMessage('', { recipientId: igId, content, messageType: 'text' } as any)
          await this.db.campaignDelivery.update({ where: { id: d.id }, data: { status: 'sent', sentAt: new Date() } })
        } else {
          await this.db.campaignDelivery.update({ where: { id: d.id }, data: { status: 'failed', errorMessage: 'Unsupported channel' } })
        }
      } catch (err: any) {
        await this.db.campaignDelivery.update({ where: { id: d.id }, data: { status: 'failed', errorMessage: err?.message || 'send failed' } })
      }
    }
    return { processed: deliveries.length }
  }

  async processScheduledCampaigns() {
    const due = await this.db.marketingCampaign.findMany({ where: { status: 'SCHEDULED', startDate: { lte: new Date() } } })
    for (const c of due) {
      try { await this.launchNow(c.id, c.tenantId) } catch { /* ignore */ }
    }
    return { launched: due.length }
  }

  async listVariants(campaignId: string, tenantId: string) {
    await this.get(campaignId, tenantId)
    return this.db.campaignVariant.findMany({ where: { campaignId } })
  }

  async createVariant(campaignId: string, tenantId: string, payload: { name: string; weight?: number; subject?: string; content?: Record<string, unknown> }) {
    await this.get(campaignId, tenantId)
    const variant = await this.db.campaignVariant.create({ data: { campaignId, name: payload.name, weight: payload.weight ?? 50, subject: payload.subject, content: (payload.content ?? {}) as any } })
    return variant
  }

  async getPerformance(campaignId: string, tenantId: string) {
    await this.get(campaignId, tenantId)
    const counts = await (this.db.campaignDelivery as any).groupBy({
      by: ['status'],
      where: { campaignId },
      _count: { _all: true }
    }) as Array<{ status: string; _count: { _all: number } }>
    const totals = counts.reduce((acc: Record<string, number>, c) => { acc[c.status] = c._count?._all || 0; return acc }, {})
    const sent = (await this.db.campaignDelivery.count({ where: { campaignId, sentAt: { not: null } } }))
    const opened = (await this.db.campaignDelivery.count({ where: { campaignId, openedAt: { not: null } } }))
    const clicked = (await this.db.campaignDelivery.count({ where: { campaignId, clickedAt: { not: null } } }))
    const campaign = await this.db.marketingCampaign.findUnique({ where: { id: campaignId } })
    const budget = campaign?.budget ? Number(campaign.budget) : undefined
    const spent = campaign?.spent ? Number(campaign.spent) : 0
    const revenue = (campaign?.metrics as any)?.revenue ? Number((campaign?.metrics as any)?.revenue) : undefined
    const roi = revenue !== undefined && spent > 0 ? (revenue - spent) / spent : undefined
    return { totals, sent, opened, clicked, openRate: sent ? opened / sent : 0, clickRate: sent ? clicked / sent : 0, budget, spent, revenue, roi }
  }
}


