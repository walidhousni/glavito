import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common'
import { DatabaseService } from '@glavito/shared-database'
import { ExecutionEngine } from './execution.engine'

@Injectable()
export class FlowsService {
  private readonly logger = new Logger(FlowsService.name)
  constructor(private readonly db: DatabaseService, private readonly engine: ExecutionEngine) {}

  async list(opts: { tenantId?: string } = {}) {
    return this.db.flow.findMany({
      where: opts.tenantId ? { tenantId: opts.tenantId } : {},
      include: { currentVersion: true }
    })
  }

  async get(id: string, tenantId?: string) {
    const flow = await this.db.flow.findFirst({
      where: { id, ...(tenantId ? { tenantId } : {}) },
      include: { currentVersion: { include: { nodes: true, edges: true } } }
    })
    if (!flow) throw new NotFoundException('Flow not found')
    return flow
  }

  async create(dto: Record<string, unknown>) {
    const rawKey = ((dto as any)?.tenantId ?? process.env.DEFAULT_TENANT_ID ?? '')
    const tenantKey = String(rawKey).trim()
    // Accept either tenant id, subdomain, or slug; allow dev fallback if missing
    let tenant = null as any
    if (tenantKey) {
      tenant = await this.db.tenant.findUnique({ where: { id: tenantKey } })
      if (!tenant) {
        tenant = await this.db.tenant.findUnique({ where: { subdomain: tenantKey } })
      }
      if (!tenant) {
        tenant = await this.db.tenant.findUnique({ where: { slug: tenantKey } })
      }
    }
    if (!tenant) {
      // Dev fallback: if single tenant exists, use it
      const count = await this.db.tenant.count()
      if (process.env.NODE_ENV !== 'production' && count === 1) {
        tenant = await this.db.tenant.findFirst({})
      }
    }
    if (!tenant) {
      throw new BadRequestException('invalid tenantId')
    }
    const name = String(((dto as any)?.name || 'Untitled Flow')).trim()
    const status = String(((dto as any)?.status || 'draft')).trim()
    const description = (dto as any)?.description as string | undefined
    const created = await this.db.flow.create({ data: { tenantId: String(tenant.id), name, description, status } })
    return created
  }

  async update(id: string, dto: Record<string, unknown>) {
    await this.ensure(id)
    return this.db.flow.update({ where: { id }, data: dto })
  }

  async remove(id: string) {
    await this.ensure(id)
    await this.db.flow.delete({ where: { id } })
    return { success: true }
  }

  async publish(id: string) {
    const flow = await this.ensure(id)
    const latest = await this.db.flowVersion.findFirst({
      where: { flowId: id },
      orderBy: { version: 'desc' }
    })
    const nextVersion = (latest?.version ?? 0) + 1
    const baseGraph = (flow as unknown as { currentVersion?: { graph?: unknown } }).currentVersion?.graph ?? {}
    const version = await this.db.flowVersion.create({
      data: {
        flowId: id,
        version: nextVersion,
        isPublished: true,
        graph: baseGraph
      }
    })
    await this.db.flow.update({ where: { id }, data: { status: 'published', currentVersionId: version.id } })
    return { id, versionId: version.id, version: nextVersion }
  }

  async run(id: string, payload: { tenantId: string; input?: unknown; context?: unknown }) {
    const flow = await this.db.flow.findUnique({ where: { id }, include: { currentVersion: true } })
    if (!flow) throw new NotFoundException('Flow not found')
    const tenantId = payload?.tenantId
    if (!tenantId) throw new Error('tenantId is required')
    const run = await this.db.flowRun.create({
      data: {
        flowId: id,
        versionId: flow.currentVersionId || undefined,
        tenantId,
        status: 'pending',
        input: payload?.input ?? {},
        context: payload?.context ?? {}
      }
    })
    // fire-and-forget execute
    this.engine.execute(run.id).catch((err: unknown) => {
      const msg = err instanceof Error ? `${err.name}: ${err.message}` : 'Unknown error'
      this.logger.error(`Execution failed for run ${run.id}: ${msg}`)
    })
    return { runId: run.id, status: 'pending' }
  }

  async resume(runId: string, payload?: { input?: Record<string, unknown> }) {
    const run = await this.db.flowRun.findUnique({ where: { id: runId } })
    if (!run) throw new NotFoundException('Run not found')
    const mergedInput = { ...(run.input as Record<string, unknown>), ...(payload?.input || {}) }
    await this.db.flowRun.update({ where: { id: runId }, data: { status: 'pending', input: mergedInput as any } })
    this.engine.execute(runId).catch((err: unknown) => {
      const msg = err instanceof Error ? `${err.name}: ${err.message}` : 'Unknown error'
      this.logger.error(`Resume failed for run ${runId}: ${msg}`)
    })
    return { runId, status: 'pending' }
  }

  private async ensure(id: string) {
    const flow = await this.db.flow.findUnique({ where: { id } })
    if (!flow) throw new NotFoundException('Flow not found')
    return flow
  }

  async clone(id: string, opts?: { name?: string }) {
    const flow = await this.ensure(id)
    const name = opts?.name || `${(flow as unknown as { name?: string }).name ?? 'Flow'} (Copy)`
    const src = flow as unknown as Record<string, unknown>
    const created = await this.db.flow.create({
      data: {
        tenantId: String(src['tenantId'] as string),
        name,
        description: (src['description'] as string) ?? undefined,
        status: 'draft',
        currentVersionId: null,
      }
    })
    return created
  }

  async createVersion(id: string, payload?: { graph?: unknown; isPublished?: boolean }) {
    await this.ensure(id)
    const latest = await this.db.flowVersion.findFirst({ where: { flowId: id }, orderBy: { version: 'desc' } })
    const nextVersion = (latest?.version ?? 0) + 1
    const version = await this.db.flowVersion.create({ data: { flowId: id, version: nextVersion, isPublished: !!payload?.isPublished, graph: payload?.graph ?? {} } })
    // Make newly created version the current working version on the flow for editing/publishing
    await this.db.flow.update({ where: { id }, data: { currentVersionId: version.id, status: payload?.isPublished ? 'published' : 'draft' } })
    return version
  }

  async listRuns(flowId: string, tenantId?: string) {
    return this.db.flowRun.findMany({ where: { flowId, ...(tenantId ? { tenantId } : {}) }, orderBy: { startedAt: 'desc' } })
  }

  async listRunEvents(runId: string) {
    return this.db.flowEvent.findMany({ where: { runId }, orderBy: { timestamp: 'asc' } })
  }

  async listVersions(flowId: string) {
    await this.ensure(flowId)
    return this.db.flowVersion.findMany({
      where: { flowId },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        version: true,
        isPublished: true,
        createdAt: true,
        graph: true,
      },
    })
  }

  async listTemplates(tenantId?: string) {
    return this.db.flowTemplate.findMany({
      where: {
        isActive: true,
        OR: [
          { tenantId: tenantId ?? undefined },
          { tenantId: null },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, name: true, description: true, category: true, tags: true, isGlobal: true, graph: true },
    })
  }

  async createFromTemplate(templateId: string, payload: { name: string; tenantId: string; createdById?: string }) {
    const template = await this.db.flowTemplate.findUnique({ where: { id: templateId } })
    if (!template) throw new NotFoundException('Template not found')
    const flow = await this.db.flow.create({
      data: {
        name: payload.name,
        tenantId: payload.tenantId,
        status: 'draft',
        createdById: payload.createdById,
      },
    })
    const latest = await this.db.flowVersion.findFirst({ where: { flowId: flow.id }, orderBy: { version: 'desc' } })
    const nextVersion = (latest?.version ?? 0) + 1
    const version = await this.db.flowVersion.create({
      data: {
        flowId: flow.id,
        version: nextVersion,
        isPublished: false,
        graph: (template as unknown as { graph?: unknown }).graph ?? {},
        createdById: payload.createdById,
      },
    })
    await this.db.flow.update({ where: { id: flow.id }, data: { currentVersionId: version.id } })
    return { ...flow, currentVersion: version }
  }

  async seedTemplates(tenantId?: string) {
    // Only seed if no templates exist for given scope
    const existing = await this.db.flowTemplate.count({ where: { OR: [{ tenantId: tenantId ?? undefined }, { tenantId: null }] } })
    if (existing > 0) {
      return { seeded: 0, skipped: true }
    }
    const templates = [
      {
        name: 'Support Triage',
        description: 'Route incoming messages based on keywords to the right queue',
        category: 'routing',
        tags: ['triage', 'routing'],
        isGlobal: true,
        graph: {
          nodes: [
            { id: 'start', type: 'trigger.channel', name: 'On Message', x: 100, y: 80, config: { channel: 'whatsapp' } },
            { id: 'cond', type: 'condition', name: 'Check Keywords', x: 320, y: 80, config: { expression: "variables.text?.includes('billing')" } },
            { id: 'send', type: 'send.message', name: 'Send Ack', x: 540, y: 80, config: { channel: 'whatsapp', content: 'Thanks! We will connect you to billing.' } },
            { id: 'end', type: 'end', name: 'End', x: 760, y: 80, config: {} },
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'cond' },
            { id: 'e2', source: 'cond', target: 'send' },
            { id: 'e3', source: 'send', target: 'end' },
          ],
        },
      },
      {
        name: 'After-hours Responder',
        description: 'Auto-reply outside business hours',
        category: 'availability',
        tags: ['after-hours', 'auto-reply'],
        isGlobal: true,
        graph: {
          nodes: [
            { id: 'start', type: 'trigger.channel', name: 'On Message', x: 100, y: 80, config: { channel: 'instagram' } },
            { id: 'cond', type: 'condition', name: 'Is After Hours', x: 320, y: 80, config: { expression: "new Date().getHours() < 9 || new Date().getHours() > 18" } },
            { id: 'send', type: 'send.message', name: 'Send Auto Reply', x: 540, y: 80, config: { channel: 'instagram', content: 'We are offline. We will reply next business day.' } },
            { id: 'end', type: 'end', name: 'End', x: 760, y: 80, config: {} },
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'cond' },
            { id: 'e2', source: 'cond', target: 'send' },
            { id: 'e3', source: 'send', target: 'end' },
          ],
        },
      },
      {
        name: 'CSAT Follow-up',
        description: 'Send CSAT survey after ticket resolution',
        category: 'csat',
        tags: ['csat', 'survey'],
        isGlobal: true,
        graph: {
          nodes: [
            { id: 'start', type: 'trigger.channel', name: 'On Resolved', x: 100, y: 80, config: { channel: 'email' } },
            { id: 'wait', type: 'wait', name: 'Wait 1h', x: 320, y: 80, config: { durationMs: 3600000 } },
            { id: 'send', type: 'send.message', name: 'Send CSAT', x: 540, y: 80, config: { channel: 'email', content: 'How did we do? Please rate your experience.' } },
            { id: 'end', type: 'end', name: 'End', x: 760, y: 80, config: {} },
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'wait' },
            { id: 'e2', source: 'wait', target: 'send' },
            { id: 'e3', source: 'send', target: 'end' },
          ],
        },
      },
    ]
    const created = await this.db.flowTemplate.createMany({ data: templates.map(t => ({ ...t, tenantId: tenantId ?? null })) })
    return { seeded: created.count, skipped: false }
  }
}


