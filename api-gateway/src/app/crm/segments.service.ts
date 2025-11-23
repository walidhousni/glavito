import { Injectable } from '@nestjs/common';
import { PrismaService } from '@glavito/shared-database';
import { WorkflowService } from '@glavito/shared-workflow';
import { EmailService } from '../email/email.service';
import type { EmailSendRequest } from '../email/types';

@Injectable()
export class SegmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowService: WorkflowService,
    private readonly emailService: EmailService,
  ) {}

  async listSegments(
    tenantId: string,
    options: { page?: number; limit?: number; includeMetrics?: boolean } = {}
  ) {
    const { page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;

    const where = { tenantId, isActive: true };

    const [rows, total] = await Promise.all([
      this.prisma['customerSegment'].findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: Math.min(limit, 100),
        select: {
          id: true,
          tenantId: true,
          name: true,
          description: true,
          customerCount: true,
          isActive: true,
          isDynamic: true,
          createdAt: true,
          updatedAt: true,
          lastCalculated: true,
        },
      }),
      this.prisma['customerSegment'].count({ where })
    ]);

    const segments = rows.map((s) => ({
      id: s.id,
      tenantId: s.tenantId,
      name: s.name,
      description: s.description ?? '',
      customerCount: s.customerCount ?? 0,
      isActive: s.isActive,
      isDynamic: s.isDynamic,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      lastCalculated: s.lastCalculated?.toISOString(),
    }));

    return {
      data: segments,
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

  async getSegmentMetrics(tenantId: string) {
    const segments = await this.prisma['customerSegment'].findMany({ where: { tenantId, isActive: true } });
    const metrics = [] as Array<{ segmentId: string; customerCount: number; averageValue: number; monthlyGrowth: number }>;
    for (const seg of segments) {
      const count = await this.prisma['customerSegmentMembership'].count({ where: { segmentId: seg.id } });
      // simple heuristic for avg value from deals tied to customers in segment
      const members = await this.prisma['customerSegmentMembership'].findMany({ where: { segmentId: seg.id }, select: { customerId: true } });
      const customerIds = members.map((m) => m.customerId);
      let averageValue = 0;
      if (customerIds.length) {
        const deals = await this.prisma['deal'].findMany({ where: { tenantId, customerId: { in: customerIds } }, select: { value: true } });
        if (deals.length) {
          const total = deals.reduce((sum, d) => sum + Number(d.value || 0), 0);
          averageValue = Math.round((total / deals.length) * 100) / 100;
        }
      }
      // growth heuristic: compare new members in last 30d vs previous 30d
      const now = new Date();
      const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const prev60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      const recent = await this.prisma['customerSegmentMembership'].count({ where: { segmentId: seg.id, addedAt: { gte: last30 } } });
      const previous = await this.prisma['customerSegmentMembership'].count({ where: { segmentId: seg.id, addedAt: { gte: prev60, lt: last30 } } });
      const monthlyGrowth = previous > 0 ? Math.max(-30, Math.min(30, Math.round(((recent - previous) / previous) * 100))) : (recent > 0 ? 30 : 0);
      metrics.push({ segmentId: seg.id, customerCount: count, averageValue, monthlyGrowth });
    }
    return metrics;
  }

  async createSegment(tenantId: string, dto: any) {
    const created = await this.prisma['customerSegment'].create({
      data: {
        tenantId,
        name: dto?.name || 'Untitled Segment',
        description: dto?.description || null,
        criteria: (dto?.criteria as any) ?? {},
        isActive: dto?.isActive ?? true,
        isDynamic: dto?.isDynamic ?? true,
      },
    });
    return {
      id: created.id,
      tenantId: created.tenantId,
      name: created.name,
      description: created.description ?? '',
      customerCount: created.customerCount ?? 0,
      isActive: created.isActive,
      isDynamic: created.isDynamic,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  async updateSegment(tenantId: string, id: string, dto: any) {
    const updated = await this.prisma['customerSegment'].update({
      where: { id },
      data: {
        name: dto?.name ?? undefined,
        description: 'description' in (dto || {}) ? (dto?.description ?? null) : undefined,
        criteria: 'criteria' in (dto || {}) ? ((dto?.criteria as any) ?? {}) : undefined,
        isActive: 'isActive' in (dto || {}) ? (dto?.isActive as boolean) : undefined,
      },
    });
    return {
      id: updated.id,
      tenantId: updated.tenantId,
      name: updated.name,
      description: updated.description ?? '',
      customerCount: updated.customerCount ?? 0,
      isActive: updated.isActive,
      isDynamic: updated.isDynamic,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  private buildCustomerWhereFromCriteria(tenantId: string, criteria: any): any {
    // Minimal v1 mapping for a subset of fields/operators
    const where: any = { tenantId };
    const and: any[] = [];
    const or: any[] = [];
    const applyCondition = (cond: any) => {
      const { field, operator, value, valueTo } = cond || {};
      switch (field) {
        // Customer fields
        case 'customer.company':
          if (operator === 'contains' && typeof value === 'string') and.push({ company: { contains: value, mode: 'insensitive' } });
          if (operator === 'equals' && typeof value === 'string') and.push({ company: value });
          if (operator === 'notEquals' && typeof value === 'string') and.push({ company: { not: value } });
          if (operator === 'in' && Array.isArray(value)) and.push({ company: { in: value } });
          break;
        case 'customer.email':
          if (operator === 'contains' && typeof value === 'string') and.push({ email: { contains: value, mode: 'insensitive' } });
          if (operator === 'equals' && typeof value === 'string') and.push({ email: value });
          if (operator === 'endsWith' && typeof value === 'string') and.push({ email: { endsWith: value, mode: 'insensitive' } });
          break;
        case 'customer.tags':
          if (operator === 'contains' && typeof value === 'string') and.push({ tags: { has: value } });
          if (operator === 'in' && Array.isArray(value)) and.push({ tags: { hasSome: value } });
          if (operator === 'notIn' && Array.isArray(value)) and.push({ NOT: { tags: { hasSome: value } } });
          break;
        case 'customer.healthScore':
          if (operator === 'gte') and.push({ healthScore: { gte: Number(value) } });
          if (operator === 'lte') and.push({ healthScore: { lte: Number(value) } });
          if (operator === 'equals') and.push({ healthScore: Number(value) });
          if (operator === 'between') and.push({ healthScore: { gte: Number(value), lte: Number(valueTo) } });
          break;
        case 'customer.churnRisk':
          if (operator === 'gte') and.push({ churnRisk: { gte: Number(value) } });
          if (operator === 'lte') and.push({ churnRisk: { lte: Number(value) } });
          if (operator === 'between') and.push({ churnRisk: { gte: Number(value), lte: Number(valueTo) } });
          break;
        case 'customer.createdAt':
          if (operator === 'after' && value) and.push({ createdAt: { gte: new Date(value) } });
          if (operator === 'before' && value) and.push({ createdAt: { lte: new Date(value) } });
          if (operator === 'between' && value && valueTo) and.push({ createdAt: { gte: new Date(value), lte: new Date(valueTo) } });
          if (operator === 'lastNDays' && typeof value === 'number') {
            const daysAgo = new Date(Date.now() - value * 24 * 60 * 60 * 1000);
            and.push({ createdAt: { gte: daysAgo } });
          }
          break;
        
        // Deal fields
        case 'deal.totalValue':
          if (operator === 'gte') and.push({ deals: { some: { value: { gte: Number(value) } } } });
          if (operator === 'lte') and.push({ deals: { some: { value: { lte: Number(value) } } } });
          if (operator === 'between') and.push({ deals: { some: { value: { gte: Number(value), lte: Number(valueTo) } } } });
          break;
        case 'deal.stage':
          if (operator === 'equals' && typeof value === 'string') and.push({ deals: { some: { stage: value } } });
          if (operator === 'in' && Array.isArray(value)) and.push({ deals: { some: { stage: { in: value } } } });
          break;
        case 'deal.count':
          if (operator === 'gte') and.push({ deals: { some: {} } });
          // Note: Exact count filtering requires aggregation which Prisma doesn't support directly in where clauses
          break;
        
        // Ticket fields
        case 'ticket.count':
          if (operator === 'gte' && typeof value === 'number') {
            const windowDays = valueTo ? Number(valueTo) : 365;
            const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
            and.push({ tickets: { some: { createdAt: { gte: since } } } });
          }
          break;
        case 'ticket.status':
          if (operator === 'equals' && typeof value === 'string') and.push({ tickets: { some: { status: value } } });
          if (operator === 'in' && Array.isArray(value)) and.push({ tickets: { some: { status: { in: value } } } });
          break;
        case 'ticket.lastCreatedDays':
          if (operator === 'lte' && typeof value === 'number') {
            const daysAgo = new Date(Date.now() - value * 24 * 60 * 60 * 1000);
            and.push({ tickets: { some: { createdAt: { gte: daysAgo } } } });
          }
          if (operator === 'gte' && typeof value === 'number') {
            const daysAgo = new Date(Date.now() - value * 24 * 60 * 60 * 1000);
            and.push({ tickets: { none: { createdAt: { gte: daysAgo } } } });
          }
          break;
        
        // Lead fields
        case 'lead.status':
          if (operator === 'equals' && typeof value === 'string') and.push({ leads: { some: { status: value } } });
          if (operator === 'in' && Array.isArray(value)) and.push({ leads: { some: { status: { in: value } } } });
          break;
        case 'lead.score':
          if (operator === 'gte') and.push({ leads: { some: { score: { gte: Number(value) } } } });
          if (operator === 'lte') and.push({ leads: { some: { score: { lte: Number(value) } } } });
          if (operator === 'between') and.push({ leads: { some: { score: { gte: Number(value), lte: Number(valueTo) } } } });
          break;
        
        // Contact/activity fields
        case 'lastContactDays':
          if (operator === 'gte' && typeof value === 'number') {
            const daysAgo = new Date(Date.now() - value * 24 * 60 * 60 * 1000);
            and.push({
              OR: [
                { tickets: { none: { createdAt: { gte: daysAgo } } } },
                { conversations: { none: { createdAt: { gte: daysAgo } } } }
              ]
            });
          }
          if (operator === 'lte' && typeof value === 'number') {
            const daysAgo = new Date(Date.now() - value * 24 * 60 * 60 * 1000);
            and.push({
              OR: [
                { tickets: { some: { createdAt: { gte: daysAgo } } } },
                { conversations: { some: { createdAt: { gte: daysAgo } } } }
              ]
            });
          }
          break;
      }
    };
    const walk = (group: any, isRoot = false) => {
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
      walk(criteria, true);
    }
    if (and.length) where.AND = and;
    if (or.length) where.OR = or;
    return where;
  }

  async previewMembers(tenantId: string, segmentId: string) {
    const seg = await this.prisma['customerSegment'].findUnique({ where: { id: segmentId } });
    if (!seg || seg.tenantId !== tenantId) return { sampleCount: 0, totalMatched: 0, sampleCustomerIds: [] };
    const criteria = (seg.criteria as any) || null;
    const where = this.buildCustomerWhereFromCriteria(tenantId, criteria);
    const totalMatched = await this.prisma['customer'].count({ where });
    const sample = await this.prisma['customer'].findMany({ where, select: { id: true }, take: 20 });
    return { sampleCount: sample.length, totalMatched, sampleCustomerIds: sample.map(c => c.id) };
  }

  async recalculateMemberships(tenantId: string, segmentId: string) {
    const seg = await this.prisma['customerSegment'].findUnique({ where: { id: segmentId } });
    if (!seg || seg.tenantId !== tenantId) return { updated: 0 };
    const criteria = (seg.criteria as any) || null;
    const where = this.buildCustomerWhereFromCriteria(tenantId, criteria);
    const matches = await this.prisma['customer'].findMany({ where, select: { id: true } });
    const matchedIds = new Set(matches.map(m => m.id));
    // existing memberships
    const existing = await this.prisma['customerSegmentMembership'].findMany({ where: { segmentId } });
    const existingIds = new Set(existing.map(m => m.customerId));
    const toAdd = matches.filter(m => !existingIds.has(m.id));
    const toRemove = existing.filter(m => !matchedIds.has(m.customerId));
    if (toRemove.length) {
      await this.prisma['customerSegmentMembership'].deleteMany({ where: { segmentId, customerId: { in: toRemove.map(m => m.customerId) } } });
    }
    if (toAdd.length) {
      await this.prisma['customerSegmentMembership'].createMany({ data: toAdd.map(m => ({ segmentId, customerId: m.id })) });
    }
    const newCount = await this.prisma['customerSegmentMembership'].count({ where: { segmentId } });
    await this.prisma['customerSegment'].update({ where: { id: segmentId }, data: { customerCount: newCount, lastCalculated: new Date() } });
    return { updated: newCount };
  }

  async exportSegment(tenantId: string, segmentId: string, format: 'json' | 'csv' = 'json') {
    const seg = await this.prisma['customerSegment'].findUnique({ where: { id: segmentId } });
    if (!seg || seg.tenantId !== tenantId) return { format, count: 0, data: format === 'csv' ? '' : [] };
    const where = this.buildCustomerWhereFromCriteria(tenantId, (seg as any).criteria || {});
    const customers = await this.prisma['customer'].findMany({
      where,
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, company: true, healthScore: true, churnRisk: true },
      take: 1000,
      orderBy: { updatedAt: 'desc' },
    });
    if (format === 'csv') {
      const headers = ['id','firstName','lastName','email','phone','company','healthScore','churnRisk'];
      const rows = customers.map(c => [c.id, c.firstName || '', c.lastName || '', c.email || '', c.phone || '', c.company || '', String(c.healthScore ?? ''), String(c.churnRisk ?? '')]);
      const csv = [headers.join(','), ...rows.map(r => r.map(v => String(v).includes(',') ? `"${String(v).replace(/"/g,'""')}"` : String(v)).join(','))].join('\n');
      return { format: 'csv', count: customers.length, data: csv };
    }
    return { format: 'json', count: customers.length, data: customers };
  }

  async addCustomersToSegment(tenantId: string, segmentId: string, customerIds: string[]) {
    const seg = await this.prisma['customerSegment'].findUnique({ where: { id: segmentId } });
    if (!seg || seg.tenantId !== tenantId) throw new Error('Segment not found');
    
    // Verify customers belong to the tenant
    const customers = await this.prisma['customer'].findMany({
      where: { id: { in: customerIds }, tenantId },
      select: { id: true },
    });
    
    const validCustomerIds = customers.map(c => c.id);
    if (validCustomerIds.length === 0) return { added: 0 };
    
    // Check existing memberships
    const existing = await this.prisma['customerSegmentMembership'].findMany({
      where: { segmentId, customerId: { in: validCustomerIds } },
      select: { customerId: true },
    });
    
    const existingIds = new Set(existing.map(m => m.customerId));
    const toAdd = validCustomerIds.filter(id => !existingIds.has(id));
    
    if (toAdd.length > 0) {
      await this.prisma['customerSegmentMembership'].createMany({
        data: toAdd.map(customerId => ({ segmentId, customerId })),
        skipDuplicates: true,
      });
      
      // Update segment count
      const newCount = await this.prisma['customerSegmentMembership'].count({ where: { segmentId } });
      await this.prisma['customerSegment'].update({
        where: { id: segmentId },
        data: { customerCount: newCount },
      });
    }
    
    return { added: toAdd.length };
  }

  async triggerWorkflowForSegment(tenantId: string, segmentId: string, workflowId: string) {
    const seg = await this.prisma['customerSegment'].findUnique({ where: { id: segmentId } });
    if (!seg || seg.tenantId !== tenantId) return { triggered: 0 };
    const where = this.buildCustomerWhereFromCriteria(tenantId, (seg as any).criteria || {});
    const customers = await this.prisma['customer'].findMany({
      where,
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, company: true },
      take: 200,
    });
    let triggered = 0;
    for (const c of customers) {
      try {
        await this.workflowService.executeWorkflow(workflowId, { data: { customer: c, segmentId } } as any, 'system');
        triggered += 1;
      } catch {
        // continue
      }
    }
    return { triggered };
  }

  async sendEmailToSegment(tenantId: string, segmentId: string, payload: { subject: string; html: string; fromEmail?: string; fromName?: string }): Promise<{ queued: number }> {
    const seg = await this.prisma['customerSegment'].findUnique({ where: { id: segmentId } });
    if (!seg || seg.tenantId !== tenantId) return { queued: 0 };
    const where = this.buildCustomerWhereFromCriteria(tenantId, (seg as any).criteria || {});
    const customers = await this.prisma['customer'].findMany({
      where,
      select: { id: true, email: true, firstName: true, lastName: true },
      take: 100, // batch initial send
    });
    const personalizations = customers
      .filter((c: any) => !!c.email)
      .map((c: any) => ({
        toEmail: String(c.email),
        toName: [c.firstName, c.lastName].filter(Boolean).join(' ') || undefined,
        variables: { customerId: c.id },
      }));
    if (!personalizations.length) return { queued: 0 };
    const request: EmailSendRequest = {
      tenantId,
      subject: payload.subject,
      html: payload.html,
      fromEmail: payload.fromEmail,
      fromName: payload.fromName,
      personalizations,
      campaignId: segmentId,
      tracking: { open: true, click: true },
    };
    await this.emailService.send(request);
    return { queued: personalizations.length };
  }
}


