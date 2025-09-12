import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import { WorkflowService } from '@glavito/shared-workflow';

@Injectable()
export class DealsService {
  constructor(private readonly db: DatabaseService, private readonly workflows: WorkflowService) {}

  async create(tenantId: string, payload: any) {
    // Ensure pipeline exists and default stage if missing
    if (!payload?.pipelineId) {
      throw new Error('pipelineId is required');
    }
    const pipeline = await this.db.salesPipeline.findFirst({ where: { id: payload.pipelineId, tenantId } });
    if (!pipeline) throw new NotFoundException('Pipeline not found');

    let stage = payload?.stage as string | undefined;
    try {
      const stages = Array.isArray(pipeline.stages) ? (pipeline.stages as string[]) : (JSON.parse((pipeline.stages as unknown as string) || '[]') as string[]);
      if (!stage && stages.length > 0) stage = stages[0];
      if (stage && stages.length > 0 && !stages.includes(stage)) {
        throw new Error('Invalid stage for selected pipeline');
      }
    } catch {
      // if stages malformed, allow create with provided stage
    }

    const normalized = await this.validateAndNormalizeCustomFields(tenantId, 'deal', (payload as any)?.customFields || {});
    const deal = await this.db.deal.create({ data: { tenantId, ...payload, customFields: normalized as any, stage } });
    // Trigger workflows for deal created
    try {
      await this.workflows.executeWorkflowByTrigger('event', {
        eventType: 'crm.deal.created',
        tenantId,
        dealId: (deal as any).id,
        pipelineId: (deal as any).pipelineId,
        stage: (deal as any).stage,
        value: (deal as any).value
      });
    } catch (_e) { void 0 }
    // Best-effort: if deal is linked to a customer, update segment memberships
    try {
      const cid = (deal as any).customerId;
      if (cid) {
        await this.recalcSegmentsForCustomer(tenantId, cid);
      }
    } catch (_e) { void 0 }
    return deal;
  }

  async list(
    tenantId: string, 
    pipelineId?: string,
    options: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}
  ) {
    const { page = 1, limit = 50, sortBy = 'updatedAt', sortOrder = 'desc' } = options;
    const skip = (page - 1) * limit;

    const where: any = { 
      tenantId, 
      ...(pipelineId ? { pipelineId } : {}) 
    };

    const [deals, total] = await Promise.all([
      this.db.deal.findMany({
        where,
        orderBy: sortBy === 'stage' ? [{ stage: 'asc' }, { updatedAt: 'desc' }] : { [sortBy]: sortOrder },
        skip,
        take: Math.min(limit, 200),
        select: {
          id: true,
          name: true,
          value: true,
          currency: true,
          stage: true,
          probability: true,
          expectedCloseDate: true,
          actualCloseDate: true,
          createdAt: true,
          updatedAt: true,
          customerId: true,
          pipelineId: true,
          assignedUserId: true,
          products: {
            select: {
              id: true,
              quantity: true,
              unitPrice: true,
              product: {
                select: {
                  id: true,
                  name: true,
                }
              }
            }
          }
        },
      }),
      this.db.deal.count({ where })
    ]);

    return {
      data: deals,
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
    const deal = await this.db.deal.findFirst({ where: { id, tenantId }, include: { products: true } });
    if (!deal) throw new NotFoundException('Deal not found');
    return deal;
  }

  async update(id: string, tenantId: string, payload: any) {
    const existing = await this.get(id, tenantId);
    // Validate stage change against pipeline stages if provided
    if (payload?.stage) {
      const pipeline = await this.db.salesPipeline.findFirst({ where: { id: existing.pipelineId, tenantId } });
      if (!pipeline) throw new NotFoundException('Pipeline not found');
      try {
        const stages = Array.isArray(pipeline.stages) ? (pipeline.stages as string[]) : (JSON.parse((pipeline.stages as unknown as string) || '[]') as string[]);
        if (stages.length > 0 && !stages.includes(payload.stage)) {
          throw new Error('Invalid stage for selected pipeline');
        }
      } catch {
        // if stages malformed, skip validation
      }
    }
    const data: any = { ...payload };
    if ((payload as any)?.customFields) {
      data.customFields = await this.validateAndNormalizeCustomFields(tenantId, 'deal', (payload as any).customFields);
    }
    const deal = await this.db.deal.update({ where: { id }, data });
    // Trigger workflows for stage change or update
    try {
      await this.workflows.executeWorkflowByTrigger('event', {
        eventType: payload?.stage ? 'crm.deal.stage_changed' : 'crm.deal.updated',
        tenantId,
        dealId: id,
        changes: payload,
        stage: payload?.stage
      });
    } catch (_e) { void 0 }
    try {
      const cid = (deal as any).customerId;
      if (cid) {
        await this.recalcSegmentsForCustomer(tenantId, cid);
      }
    } catch (_e) { void 0 }
    return deal;
  }

  async remove(id: string, tenantId: string) {
    const existing = await this.get(id, tenantId);
    await this.db.deal.delete({ where: { id } });
    try {
      await this.workflows.executeWorkflowByTrigger('event', {
        eventType: 'crm.deal.deleted',
        tenantId,
        dealId: id
      });
    } catch (_e) { void 0 }
    try {
      const cid = (existing as any).customerId;
      if (cid) {
        await this.recalcSegmentsForCustomer(tenantId, cid);
      }
    } catch (_e) { void 0 }
  }

  private async recalcSegmentsForCustomer(tenantId: string, customerId: string) {
    try {
      const segments = await (this.db as any).customerSegment.findMany({ where: { tenantId, isActive: true } });
      for (const seg of segments) {
        const where: any = { tenantId };
        const criteria = (seg as any).criteria || {};
        const and: any[] = [];
        const or: any[] = [];
        const apply = (cond: any) => {
          const { field, operator, value } = cond || {};
          switch (field) {
            case 'deal.totalValue':
              if (operator === 'gte') and.push({ deals: { some: { value: { gte: Number(value) } } } });
              if (operator === 'lte') and.push({ deals: { some: { value: { lte: Number(value) } } } });
              break;
            case 'deal.count':
              if (operator === 'gte') and.push({ deals: { some: {} } });
              break;
          }
        };
        const walk = (group: any) => {
          if (!group) return;
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
        const matches = await (this.db as any).customer.count({ where: { ...(where as any), id: customerId } });
        const existing = await (this.db as any).customerSegmentMembership.findFirst({ where: { segmentId: (seg as any).id, customerId } });
        if (matches && !existing) {
          await (this.db as any).customerSegmentMembership.create({ data: { segmentId: (seg as any).id, customerId } });
        } else if (!matches && existing) {
          await (this.db as any).customerSegmentMembership.delete({ where: { id: (existing as any).id } });
        }
      }
      for (const seg of await (this.db as any).customerSegment.findMany({ where: { tenantId, isActive: true } })) {
        const cnt = await (this.db as any).customerSegmentMembership.count({ where: { segmentId: (seg as any).id } });
        await (this.db as any).customerSegment.update({ where: { id: (seg as any).id }, data: { customerCount: cnt, lastCalculated: new Date() } });
      }
    } catch (_e) { void 0 }
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


