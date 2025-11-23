import { Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { DatabaseService } from '@glavito/shared-database'
import { AIIntelligenceService } from '@glavito/shared-ai'
import { PublicChatLinkService } from '../webhooks/public-chat-link.service'
import { PublicChatSessionStore } from './public-chat.store'
import { WhatsAppAdapter } from '@glavito/shared-conversation'
import { EmailService } from '../email/email.service'
import { KnowledgeService } from './knowledge.service'
import { ChannelOrchestratorService } from './services/channel-orchestrator.service'
import { ContactVerificationService } from './services/contact-verification.service'
import type { Response } from 'express'

// Reserved types for future expansion; currently stored via PublicChatSessionStore
// type ChatMessage = { role: 'user' | 'assistant'; text: string; ts: number }

@ApiTags('public-chat')
@Controller('public/chat')
export class PublicChatController {
  private lastPostAt = new Map<string, number>()

  constructor(
    private readonly db: DatabaseService,
    private readonly ai: AIIntelligenceService,
    private readonly knowledge: KnowledgeService,
    private readonly publicChatLinks: PublicChatLinkService,
    private readonly store: PublicChatSessionStore,
    private readonly emailService: EmailService,
    private readonly whatsappAdapter: WhatsAppAdapter,
    private readonly channelOrchestrator: ChannelOrchestratorService,
    private readonly contactVerification: ContactVerificationService,
  ) {}

  private normalizeHost(raw?: string): string {
    if (!raw) return ''
    const host = String(raw).toLowerCase().split(':')[0]
    return host.startsWith('www.') ? host.slice(4) : host
  }

  private async resolveTenantIdFromRequest(req: { get: (name: string) => string | undefined }, tenantIdParam?: string): Promise<string | null> {
    if (tenantIdParam) return tenantIdParam
    const headerTenantId = req.get('x-tenant-id') || req.get('X-Tenant-ID')
    if (headerTenantId) return String(headerTenantId)
    const rawHost = req.get('x-tenant-host') || req.get('X-Tenant-Host') || req.get('host') || ''
    const host = this.normalizeHost(rawHost)
    if (!host) return null
    const cd = await this.db.customDomain.findFirst({ where: { domain: host } }).catch(() => null)
    if (cd && (cd as { tenantId: string }).tenantId) return (cd as { tenantId: string }).tenantId
    const first = host.split('.')[0]
    if (first) {
      const t = await this.db.tenant.findFirst({ where: { subdomain: first } }).catch(() => null)
      if (t) return (t as { id: string }).id
    }
    return null
  }

  @Post('start')
  @ApiOperation({ summary: 'Start a public chat session' })
  async start(@Req() req: { get: (name: string) => string | undefined }, @Body() body?: { email?: string; name?: string; tenantId?: string }) {
    const tenantId = await this.resolveTenantIdFromRequest(req, body?.tenantId)
    if (!tenantId) return { sessionId: null }
    const sessionId = this.store.createSession(tenantId, { email: body?.email, name: body?.name })
    try {
      await this.db.eventStore.create({
        data: {
          eventId: `evt_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
          eventType: 'public_chat_started',
          eventVersion: '1.0',
          aggregateId: sessionId,
          aggregateType: 'PublicChat',
          aggregateVersion: 1,
          eventData: { tenantId },
          timestamp: new Date()
        }
      })
    } catch { /* ignore */ }
    return { sessionId }
  }

  @Post('message')
  @ApiOperation({ summary: 'Send a message in a public chat session' })
  async message(@Req() req: { get: (name: string) => string | undefined }, @Body() body: { sessionId?: string; text?: string; tenantId?: string }) {
    let sessionId = String(body?.sessionId || '')
    const text = String(body?.text || '')
    if (!text) return { reply: 'Please provide a message.' }
    // Simple rate-limit: 1 msg/sec per session
    const nowTs = Date.now()
    const last = this.lastPostAt.get(sessionId)
    if (last && nowTs - last < 1000) return { reply: 'Slow down, please.' }
    let tenantForSession = sessionId ? this.store.getTenant(sessionId) : null
    if (!tenantForSession) {
      const tenantId = await this.resolveTenantIdFromRequest(req, body?.tenantId)
      if (!tenantId) return { reply: 'Unable to determine tenant.' }
      const newId = this.store.createSession(tenantId)
      sessionId = newId
      tenantForSession = tenantId
    }

    const now = Date.now()
    this.store.appendMessage(sessionId, 'user', text.slice(0, 2000), now)
    this.lastPostAt.set(sessionId, now)
    try {
      await this.db.eventStore.create({
        data: {
          eventId: `evt_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
          eventType: 'public_chat_user_message',
          eventVersion: '1.0',
          aggregateId: sessionId,
          aggregateType: 'PublicChat',
          aggregateVersion: 1,
          eventData: { text },
          timestamp: new Date(now)
        }
      })
    } catch { /* ignore */ }

    // Compose a helpful reply using AI when available; fallback to KB suggestions otherwise
    let reply = ''
    try {
      const aiRes = await this.ai.analyzeContent({ content: text, context: { tenantId: tenantForSession as string }, analysisTypes: ['response_generation'] })
      reply = aiRes?.results?.responseGeneration?.suggestedResponses?.[0]?.response || ''
    } catch {
      // ignore
    }
    if (!reply) reply = 'Thanks for your message. Here are some articles that might help:'

    // KB suggestions
    let suggestions: Array<{ id: string; title: string }> = []
    try {
      const suggestionsRes = await this.knowledge.search(tenantForSession as string, text, 5, { semantic: true })
      suggestions = (suggestionsRes?.articles || []).slice(0, 3).map((a) => ({ id: a.id, title: a.title }))
    } catch {
      // ignore
    }

    this.store.appendMessage(sessionId, 'assistant', reply, Date.now())
    try {
      await this.db.eventStore.create({
        data: {
          eventId: `evt_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
          eventType: 'public_chat_assistant_message',
          eventVersion: '1.0',
          aggregateId: sessionId,
          aggregateType: 'PublicChat',
          aggregateVersion: 1,
          eventData: { text: reply, suggestions },
          timestamp: new Date()
        }
      })
    } catch { /* ignore */ }

    // Send to all linked channels using orchestrator
    try {
      await this.channelOrchestrator.sendToAllChannels(sessionId, {
        content: reply,
        recipientId: '', // Not needed for channel orchestrator
        messageType: 'text',
      })
    } catch (err: any) {
      // Log but don't fail the web chat response
      console.error('Failed to send to linked channels:', err?.message)
    }

    // Legacy: If session linked to WhatsApp via old system, send
    const linkedPhone = this.publicChatLinks.findWhatsAppBySession(sessionId)
    if (linkedPhone) {
      try {
        const payload: { recipientId: string; messageType: 'text'; content: string } = { recipientId: linkedPhone, messageType: 'text', content: reply }
        await (this.whatsappAdapter as unknown as { sendMessage: (profile: string, payload: { recipientId: string; messageType: 'text'; content: string }) => Promise<void> }).sendMessage('public', payload)
      } catch {
        // ignore send failures for mirror
      }
    }
    return { sessionId, reply, suggestions }
  }

  @Get('history')
  @ApiOperation({ summary: 'Get minimal chat history for a session' })
  async history(@Query('sessionId') sessionId: string) {
    return { messages: this.store.getMessages(sessionId, 20) }
  }

  @Get('stream')
  @ApiOperation({ summary: 'SSE stream for public chat session' })
  async stream(@Res() res: Response, @Query('sessionId') sessionId: string) {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders?.()
    // Send a comment/ping to keep alive
    res.write(':ok\n\n')
    this.store.addSubscriber(sessionId, res)
    res.on('close', () => this.store.removeSubscriber(sessionId, res))
  }

  @Get('whatsapp-link')
  @ApiOperation({ summary: 'Generate a WhatsApp link with session prefill' })
  async whatsappLink(@Req() req: { get: (name: string) => string | undefined }, @Query('sessionId') sessionId?: string, @Query('phone') phone?: string) {
    const tenantId = await this.resolveTenantIdFromRequest(req)
    const defaultPhone = '+14155550123'
    const p = String(phone || defaultPhone)
    const sid = sessionId || ''
    const text = encodeURIComponent(`Hello, I would like to continue our chat. Session: ${sid}`)
    if (sid && p) this.publicChatLinks.linkWhatsAppSender(sid, p)
    return { url: `https://wa.me/${p.replace(/[^\d]/g,'') || '14155550123'}?text=${text}`, tenantId }
  }

  @Post('email')
  @ApiOperation({ summary: 'Submit a public email message linked to session (stub)' })
  async email(@Req() req: { get: (name: string) => string | undefined }, @Body() body: { sessionId?: string; email: string; message: string }) {
    const tenantId = await this.resolveTenantIdFromRequest(req)
    const sessionId = String(body?.sessionId || '')
    const plainMessage = String(body?.message || '')
    const email = String(body?.email || '').trim().toLowerCase()
    if (!tenantId || !email) {
      return { ok: false, error: 'missing_tenant_or_email' }
    }
    // Basic email format check
    const emailOk = /.+@.+\..+/.test(email)
    if (!emailOk) return { ok: false, error: 'invalid_email' }

    try {
      // 1) Upsert customer by tenant+email
      let customer: { id: string } | null = await this.db.customer.findFirst({ where: { tenantId, email } })
      if (!customer) {
        customer = await this.db.customer.create({ data: { tenantId, email } })
      }

      // 2) Ensure tenant email channel exists
      let channel: { id: string } | null = await this.db.channel.findFirst({ where: { tenantId, type: 'email' } })
      if (!channel) {
        channel = await this.db.channel.create({ data: { tenantId, name: 'Email', type: 'email', config: {} } })
      }

      // 3) Create a conversation (email channel)
      const subject = (plainMessage || 'Support request').slice(0, 120)
      const conv: { id: string } = await this.db.conversation.create({
        data: {
          tenantId,
          customerId: customer.id,
          channelId: channel.id,
          subject,
          status: 'active',
          metadata: { source: 'public_help_center_email', sessionId },
        },
      })

      // 4) Link the session to conversation for future continuity (in-memory)
      if (sessionId) this.store.linkConversation(sessionId, conv.id, { channel: 'email' })

      // 5) Send confirmation email to the customer
      await this.emailService.sendEmailForTenant(tenantId as string, {
        to: email,
        subject: 'Support request received',
        html: `<p>Thanks for contacting us.</p><p>Your message:</p><blockquote>${(plainMessage || '').replace(/</g,'&lt;')}</blockquote>`
      })

      // 6) Append a notice to the public chat stream
      if (sessionId) this.store.appendMessage(sessionId, 'assistant', 'We sent you an email confirmation and opened a support thread.', Date.now())

      // 7) Best-effort: analytics event
      try {
        await this.db.eventStore.create({
          data: {
            eventId: `evt_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
            eventType: 'public_chat_email_cta',
            eventVersion: '1.0',
            aggregateId: sessionId || conv.id,
            aggregateType: 'PublicChat',
            aggregateVersion: 1,
            eventData: { tenantId, conversationId: conv.id, customerId: customer.id },
            timestamp: new Date(),
          },
        })
      } catch { /* ignore */ }

      return { ok: true, tenantId, sessionId: sessionId || null, conversationId: conv.id, customerId: customer.id }
    } catch {
      return { ok: false }
    }
  }

  @Post('magic-link')
  @ApiOperation({ summary: 'Issue a magic-link token to resume a public chat' })
  async magicLink(@Req() req: { get: (name: string) => string | undefined }, @Body() body: { sessionId: string; email?: string }) {
    const tenantId = await this.resolveTenantIdFromRequest(req)
    if (!tenantId) return { ok: false }
    const sessionId = String(body?.sessionId || '')
    if (!sessionId) return { ok: false }
    const token = this.store.createMagicLinkToken(sessionId, tenantId, body?.email)
    return { ok: true, token }
  }

  @Post('resume')
  @ApiOperation({ summary: 'Resume a public chat from a magic-link token' })
  async resume(@Body() body: { token: string }) {
    const t = String(body?.token || '')
    const info = this.store.verifyMagicLinkToken(t)
    if (!info) return { ok: false }
    // Return session metadata so client can reconnect
    return { ok: true, sessionId: info.sessionId, tenantId: info.tenantId }
  }

  @Post('link-channel')
  @ApiOperation({ summary: 'Link WhatsApp/Instagram to a chat session' })
  async linkChannel(@Body() body: { sessionId: string; channel: 'whatsapp' | 'instagram' | 'email'; contact: string }) {
    const sessionId = String(body?.sessionId || '')
    const channel = body?.channel
    const contact = String(body?.contact || '')

    if (!sessionId || !channel || !contact) {
      return { ok: false, error: 'Missing required fields' }
    }

    try {
      if (channel === 'whatsapp') {
        // Send verification code
        const result = await this.contactVerification.sendWhatsAppVerification(sessionId, contact)
        return { ok: result.success, error: result.error, requiresVerification: true }
      } else if (channel === 'instagram') {
        // Send verification code
        const result = await this.contactVerification.sendInstagramVerification(sessionId, contact)
        return { ok: result.success, error: result.error, requiresVerification: true }
      } else if (channel === 'email') {
        // Email doesn't require verification for now
        this.store.linkEmail(sessionId, contact, true)
        return { ok: true, requiresVerification: false }
      }

      return { ok: false, error: 'Invalid channel' }
    } catch (error: any) {
      return { ok: false, error: error?.message || 'Unknown error' }
    }
  }

  @Post('verify-contact')
  @ApiOperation({ summary: 'Verify phone/Instagram with code' })
  async verifyContact(@Body() body: { sessionId: string; channel: 'whatsapp' | 'instagram'; code: string }) {
    const sessionId = String(body?.sessionId || '')
    const channel = body?.channel
    const code = String(body?.code || '')

    if (!sessionId || !channel || !code) {
      return { ok: false, error: 'Missing required fields' }
    }

    try {
      const result = await this.contactVerification.verifyCode(sessionId, channel, code)
      if (result.success) {
        // Broadcast verification success via SSE
        return { ok: true, verified: true }
      }
      return { ok: false, error: result.error || 'Verification failed' }
    } catch (error: any) {
      return { ok: false, error: error?.message || 'Unknown error' }
    }
  }

  @Get('channel-status')
  @ApiOperation({ summary: 'Get linked channel status for a session' })
  async channelStatus(@Query('sessionId') sessionId: string) {
    if (!sessionId) {
      return { ok: false, error: 'Missing sessionId' }
    }

    try {
      const linkedChannels = this.store.getLinkedChannels(sessionId)
      const verificationStatus = await this.contactVerification.getVerificationStatus(sessionId)

      return {
        ok: true,
        channels: {
          whatsapp: linkedChannels?.whatsapp ? {
            linked: true,
            verified: linkedChannels.whatsapp.verified,
            phoneNumber: linkedChannels.whatsapp.phoneNumber,
            attemptsLeft: verificationStatus.whatsapp?.attemptsLeft || 0,
          } : { linked: false },
          instagram: linkedChannels?.instagram ? {
            linked: true,
            verified: linkedChannels.instagram.verified,
            igHandle: linkedChannels.instagram.igHandle,
            attemptsLeft: verificationStatus.instagram?.attemptsLeft || 0,
          } : { linked: false },
          email: linkedChannels?.email ? {
            linked: true,
            verified: linkedChannels.email.verified,
            email: linkedChannels.email.email,
          } : { linked: false },
        },
      }
    } catch (error: any) {
      return { ok: false, error: error?.message || 'Unknown error' }
    }
  }

  @Post('send-to-channel')
  @ApiOperation({ summary: 'Send a message to a specific channel' })
  async sendToChannel(@Body() body: { sessionId: string; channel: 'whatsapp' | 'instagram' | 'email'; message: string }) {
    const sessionId = String(body?.sessionId || '')
    const channel = body?.channel
    const message = String(body?.message || '')

    if (!sessionId || !channel || !message) {
      return { ok: false, error: 'Missing required fields' }
    }

    try {
      await this.channelOrchestrator.sendToSpecificChannel(sessionId, channel, {
        content: message,
        recipientId: '', // Not needed for orchestrator
        messageType: 'text',
      })
      return { ok: true }
    } catch (error: any) {
      return { ok: false, error: error?.message || 'Unknown error' }
    }
  }
}


