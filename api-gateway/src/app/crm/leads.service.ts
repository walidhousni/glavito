import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import { AIIntelligenceService } from '@glavito/shared-ai';
import { WorkflowService } from '@glavito/shared-workflow';

@Injectable()
export class LeadsService {
  constructor(private readonly db: DatabaseService, private readonly ai: AIIntelligenceService, private readonly workflows: WorkflowService) {}

  async create(tenantId: string, payload: Record<string, unknown>) {
    const normalized = await this.validateAndNormalizeCustomFields(tenantId, 'lead', (payload as any)?.customFields || {});
    const { score, factors, reasoning } = await this.ai.computeLeadScore(payload || {}, {});
    const lead = await this.db.lead.create({ data: { tenantId, ...payload, customFields: normalized as any, score, scoreReason: { factors, reasoning } as any } as any });
    // Trigger workflows for lead created
    try {
      await this.workflows.executeWorkflowByTrigger('event', {
        eventType: 'crm.lead.created',
        tenantId,
        leadId: (lead as { id: string }).id,
        payload
      });
    } catch { /* ignore */ }
    return lead;
  }

  async list(
    tenantId: string, 
    q?: string, 
    status?: string,
    options: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}
  ) {
    const { page = 1, limit = 50, sortBy = 'updatedAt', sortOrder = 'desc' } = options;
    const skip = (page - 1) * limit;

    // Optimize query with proper indexing hints
    const where: any = {
      tenantId,
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: 'insensitive' } },
              { firstName: { contains: q, mode: 'insensitive' } },
              { lastName: { contains: q, mode: 'insensitive' } },
              { company: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [leads, total] = await Promise.all([
      this.db.lead.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: Math.min(limit, 200), // Cap at 200 for performance
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          company: true,
          status: true,
          score: true,
          source: true,
          createdAt: true,
          updatedAt: true,
          assignedUserId: true,
        },
      }),
      this.db.lead.count({ where })
    ]);

    return {
      data: leads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async get(id: string, tenantId: string) {
    const lead = await this.db.lead.findFirst({ where: { id, tenantId } });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async update(id: string, tenantId: string, payload: Record<string, unknown>) {
    const existing = await this.get(id, tenantId);
    const merged = { ...existing, ...payload };
    const { score, factors, reasoning } = await this.ai.computeLeadScore(merged as unknown as Record<string, unknown>, {});
    const data: any = { ...payload, score, scoreReason: { factors, reasoning } as any };
    if ((payload as any)?.customFields) {
      data.customFields = await this.validateAndNormalizeCustomFields(tenantId, 'lead', (payload as any).customFields);
    }
    const updated = await this.db.lead.update({ where: { id }, data });
    // Trigger workflows for lead updated
    try {
      await this.workflows.executeWorkflowByTrigger('event', {
        eventType: 'crm.lead.updated',
        tenantId,
        leadId: id,
        changes: payload
      });
    } catch { /* ignore */ }
    return updated;
  }

  async remove(id: string, tenantId: string) {
    await this.get(id, tenantId);
    await this.db.lead.delete({ where: { id } });
  }

  async rescore(id: string, tenantId: string) {
    const lead = await this.get(id, tenantId);
    const { score, factors, reasoning } = await this.ai.computeLeadScore(lead as unknown as Record<string, unknown>, {});
    const updated = await this.db.lead.update({ where: { id }, data: { score, scoreReason: { factors, reasoning } as any } as any });
    // Trigger workflows for lead rescore
    try {
      await this.workflows.executeWorkflowByTrigger('event', {
        eventType: 'crm.lead.scored',
        tenantId,
        leadId: id,
        score
      });
    } catch { /* ignore */ }
    return updated;
  }

  async listActivities(
    tenantId: string,
    leadId: string,
    options: { page?: number; limit?: number } = {}
  ) {
    const { page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;

    const lead = await this.db.lead.findFirst({ where: { id: leadId, tenantId }, select: { id: true } });
    if (!lead) throw new NotFoundException('Lead not found');

    const [activities, total] = await Promise.all([
      this.db.leadActivity.findMany({
        where: { leadId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Math.min(limit, 200),
        select: {
          id: true,
          type: true,
          description: true,
          metadata: true,
          createdAt: true,
          userId: true,
        },
      }),
      this.db.leadActivity.count({ where: { leadId } })
    ]);

    return {
      data: activities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async createActivity(
    tenantId: string,
    leadId: string,
    payload: { type: string; description: string; metadata?: Record<string, unknown>; userId?: string }
  ) {
    const lead = await this.db.lead.findFirst({ where: { id: leadId, tenantId }, select: { id: true } });
    if (!lead) throw new NotFoundException('Lead not found');

    const created = await this.db.leadActivity.create({
      data: {
        leadId,
        userId: payload.userId || null,
        type: payload.type,
        description: payload.description,
        metadata: (payload.metadata || {}) as any,
      } as any,
    });
    return created;
  }

  private async validateAndNormalizeCustomFields(
    tenantId: string,
    entity: 'ticket' | 'customer' | 'lead' | 'deal',
    payload: Record<string, unknown>,
  ) {
    try {
      const defs = (await (this.db as any).customFieldDefinition.findMany({
        where: { tenantId, entity, isActive: true },
      })) as Array<{ name: string; required: boolean; readOnly?: boolean }>;
      const allowed = new Set(defs.map((d: any) => d.name));
      const normalized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(payload || {})) {
        if (!allowed.has(key)) continue;
        const def = defs.find((d: any) => d.name === key);
        if (!def) continue;
        if ((def as any).readOnly) continue;
        if (def.required && (value === null || value === undefined || value === '')) continue;
        normalized[key] = value;
      }
      return normalized;
    } catch {
      return payload || {};
    }
  }
}


