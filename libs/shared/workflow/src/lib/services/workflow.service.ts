import { Injectable, Logger, Inject, Optional } from '@nestjs/common'
import { PrismaService } from '@glavito/shared-database'
import { EventPublisherService } from '@glavito/shared-kafka'
// import { WorkflowExecutionService } from './workflow-execution.service'
import {
  WorkflowRule,
  WorkflowExecution,
  WorkflowInput
} from '../interfaces/workflow.interface'
import { HttpService } from '@nestjs/axios'
import { lastValueFrom } from 'rxjs'

// Define a minimal interface to avoid importing from shared-conversation
export interface EmailSender {
  sendMessage(conversationId: string, payload: any): Promise<any>
}

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventPublisher: EventPublisherService,
    private readonly http: HttpService,
    @Optional() @Inject('EMAIL_SENDER') private readonly emailAdapter?: EmailSender
  ) {}

  async createWorkflow(tenantId: string, workflowData: any): Promise<WorkflowRule> {
    try {
      this.logger.log(`Creating workflow for tenant ${tenantId}`)
      
      const workflow = await this.prisma['workflowRule'].create({
        data: {
          tenantId,
          name: workflowData.name,
          description: workflowData.description,
          // Map to existing schema fields (align to interface types)
          type: (workflowData.type as any) || 'automation',
          priority: workflowData.priority ?? 0,
          // Support both old and new structures
          conditions: Array.isArray(workflowData.conditions)
            ? workflowData.conditions
            : (workflowData.conditions || workflowData.triggerConditions
              ? [workflowData.conditions || workflowData.triggerConditions]
              : []),
          actions: Array.isArray(workflowData.actions)
            ? workflowData.actions
            : (workflowData.actions ? [workflowData.actions] : []),
          // ensure array shape for triggers JSON
          triggers: Array.isArray(workflowData.triggers) ? workflowData.triggers : (workflowData.triggers || []),
          isActive: workflowData.isActive ?? true,
          metadata: {
            // Start with existing metadata
            ...(workflowData.metadata || {}),
            // Include new structure in metadata
            ...(workflowData.nodes && { nodes: workflowData.nodes }),
            ...(workflowData.connections && { connections: workflowData.connections }),
            ...(workflowData.settings && { settings: workflowData.settings }),
            ...(workflowData.variables && { variables: workflowData.variables }),
            // Set default values for new fields
            category: workflowData.metadata?.category || workflowData.category || 'general',
            tags: workflowData.metadata?.tags || workflowData.tags || [],
            version: workflowData.metadata?.version || workflowData.version || '1.0',
            createdBy: workflowData.metadata?.createdBy || workflowData.createdBy || 'system',
            status: workflowData.metadata?.status || (workflowData.isActive ? 'active' : 'inactive')
          }
        } as any
      })

      // Publish workflow created event

      return workflow as any
    } catch (error) {
      this.logger.error(`Failed to create workflow for tenant ${tenantId}:`, error)
      throw error
    }
  }

  /**
   * Execute all active workflows for a tenant that match a given trigger payload.
   * Supports event- and schedule-based triggers as stored in WorkflowRule.triggers (JSON array).
   */
  async executeWorkflowByTrigger(
    triggerType: 'event' | 'schedule' | 'manual' | string,
    data: Record<string, any>
  ): Promise<WorkflowExecution[]> {
    try {
      const tenantId: string | undefined = (data as any)?.tenantId
      // Fetch active workflows for tenant (filter in memory for JSON triggers)
      const where: any = { isActive: true }
      if (tenantId) where.tenantId = tenantId
      const candidates = (await this.prisma['workflowRule'].findMany({ where })) as any[]

      const matched = candidates.filter((wf) => this.matchesTrigger(wf, triggerType, data))

      const executions: WorkflowExecution[] = []
      for (const wf of matched) {
        const exec = await this.executeWorkflow(
          wf.id,
          { data, triggerData: data, context: { tenantId } },
          (data as any)?.triggeredBy || 'system',
          (triggerType as any) || 'event'
        )
        executions.push(exec)
      }

      return executions
    } catch (error) {
      this.logger.error(`Failed to execute workflows for trigger ${triggerType}:`, error)
      throw error
    }
  }

  private matchesTrigger(wf: any, triggerType: string, payload: Record<string, any>): boolean {
    try {
      const triggers = Array.isArray(wf?.triggers) ? wf.triggers : []
      for (const t of triggers) {
        const tType = (t?.type || t?.triggerType)
        if (tType === triggerType) {
          // If it's an event trigger and an eventType is specified, ensure it matches
          const expectedEvent = (t as any)?.configuration?.eventType || (t as any)['eventType']
          const incomingEvent = (payload as any)['eventType']
          if (triggerType === 'event' && expectedEvent && expectedEvent !== incomingEvent) {
            continue
          }
          // Optional condition evaluation
          if (!t?.conditions || this.evaluateCondition(payload, t.conditions)) {
            return true
          }
        }
      }
      return false
    } catch (e) {
      return false
    }
  }

  private evaluateCondition(payload: Record<string, any>, cond: any): boolean {
    try {
      if (!cond) return true
      if (cond.all) {
        return (cond.all as any[]).every((c) => this.evaluateCondition(payload, c))
      }
      if (cond.any) {
        return (cond.any as any[]).some((c) => this.evaluateCondition(payload, c))
      }
      // Basic and extended operator support
      const { field, op, operator, value, values } = cond
      const v = field?.split('.')?.reduce((acc: any, k: string) => (acc ? acc[k] : undefined), payload)
      const opKey = (op || operator || 'eq').toString().toLowerCase()
      switch (opKey) {
        case 'eq':
        case 'equals':
          return v === value
        case 'neq':
        case 'not_equals':
          return v !== value
        case 'gt':
        case 'greater_than':
          return Number(v) > Number(value)
        case 'gte':
        case 'greater_than_or_equal':
          return Number(v) >= Number(value)
        case 'lt':
        case 'less_than':
          return Number(v) < Number(value)
        case 'lte':
        case 'less_than_or_equal':
          return Number(v) <= Number(value)
        case 'in':
          return Array.isArray(values) ? values.includes(v) : Array.isArray(value) ? value.includes(v) : false
        case 'not_in':
          return Array.isArray(values) ? !values.includes(v) : Array.isArray(value) ? !value.includes(v) : true
        case 'contains':
          return Array.isArray(v) ? v.includes(value) : String(v || '').includes(String(value))
        case 'regex':
          try { return new RegExp(String(value)).test(String(v ?? '')) } catch { return false }
        default:
          return false
      }
    } catch (e) {
      return false
    }
  }

  private async runInternalActions(wf: any, payload: Record<string, unknown>): Promise<void> {
    const actions = Array.isArray(wf?.actions) ? wf.actions : []
    
    if (actions.length === 0) {
      this.logger.debug(`No actions to execute for workflow ${wf?.id}`)
      return
    }

    for (const action of actions) {
      // Skip disabled actions
      if (action?.enabled === false) {
        this.logger.debug(`Skipping disabled action: ${action?.type}`)
        continue
      }

      const type = String(action?.type || action?.actionType || '').toLowerCase()
      const cfg = action?.config || action
      
      try {
        this.logger.debug(`Executing action: ${type} for workflow ${wf?.id}`)
        
        if (type === 'create_ticket' && (cfg.title || cfg.subject)) {
          const subject: string = cfg.subject || cfg.title
          const customerId: string | null = (cfg.customerId || (payload as any)?.customerId) ?? null
          const tenantId: string | undefined = (payload as any)?.tenantId || cfg.tenantId
          const channelId: string | undefined = (cfg.channelId || (payload as any)?.channelId)
          if (!tenantId || !channelId) {
            this.logger.warn(`CREATE_TICKET skipped: missing ${!tenantId ? 'tenantId' : 'channelId'}`)
          } else {
            const ticket = await this.prisma['ticket'].create({
              data: {
                tenantId,
                channelId,
                subject,
                description: cfg.description || '',
                status: cfg.status || 'open',
                priority: cfg.priority || 'medium',
                customerId,
              } as any
            })
            await this.safePublishTicketEvent('ticket.created', tenantId as string, { ticketId: (ticket as any)?.id, ...ticket })
          }
        } else if (type === 'add_ticket_note' && cfg.ticketId && cfg.note) {
          const ticketId = cfg.ticketId as string
          await this.prisma['ticketTimelineEvent'].create({
            data: {
              ticketId,
              userId: (payload as any)?.userId || (cfg as any)?.userId || null,
              eventType: 'note_added',
              description: cfg.note,
              metadata: cfg.metadata || {}
            } as any
          })
          await this.safePublishTicketEvent('ticket.updated', (payload as any)?.tenantId as string, {
            ticketId,
            timeline: { eventType: 'note_added', description: cfg.note }
          })
        } else if (type === 'add_ticket_timeline' && cfg.ticketId && (cfg.message || cfg.description)) {
          const ticketId = cfg.ticketId as string
          await this.prisma['ticketTimelineEvent'].create({
            data: {
              ticketId,
              userId: (payload as any)?.userId || (cfg as any)?.userId || null,
              eventType: cfg.eventType || 'workflow.action',
              description: cfg.message || cfg.description,
              metadata: cfg.metadata || {}
            } as any
          })
          await this.safePublishTicketEvent('ticket.updated', (payload as any)?.tenantId as string, {
            ticketId,
            timeline: { eventType: cfg.eventType || 'workflow.action', description: cfg.message || cfg.description }
          })
        } else if (type === 'change_status' && cfg.ticketId && cfg.status) {
          await this.prisma['ticket'].update({ where: { id: cfg.ticketId as string }, data: { status: String(cfg.status) } as any })
          await this.safePublishTicketEvent('ticket.updated', (payload as any)?.tenantId as string, {
            ticketId: cfg.ticketId,
            changes: { status: cfg.status }
          })
        } else if (type === 'close_ticket' && (cfg.ticketId || (payload as any)?.ticketId)) {
          const ticketId = (cfg.ticketId || (payload as any)?.ticketId) as string
          await this.prisma['ticket'].update({ where: { id: ticketId }, data: { status: 'closed', resolvedAt: new Date() } as any })
          await this.safePublishTicketEvent('ticket.updated', (payload as any)?.tenantId as string, {
            ticketId,
            changes: { status: 'closed' }
          })
        } else if (type === 'notify_team' && cfg.teamId && (cfg.message || cfg.payload)) {
          await this.safePublishTicketEvent('ticket.updated', (payload as any)?.tenantId as string, {
            ticketId: cfg.ticketId || (payload as any)?.ticketId,
            teamNotification: { teamId: cfg.teamId, message: cfg.message, payload: cfg.payload || {} }
          })
        // New: SEND_EMAIL action
        } else if ([type.toLowerCase()].includes('send_email') || [type.toUpperCase()].includes('SEND_EMAIL') || type === 'SEND_EMAIL') {
          const to = (cfg as any).to || (payload as any)?.customer?.email || (payload as any)?.email
          if (!to) {
            this.logger.warn(`SEND_EMAIL action skipped: missing recipient email`)
          } else if (!this.emailAdapter) {
            this.logger.warn(`SEND_EMAIL action skipped: EMAIL_SENDER provider not registered`)
          } else {
            const subject = (cfg as any).subject || (cfg as any).title || 'Notification'
            const html = (cfg as any).html || (cfg as any).content || undefined
            const text = (cfg as any).text || (typeof (cfg as any).content === 'string' ? (cfg as any).content : undefined)
            try {
              await this.emailAdapter.sendMessage('workflow:' + (wf?.id || 'unknown'), {
                recipientId: to,
                messageType: 'email',
                content: text || (html ? '' : ' '),
                metadata: {
                  subject,
                  html,
                  text,
                  ...((cfg as any).metadata || {})
                },
              })
            } catch (e) {
              this.logger.warn(`SEND_EMAIL failed: ${e instanceof Error ? e.message : 'error'}`)
            }
          }
        // New: API_CALL action
        } else if (['send_template_message', 'SEND_TEMPLATE_MESSAGE', 'sendTemplateMessage'].includes(type)) {
          // Multi-channel template sending. Prefer internal conversations API when conversationId known.
          const channel = (cfg as any).channel || (payload as any)?.channel || 'auto'
          const conversationId: string | undefined = (cfg as any).conversationId
            || (payload as any)?.conversationId
            || await this.findConversationIdByTicketOrCustomer((payload as any)?.ticketId, (payload as any)?.customerId)
          const templateId: string | undefined = (cfg as any).templateId
          const templateParams: Record<string, any> | undefined = (cfg as any).templateParams
          const content: string | undefined = (cfg as any).content
          const tenantId: string | undefined = (payload as any)?.tenantId || (cfg as any)?.tenantId
          const intent: string | undefined = (cfg as any)?.intent || (payload as any)?.intent || (payload as any)?.ai?.intent
          const confidence: number | undefined = (cfg as any)?.confidence || (payload as any)?.confidence || (payload as any)?.ai?.intentConfidence

          // Enforce autopilot policies for non-email channels
          if (tenantId && channel !== 'email') {
            const policy = await this.enforceAutopilotPolicies(tenantId, String(channel), conversationId, confidence, intent)
            if (!policy.allowed) {
              await this.addTicketTimelineIfPossible((payload as any)?.ticketId, (payload as any)?.userId, 'autopilot_blocked', `Auto-reply blocked: ${policy.reason || 'policy'}`, { channel, intent, confidence })
              break
            }
          }

          if (!conversationId && channel !== 'email') {
            this.logger.warn(`SEND_TEMPLATE_MESSAGE skipped: no conversationId and non-email channel`)
          } else if (channel === 'email') {
            const to = (cfg as any).to || (payload as any)?.customer?.email || (payload as any)?.email
            if (!to) {
              this.logger.warn(`SEND_TEMPLATE_MESSAGE email skipped: missing recipient email`)
            } else if (!this.emailAdapter) {
              this.logger.warn(`SEND_TEMPLATE_MESSAGE email skipped: EMAIL_SENDER provider not registered`)
            } else {
              const subject = (cfg as any).subject || (cfg as any).title || 'Notification'
              const html = (cfg as any).html || (cfg as any).content || undefined
              const text = (cfg as any).text || (typeof (cfg as any).content === 'string' ? (cfg as any).content : undefined)
              try {
                await this.emailAdapter.sendMessage('workflow:' + (wf?.id || 'unknown'), {
                  recipientId: to,
                  messageType: 'email',
                  content: text || (html ? '' : ' '),
                  metadata: {
                    subject,
                    html,
                    text,
                    templateId,
                    templateParams: templateParams || {},
                    ...((cfg as any).metadata || {})
                  },
                })
              } catch (e) {
                this.logger.warn(`SEND_TEMPLATE_MESSAGE email failed: ${e instanceof Error ? e.message : 'error'}`)
              }
            }
          } else {
            // Use internal API if configured to send via conversations controller
            const envAny = process.env as Record<string, string | undefined>
            const baseUrl = envAny['INTERNAL_API_BASE_URL'] || envAny['APP_URL'] || 'http://localhost:3000'
            const token = envAny['INTERNAL_API_TOKEN']
            if (!baseUrl) {
              this.logger.warn(`SEND_TEMPLATE_MESSAGE skipped: INTERNAL_API_BASE_URL not set`)
            } else if (!conversationId) {
              this.logger.warn(`SEND_TEMPLATE_MESSAGE skipped: missing conversationId`)
            } else {
              const url = `${baseUrl.replace(/\/$/, '')}/v1/conversations/advanced/${conversationId}/messages`
              const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
              const body = {
                content: content || '',
                messageType: templateId ? 'template' : 'text',
                templateId,
                templateParams
              }
              try {
                await lastValueFrom(this.http.post(url, body, { headers }))
                // Log autopilot sent for rate limit accounting
                if (tenantId && conversationId) {
                  try {
                    await (this.prisma['conversationEventLog'] as any).create({
                      data: { conversationId, eventType: 'autopilot.sent', eventData: { channel, templateId, intent, confidence } }
                    })
                  } catch { /* noop */ }
                }
              } catch (e) {
                this.logger.warn(`SEND_TEMPLATE_MESSAGE http failed: ${e instanceof Error ? e.message : 'error'}`)
              }
            }
          }
        } else if (['create_or_update_ticket', 'CREATE_OR_UPDATE_TICKET'].includes(type)) {
          const tenantId: string | undefined = (payload as any)?.tenantId || (cfg as any)?.tenantId
          const customerId: string | undefined = (cfg as any).customerId || (payload as any)?.customerId
          const subject: string = (cfg as any).subject || (payload as any)?.subject || 'Support request'
          const description: string = (cfg as any).description || (payload as any)?.description || ''
          if (!tenantId || !customerId) {
            this.logger.warn(`CREATE_OR_UPDATE_TICKET skipped: missing ${!tenantId ? 'tenantId' : 'customerId'}`)
          } else {
            // Try find recent open ticket for customer
            const recentThreshold = new Date(Date.now() - 6 * 60 * 60 * 1000)
            const existing = await (this.prisma['ticket'] as any).findFirst({
              where: {
                tenantId,
                customerId,
                status: { in: ['open', 'pending', 'in_progress', 'waiting'] },
                updatedAt: { gte: recentThreshold }
              },
              orderBy: { updatedAt: 'desc' }
            })
            if (existing) {
              await (this.prisma['ticket'] as any).update({
                where: { id: existing.id },
                data: {
                  subject,
                  description: description || existing.description,
                  priority: (cfg as any).priority || existing.priority,
                  tags: Array.isArray((cfg as any).tags) ? (cfg as any).tags : existing.tags
                }
              })
              await this.safePublishTicketEvent('ticket.updated', tenantId as string, { ticketId: existing.id, changes: { subject, description } })
            } else {
              const created = await (this.prisma['ticket'] as any).create({
                data: {
                  tenantId,
                  customerId,
                  channelId: (cfg as any).channelId || (payload as any)?.channelId,
                  subject,
                  description,
                  status: 'open',
                  priority: (cfg as any).priority || 'medium',
                  tags: Array.isArray((cfg as any).tags) ? (cfg as any).tags : []
                }
              })
              await this.safePublishTicketEvent('ticket.created', tenantId as string, { ticketId: (created as any).id, ...created })
            }
          }
        } else if (['fetch_invoice', 'FETCH_INVOICE'].includes(type)) {
          const tenantId: string | undefined = (payload as any)?.tenantId || (cfg as any)?.tenantId
          const customerId: string | undefined = (cfg as any)?.customerId || (payload as any)?.customerId
          const ticketId: string | undefined = (cfg as any)?.ticketId || (payload as any)?.ticketId
          if (!tenantId) {
            this.logger.warn('FETCH_INVOICE skipped: missing tenantId')
          } else {
            try {
              // Fetch latest payment intent as invoice proxy for now
              const p = await (this.prisma['paymentIntent'] as any).findFirst({
                where: {
                  tenantId,
                  ...(customerId ? { customerId } : {})
                },
                orderBy: { createdAt: 'desc' }
              })
              if (!p) {
                await this.addTicketTimelineIfPossible(ticketId, (payload as any)?.userId, 'invoice_not_found', `No invoice/payment found for customer`)  
              } else {
                const summary = {
                  paymentId: p.stripePaymentId || p.id,
                  amount: p.amount,
                  currency: p.currency,
                  status: p.status,
                  description: p.description,
                  receiptEmail: p.receiptEmail,
                  createdAt: p.createdAt
                }
                // Attach to ticket timeline for agent visibility
                await this.addTicketTimelineIfPossible(ticketId, (payload as any)?.userId, 'invoice_lookup', `Invoice/payment found: ${summary.paymentId}`, { summary })
              }
            } catch (e) {
              this.logger.warn(`FETCH_INVOICE failed: ${e instanceof Error ? e.message : 'error'}`)
            }
          }
        } else if (['API_CALL', 'api_call', 'api.request', 'api_call'].includes(type)) {
          const url: string = (cfg as any).url || (cfg as any).endpoint
          if (!url) {
            this.logger.warn(`API_CALL action skipped: missing url`)
          } else {
            const method = ((cfg as any).method || 'POST').toString().toUpperCase()
            const headers = (cfg as any).headers || {}
            const body = (cfg as any).body ?? (payload as any)?.data ?? payload
            const timeoutMs = Number((cfg as any).timeoutMs || (cfg as any).timeout || 10000)
            try {
              await lastValueFrom(this.http.request({ url, method, headers, data: body, timeout: timeoutMs }))
            } catch (e) {
              this.logger.warn(`API_CALL failed to ${method} ${url}: ${e instanceof Error ? e.message : 'error'}`)
            }
          }
        }
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Unknown error'
        this.logger.error(`Action failed (${type}) in workflow ${wf?.id}: ${errorMsg}`, e instanceof Error ? e.stack : undefined)
        
        // Store error in workflow execution metadata for debugging
        try {
          const executionId = (payload as any)?._executionId
          if (executionId) {
            await this.prisma['workflowExecution'].update({
              where: { id: executionId },
              data: {
                metadata: {
                  lastError: { type, message: errorMsg, timestamp: new Date().toISOString() }
                } as any
              }
            }).catch(() => {/* ignore meta update errors */})
          }
        } catch {/* ignore */}
        
        // Check if action has retry policy
        const retryPolicy = action?.onError
        if (retryPolicy?.action === 'stop') {
          throw e
        } else if (retryPolicy?.action === 'retry') {
          const retryCount = retryPolicy.retryCount || 3
          this.logger.warn(`Will retry action ${type} up to ${retryCount} times with ${retryPolicy.retryDelay || 1000}ms delay`)
          // TODO: Implement actual retry logic with exponential backoff
        }
        // Default: continue to next action
      }
    }
  }

  private async findConversationIdByTicketOrCustomer(ticketId?: string, customerId?: string): Promise<string | undefined> {
    try {
      if (ticketId) {
        const c = await (this.prisma['conversationAdvanced'] as any).findFirst({ where: { ticketId }, select: { id: true } })
        if (c?.id) return String(c.id)
      }
      if (customerId) {
        const c = await (this.prisma['conversationAdvanced'] as any).findFirst({ where: { customerId }, orderBy: { updatedAt: 'desc' }, select: { id: true } })
        if (c?.id) return String(c.id)
      }
    } catch { /* noop */ }
    return undefined
  }

  private async addTicketTimelineIfPossible(ticketId: string | undefined, userId: string | undefined, eventType: string, description: string, metadata?: Record<string, unknown>) {
    try {
      if (!ticketId) return
      await (this.prisma['ticketTimelineEvent'] as any).create({
        data: {
          ticketId,
          userId: userId || null,
          eventType,
          description,
          metadata: metadata || {}
        }
      })
      await this.safePublishTicketEvent('ticket.updated', (metadata as any)?.tenantId as string, { ticketId, timeline: { eventType, description }, ...metadata })
    } catch { /* noop */ }
  }

  private async enforceAutopilotPolicies(
    tenantId: string,
    channel: string,
    conversationId?: string,
    confidence?: number,
    intent?: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // Load tenant autopilot config
      const settings = await (this.prisma as any)['aISettings']?.findUnique?.({ where: { tenantId } }).catch(() => null)
      const mode = (settings?.mode || 'off') as 'off'|'draft'|'auto'
      if (mode === 'off') return { allowed: false, reason: 'autopilot_off' }

      // Allowed channels
      const allowedChannels: string[] = Array.isArray(settings?.allowedChannels) ? settings.allowedChannels : []
      if (allowedChannels.length && !allowedChannels.includes(channel)) {
        return { allowed: false, reason: 'channel_not_allowed' }
      }

      // Min confidence
      const minConfidence = typeof settings?.minConfidence === 'number' ? settings.minConfidence : 0.7
      if (typeof confidence === 'number' && confidence < minConfidence) {
        return { allowed: false, reason: 'low_confidence' }
      }

      // Allowed intents (optional guardrail)
      const allowedIntents: string[] | undefined = (settings?.guardrails as any)?.allowedIntents
      if (Array.isArray(allowedIntents) && intent && !allowedIntents.includes(intent)) {
        return { allowed: false, reason: 'intent_not_allowed' }
      }

      // Rate limit per conversation (per hour)
      const maxPerHour = typeof settings?.maxAutoRepliesPerHour === 'number' ? settings.maxAutoRepliesPerHour : 10
      if (conversationId && maxPerHour > 0) {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
        const count = await (this.prisma['conversationEventLog'] as any).count({
          where: { conversationId, eventType: { in: ['autopilot.request', 'autopilot.sent'] }, createdAt: { gte: oneHourAgo } }
        })
        if (count >= maxPerHour) {
          return { allowed: false, reason: 'rate_limited' }
        }
      }

      return { allowed: true }
    } catch (e) {
      // Fail-safe: allow if policy evaluation fails
      this.logger.warn(`Autopilot policy check failed: ${e instanceof Error ? e.message : 'error'}`)
      return { allowed: true }
    }
  }

  private async safePublishTicketEvent(eventType: any, tenantId: string | undefined, data: any): Promise<void> {
    try {
      const payload = {
        eventType: String(eventType),
        tenantId: (tenantId || data?.tenantId || 'system') as string,
        timestamp: new Date().toISOString(),
        data: {
          tenantId: (tenantId || data?.tenantId || 'system') as string,
          ticketId: (data?.ticketId || data?.id || 'unknown') as string,
          ...data,
        },
      }
      await this.eventPublisher.publishTicketEvent(payload as any)
    } catch (e) {
      this.logger.warn(`Failed to publish ticket event ${eventType}: ${e instanceof Error ? e.message : 'error'}`)
    }
  }

  async executeWorkflow(
    workflowId: string,
    input: WorkflowInput,
    triggeredBy: string,
    triggerType = 'manual'
  ): Promise<WorkflowExecution> {
    const start = Date.now()
    try {
      const workflow = await this.prisma['workflowRule'].findUnique({ where: { id: workflowId } })
      if (!workflow) throw new Error(`Workflow ${workflowId} not found`)

      const execution = await this.prisma['workflowExecution'].create({
        data: {
          workflowId,
          triggeredBy,
          status: 'running' as any,
          startedAt: new Date(start),
          input: (input as any)?.data ?? (input as any) ?? {},
          metadata: { triggerType }
        } as any
      })

      // Execute internal actions
      await this.runInternalActions(workflow, input?.data || {})

      // Finish immediately (internal-only)
      const endNoN8N = Date.now()
      const updated = await this.prisma['workflowExecution'].update({
        where: { id: execution.id },
        data: {
          status: 'completed' as any,
          completedAt: new Date(endNoN8N),
          duration: endNoN8N - start,
          metadata: { triggerType, result: { success: true } }
        } as any
      })
      return updated as any
    } catch (error) {
      const end = Date.now()
      try {
        await this.prisma['workflowExecution'].create({
          data: {
            workflowId,
            triggeredBy,
            status: 'failed',
            startedAt: new Date(start),
            completedAt: new Date(end),
            duration: end - start,
            metadata: { triggerType, result: { success: false, error: error instanceof Error ? error.message : 'error' } }
          } as any
        })
      } catch (_e) { /* noop */ }
      this.logger.error(`Workflow ${workflowId} execution failed:`, error)
      throw error
    }
  }

  async getWorkflows(tenantId: string): Promise<WorkflowRule[]> {
    const list = await this.prisma['workflowRule'].findMany({ where: { tenantId } })
    return list as any
  }

  async getWorkflowExecutionHistory(workflowId: string, limit = 50): Promise<WorkflowExecution[]> {
    const list = await this.prisma['workflowExecution'].findMany({ where: { workflowId }, orderBy: { startedAt: 'desc' }, take: limit })
    return list as any
  }

  async getWorkflowAnalytics(
    workflowId: string,
    dateRange?: { startDate: Date; endDate: Date }
  ): Promise<Record<string, any>> {
    const executions = await this.prisma['workflowExecution'].findMany({ where: { workflowId } })
    const total = executions.length
    const success = executions.filter((e: any) => e.status === 'completed').length
    const failed = executions.filter((e: any) => e.status === 'failed').length
    const avgDuration = executions.reduce((sum: number, e: any) => sum + (e.duration || 0), 0) / (total || 1)

    return { total, success, failed, avgDuration }
  }

  async createIntegration(payload: any): Promise<any> {
    return { id: 'integration_id', ...payload }
  }

  async testIntegration(integrationId: string): Promise<any> {
    return { id: integrationId, status: 'ok' }
  }

  async getWorkflow(workflowId: string): Promise<WorkflowRule | null> {
    const wf = await this.prisma['workflowRule'].findUnique({ where: { id: workflowId } })
    return wf as any
  }

  async updateWorkflow(workflowId: string, updateData: any): Promise<WorkflowRule> {
    const normalized: any = { ...updateData }
    if (normalized.conditions) {
      normalized.conditions = Array.isArray(normalized.conditions) ? normalized.conditions : [normalized.conditions]
    }
    if (normalized.actions) {
      normalized.actions = Array.isArray(normalized.actions) ? normalized.actions : [normalized.actions]
    }
    if (normalized.triggers) {
      normalized.triggers = Array.isArray(normalized.triggers) ? normalized.triggers : [normalized.triggers]
    }
    if (normalized.type && !['routing','escalation','automation','sla'].includes(String(normalized.type))) {
      normalized.type = 'automation'
    }

    const wf = await this.prisma['workflowRule'].update({ where: { id: workflowId }, data: normalized as any })
    
    // N8N removed: no external sync required
    
    return wf as any
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    // Delete from database
    await this.prisma['workflowRule'].delete({ where: { id: workflowId } })
  }
}