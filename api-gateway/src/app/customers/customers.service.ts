import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import { AIIntelligenceService } from '@glavito/shared-ai';

@Injectable()
export class CustomersService {
  constructor(private readonly databaseService: DatabaseService, private readonly ai: AIIntelligenceService) {}

  create(createCustomerDto: any) {
    return (async () => {
      const normalized = await this.validateAndNormalizeCustomFields((createCustomerDto as any)?.tenantId, 'customer', createCustomerDto?.customFields || {});
      const cust = await this.databaseService.customer.create({
        data: {
          ...createCustomerDto,
          customFields: normalized as any,
        },
      });
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

  findOne(id: string, tenantId?: string) {
    return this.databaseService.customer.findFirst({ where: { id, ...(tenantId ? { tenantId } : {}) } });
  }

  update(id: string, updateCustomerDto: any) {
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
    const { healthScore, churnRisk, factors, reasoning } = await this.ai.computeCustomerHealth({ tenantId, customerId: id });
    return (this.databaseService.customer.update as any)({ where: { id }, data: { healthScore, churnRisk, healthReasons: { factors, reasoning } } });
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