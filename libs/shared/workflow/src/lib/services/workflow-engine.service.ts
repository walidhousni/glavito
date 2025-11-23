import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@glavito/shared-database';
import { Prisma } from '@prisma/client';
import { EventPublisherService } from '@glavito/shared-kafka';
import { WorkflowExecutionService } from './workflow-execution.service';
import { WorkflowTemplates } from '../templates/workflow-templates';
import {
  WorkflowRule,
  WorkflowExecution,
  WorkflowTrigger,
  WorkflowAction,
  WorkflowInput,
  ExecutionStatus,
  TriggerType,
  ActionType
} from '../interfaces/workflow.interface';

export interface CreateWorkflowRuleRequest {
  tenantId: string;
  name: string;
  description?: string;
  type: 'routing' | 'escalation' | 'automation' | 'sla';
  priority?: number;
  isActive?: boolean;
  conditions?: any[];
  actions?: WorkflowAction[];
  triggers?: WorkflowTrigger[];
  schedule?: any;
  metadata?: Record<string, any>;
}

export interface UpdateWorkflowRuleRequest {
  name?: string;
  description?: string;
  type?: 'routing' | 'escalation' | 'automation' | 'sla';
  priority?: number;
  isActive?: boolean;
  conditions?: any[];
  actions?: WorkflowAction[];
  triggers?: WorkflowTrigger[];
  schedule?: any;
  metadata?: Record<string, any>;
}

export interface WorkflowRuleFilters {
  tenantId?: string;
  type?: string;
  isActive?: boolean;
  search?: string;
  tags?: string[];
}

@Injectable()
export class WorkflowEngineService implements OnModuleInit {
  private readonly logger = new Logger(WorkflowEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventPublisher: EventPublisherService,
    private readonly executionService: WorkflowExecutionService
  ) {}

  async onModuleInit() {
    this.logger.log('WorkflowEngineService initialized');
    // Subscribe to domain events (ticket-events) to evaluate triggers
    try {
      await this.eventPublisher.subscribeToEvents(['ticket-events'], async (event: any) => {
        try {
          await this.handleDomainEvent(event);
        } catch (err) {
          this.logger.warn(`handleDomainEvent failed: ${String((err as any)?.message || err)}`);
        }
      });
    } catch (err) {
      this.logger.debug(`subscribeToEvents skipped: ${String((err as any)?.message || err)}`);
    }
  }
  /**
   * Ensure workflow templates exist for a tenant (persisted as template records)
   */
  async ensureTemplates(tenantId: string): Promise<void> {
    const defs = WorkflowTemplates.getAllTemplates(tenantId);
    for (const def of defs) {
      const slug = def.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      // 1) Exact template exists by slug -> skip
      const existingBySlug = await this.prisma.workflowRule.findFirst({
        where: {
          tenantId,
          metadata: { path: ['isTemplate'], equals: true },
          AND: { metadata: { path: ['templateSlug'], equals: slug } } as any
        } as any
      });
      if (existingBySlug) continue;

      // 2) A rule with the same name exists (maybe created previously without metadata)
      const existingByName = await this.prisma.workflowRule.findFirst({
        where: { tenantId, name: def.name }
      });
      if (existingByName) {
        // Mark it as a template and merge essential metadata
        const meta = (existingByName as any).metadata || {};
        await this.prisma.workflowRule.update({
          where: { id: existingByName.id },
          data: {
            isActive: false,
            triggers: ((def.triggers || (existingByName as any).triggers || []) as any) as unknown as Prisma.InputJsonValue,
            metadata: {
              ...meta,
              isTemplate: true,
              templateSlug: slug,
              category: (def as any).category || (meta as any).category || 'general',
              tags: (def as any).tags || (meta as any).tags || [],
              version: (meta as any).version || (def as any).version || '1.0',
              createdBy: (meta as any).createdBy || 'template',
              nodes: (def as any).nodes || (meta as any).nodes || [],
              connections: (def as any).connections || (meta as any).connections || [],
              settings: (meta as any).settings || (def as any).settings || {},
              variables: (meta as any).variables || (def as any).variables || []
            } as any
          }
        });
        continue;
      }

      // 3) Create a persisted template (handle race with unique constraint)
      try {
        await this.prisma.workflowRule.create({
          data: {
            tenantId,
            name: def.name,
            description: def.description ?? '',
            type: 'automation',
            priority: 0,
            isActive: false,
            conditions: [] as unknown as Prisma.InputJsonValue,
            actions: [] as unknown as Prisma.InputJsonValue,
            triggers: (def.triggers || []) as unknown as Prisma.InputJsonValue,
            schedule: Prisma.DbNull,
            metadata: {
              isTemplate: true,
              templateSlug: slug,
              category: def.category || 'general',
              tags: def.tags || [],
              version: (def as any)['version'] || '1.0',
              createdBy: (def as any)['createdBy'] || 'template',
              nodes: (def as any).nodes || [],
              connections: (def as any).connections || [],
              settings: (def as any)['settings'] || {},
              variables: (def as any)['variables'] || []
            } as any,
            executionCount: 0
          }
        });
      } catch (e: any) {
        if (e?.code === 'P2002') {
          // Unique constraint (tenantId, name) in a race; ignore
          this.logger.debug(`Template '${def.name}' already exists for tenant ${tenantId}`);
          continue;
        }
        throw e;
      }
    }
  }

  /**
   * Handle a domain event coming from the event bus and trigger workflows if matched
   */
  private async handleDomainEvent(event: {
    eventType: string;
    tenantId: string;
    userId?: string;
    timestamp?: string;
    data: Record<string, any>;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const tenantId = event?.tenantId;
    const eventType = String(event?.eventType || '').toLowerCase();
    if (!tenantId || !eventType) return;

    // Load active workflows for tenant and filter in-memory on triggers
    const rules = await this.prisma.workflowRule.findMany({
      where: {
        tenantId,
        isActive: true,
      }
    });

    // Normalize result to typed structure
    const list = Array.isArray(rules) ? rules : [];
    for (const rule of list) {
      const triggers = ((rule as any).triggers || []) as any[];
      if (!Array.isArray(triggers) || triggers.length === 0) continue;

      const matched = triggers.some((t) => this.matchesEventTrigger(t as any, eventType, event.data));
      if (!matched) continue;

      // Optional conditions evaluation (best-effort)
      const conditions = ((rule as any).conditions || []) as any[];
      if (!this.evaluateConditionsSafe(conditions, event.data)) continue;

      // Create execution and run
      try {
        const execution = await this.prisma.workflowExecution.create({
          data: {
            workflowId: (rule as any).id,
            triggeredBy: event.userId || 'system',
            status: 'pending' as any,
            input: { data: event.data, context: { tenantId, userId: event.userId }, triggerData: event.metadata } as any,
            metadata: { eventType, triggerType: 'event', triggerData: { ...(event.metadata || {}) }, event } as any,
          } as any,
        });

        await this.executionService.executeWorkflow((execution as any).id, (rule as any), {
          data: event.data || {},
          context: { tenantId, userId: event.userId },
          triggerData: event.metadata || {},
        });
      } catch (err) {
        this.logger.warn(`Failed to start workflow execution for rule ${(rule as any).id}: ${String((err as any)?.message || err)}`);
      }
    }
  }

  private matchesEventTrigger(trigger: WorkflowTrigger | any, eventType: string, payload: Record<string, any>): boolean {
    try {
      const type = String(trigger?.type || '').toLowerCase();
      if (type !== 'event') return false;
      const cfg = (trigger?.configuration || {}) as Record<string, any>;
      const eventCfg = String(cfg['eventType'] || cfg['event'] || '').toLowerCase();
      if (!eventCfg) return false;
      if (eventCfg === eventType) return true;
      // Support wildcard category e.g. 'ticket.*'
      if (eventCfg.endsWith('.*')) {
        const prefix = eventCfg.slice(0, -2);
        return eventType.startsWith(prefix);
      }
      return false;
    } catch {
      return false;
    }
  }

  private evaluateConditionsSafe(conditions: any[], payload: Record<string, any>): boolean {
    try {
      if (!Array.isArray(conditions) || conditions.length === 0) return true;
      const evalOne = (cond: any): boolean => {
        if (!cond) return true;
        if (Array.isArray(cond.conditions) && cond.conditions.length) {
          const logic = String(cond.logic || 'AND').toUpperCase();
          const results = cond.conditions.map((c: any) => evalOne(c));
          return logic === 'OR' ? results.some(Boolean) : results.every(Boolean);
        }
        const field = String(cond.field || '');
        const op = String(cond.operator || 'equals');
        const value = cond.value;
        // Read nested value from payload using dot path
        const actual = field
          .split('.')
          .filter(Boolean)
          .reduce<any>((acc, key) => (acc == null ? undefined : acc[key]), payload);
        switch (op) {
          case 'equals': return actual === value;
          case 'not_equals': return actual !== value;
          case 'contains': return typeof actual === 'string' && typeof value === 'string' && actual.toLowerCase().includes(value.toLowerCase());
          case 'in': return Array.isArray(cond.values) ? cond.values.includes(actual) : Array.isArray(value) ? value.includes(actual) : false;
          case 'exists': return actual !== undefined && actual !== null;
          case 'not_exists': return actual === undefined || actual === null;
          case 'greater_than': return Number(actual) > Number(value);
          case 'less_than': return Number(actual) < Number(value);
          default: return true;
        }
      };
      return evalOne({ logic: 'AND', conditions });
    } catch {
      return true; // fail-open
    }
  }

  /**
   * List workflow templates for a tenant (persisted)
   */
  async listWorkflowTemplates(tenantId: string): Promise<Array<{ slug: string; name: string; description?: string; category?: string; tags?: string[]; nodeCount?: number; triggerTypes?: string[] }>> {
    const rows = await this.prisma.workflowRule.findMany({
      where: {
        tenantId,
        metadata: { path: ['isTemplate'], equals: true }
      } as any,
      orderBy: [{ createdAt: 'asc' }]
    });
    return rows.map((r: any) => {
      const meta = (r.metadata || {}) as any;
      return {
        slug: String(meta.templateSlug || r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')),
        name: r.name,
        description: r.description,
        category: meta.category || 'general',
        tags: Array.isArray(meta.tags) ? meta.tags : [],
        nodeCount: Array.isArray(meta.nodes) ? meta.nodes.length : 0,
        triggerTypes: Array.isArray(r.triggers) ? (r.triggers as any[]).map((t: any) => t?.type).filter(Boolean) : []
      };
    });
  }

  /**
   * Get a template record by slug (ensures templates exist first)
   */
  async getTemplateBySlug(tenantId: string, slug: string): Promise<any | null> {
    await this.ensureTemplates(tenantId);
    const rec = await this.prisma.workflowRule.findFirst({
      where: {
        tenantId,
        metadata: { path: ['isTemplate'], equals: true },
        AND: { metadata: { path: ['templateSlug'], equals: slug } } as any
      } as any
    });
    return rec;
  }


  /**
   * Create a new workflow rule
   */
  async createWorkflowRule(request: CreateWorkflowRuleRequest): Promise<WorkflowRule> {
    try {
      this.logger.log(`Creating workflow rule: ${request.name} for tenant: ${request.tenantId}`);

      // Validate the request
      await this.validateWorkflowRule(request);

      // Create the workflow rule in the database
      const workflowRule = await this.prisma.workflowRule.create({
        data: {
          tenantId: request.tenantId,
          name: request.name,
          description: request.description,
          type: request.type,
          priority: request.priority ?? 0,
          isActive: request.isActive ?? true,
          conditions: (Array.isArray(request.conditions) ? request.conditions : (request.conditions ? [request.conditions] : [])) as unknown as Prisma.InputJsonValue,
          actions: (Array.isArray(request.actions) ? request.actions : (request.actions ? [request.actions] : [])) as unknown as Prisma.InputJsonValue,
          triggers: (Array.isArray(request.triggers) ? request.triggers : (request.triggers ? [request.triggers] : [])) as unknown as Prisma.InputJsonValue,
          schedule: request.schedule,
          metadata: {
            ...request.metadata,
            createdBy: 'system',
            version: '1.0',
            category: request.metadata?.['category'] || 'general'
          },
          executionCount: 0
        }
      });

      // N8N removed: no external sync required

      // Publish workflow created event
      await this.publishWorkflowEvent('workflow.created', workflowRule.tenantId, {
        workflowId: workflowRule.id,
        name: workflowRule.name,
        type: workflowRule.type,
        isActive: workflowRule.isActive
      });

      // Create audit log entry
      await this.createAuditLog(workflowRule.tenantId, 'workflow.created', workflowRule.id, null, {
        name: workflowRule.name,
        type: workflowRule.type,
        isActive: workflowRule.isActive
      });

      return this.mapToWorkflowRule(workflowRule);
    } catch (error) {
      this.logger.error(`Failed to create workflow rule: ${request.name}`, error);
      throw error;
    }
  }

  /**
   * Get workflow rule by ID
   */
  async getWorkflowRule(id: string, tenantId?: string): Promise<WorkflowRule | null> {
    try {
      const where: any = { id };
      if (tenantId) {
        where.tenantId = tenantId;
      }

      const workflowRule = await this.prisma.workflowRule.findFirst({
        where,
        include: {
          executions: {
            take: 10,
            orderBy: [{ startedAt: 'desc' as any }] as any
          }
        }
      });

      return workflowRule ? this.mapToWorkflowRule(workflowRule) : null;
    } catch (error) {
      this.logger.error(`Failed to get workflow rule: ${id}`, error);
      throw error;
    }
  }

  /**
   * List workflow rules with filtering
   */
  async listWorkflowRules(
    filters: WorkflowRuleFilters = {},
    page = 1,
    limit = 20
  ): Promise<{ data: WorkflowRule[]; total: number; page: number; limit: number }> {
    try {
      const where: any = {};

      if (filters.tenantId) {
        where.tenantId = filters.tenantId;
      }

      if (filters.type) {
        where.type = filters.type;
      }

      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } }
        ];
      }

      if (filters.tags && filters.tags.length > 0) {
        where.metadata = {
          path: ['tags'],
          array_contains: filters.tags
        };
      }

      const skip = (page - 1) * limit;

      const [workflowRules, total] = await Promise.all([
        this.prisma.workflowRule.findMany({
          where,
          skip,
          take: limit,
          orderBy: [
            { priority: 'desc' },
            { createdAt: 'desc' }
          ],
          include: {
            executions: {
              take: 5,
              orderBy: [{ startedAt: 'desc' as any }] as any
            }
          }
        }),
        this.prisma.workflowRule.count({ where })
      ]);

      return {
        data: workflowRules.map(rule => this.mapToWorkflowRule(rule)),
        total,
        page,
        limit
      };
    } catch (error) {
      this.logger.error('Failed to list workflow rules', error);
      throw error;
    }
  }

  /**
   * Update workflow rule
   */
  async updateWorkflowRule(
    id: string,
    request: UpdateWorkflowRuleRequest,
    tenantId?: string
  ): Promise<WorkflowRule> {
    try {
      this.logger.log(`Updating workflow rule: ${id}`);

      // Get existing workflow rule
      const existing = await this.getWorkflowRule(id, tenantId);
      if (!existing) {
        throw new Error(`Workflow rule not found: ${id}`);
      }

      // Validate the update request
      if (request.name || request.type || request.conditions || request.actions || request.triggers) {
        // When validating for duplicates, allow current record name
        await this.validateWorkflowRule({ ...existing, ...request } as CreateWorkflowRuleRequest, existing.id);
      }

      // Update the workflow rule
      const workflowRule = await this.prisma.workflowRule.update({
        where: { id },
        data: {
          ...(request.name && { name: request.name }),
          ...(request.description !== undefined && { description: request.description }),
          ...(request.type && { type: request.type }),
          ...(request.priority !== undefined && { priority: request.priority }),
          ...(request.isActive !== undefined && { isActive: request.isActive }),
          ...(request.conditions && { conditions: (Array.isArray(request.conditions) ? request.conditions : [request.conditions]) as unknown as Prisma.InputJsonValue }),
          ...(request.actions && { actions: (Array.isArray(request.actions) ? request.actions : [request.actions]) as unknown as Prisma.InputJsonValue }),
          ...(request.triggers && { triggers: (Array.isArray(request.triggers) ? request.triggers : [request.triggers]) as unknown as Prisma.InputJsonValue }),
          ...(request.schedule !== undefined && { schedule: request.schedule }),
          ...(request.metadata && {
            metadata: {
              ...existing.metadata,
              ...request.metadata,
              updatedAt: new Date().toISOString()
            }
          })
        }
      });

      // N8N removed: no external sync required

      // Publish workflow updated event
      await this.publishWorkflowEvent('workflow.updated', workflowRule.tenantId, {
        workflowId: workflowRule.id,
        changes: request
      });

      // Create audit log entry
      await this.createAuditLog(workflowRule.tenantId, 'workflow.updated', workflowRule.id, existing, request);

      return this.mapToWorkflowRule(workflowRule);
    } catch (error) {
      this.logger.error(`Failed to update workflow rule: ${id}`, error);
      throw error;
    }
  }

  /**
   * Delete workflow rule
   */
  async deleteWorkflowRule(id: string, tenantId?: string): Promise<void> {
    try {
      this.logger.log(`Deleting workflow rule: ${id}`);

      // Get existing workflow rule
      const existing = await this.getWorkflowRule(id, tenantId);
      if (!existing) {
        throw new Error(`Workflow rule not found: ${id}`);
      }

      // Delete the workflow rule (this will cascade delete executions)
      await this.prisma.workflowRule.delete({
        where: { id }
      });

      // Publish workflow deleted event
      await this.publishWorkflowEvent('workflow.deleted', existing.tenantId, {
        workflowId: id,
        name: existing.name
      });

      // Create audit log entry
      await this.createAuditLog(existing.tenantId, 'workflow.deleted', id, existing, null);

      this.logger.log(`Workflow rule deleted: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete workflow rule: ${id}`, error);
      throw error;
    }
  }

  /**
   * Execute workflow rule manually
   */
  async executeWorkflowRule(
    id: string,
    input: WorkflowInput,
    triggeredBy: string,
    tenantId?: string
  ): Promise<WorkflowExecution> {
    try {
      this.logger.log(`Executing workflow rule: ${id}`);

      // Get workflow rule
      const workflowRule = await this.getWorkflowRule(id, tenantId);
      if (!workflowRule) {
        throw new Error(`Workflow rule not found: ${id}`);
      }

      if (!workflowRule.isActive) {
        throw new Error(`Workflow rule is not active: ${id}`);
      }

      // Create execution record
      const execution = await this.prisma.workflowExecution.create({
        data: {
          workflowId: id,
          triggeredBy,
          status: ExecutionStatus.PENDING,
          input: input.data || {},
          metadata: {
            triggerType: 'manual',
            triggeredAt: new Date().toISOString(),
            context: input.context || {}
          }
        }
      });

      // Update execution count
      await this.prisma.workflowRule.update({
        where: { id },
        data: {
          executionCount: { increment: 1 },
          lastExecuted: new Date()
        }
      });

      // Execute the workflow
      const result = await this.executionService.executeWorkflow(execution.id, workflowRule, input);

      // Publish workflow execution event
      await this.publishWorkflowEvent('workflow.execution.started', workflowRule.tenantId, {
        executionId: execution.id,
        workflowId: id,
        triggeredBy
      });

      return result;
    } catch (error) {
      this.logger.error(`Failed to execute workflow rule: ${id}`, error);
      throw error;
    }
  }

  /**
   * Get workflow execution by ID
   */
  async getWorkflowExecution(id: string, tenantId?: string): Promise<WorkflowExecution | null> {
    try {
      const execution = await this.prisma.workflowExecution.findFirst({
        where: {
          id,
          ...(tenantId && { workflow: { tenantId } })
        },
        include: {
          workflow: true
        }
      });

      return execution ? this.mapToWorkflowExecution(execution) : null;
    } catch (error) {
      this.logger.error(`Failed to get workflow execution: ${id}`, error);
      throw error;
    }
  }

  /**
   * List workflow executions
   */
  async listWorkflowExecutions(
    workflowId?: string,
    tenantId?: string,
    page = 1,
    limit = 20
  ): Promise<{ data: WorkflowExecution[]; total: number; page: number; limit: number }> {
    try {
      const where: any = {};

      if (workflowId) {
        where.workflowId = workflowId;
      }

      if (tenantId) {
        where.workflow = { tenantId };
      }

      const skip = (page - 1) * limit;

      const [executions, total] = await Promise.all([
        this.prisma.workflowExecution.findMany({
          where,
          skip,
          take: limit,
          orderBy: [{ startedAt: 'desc' as any }] as any,
          include: {
            workflow: true
          }
        }),
        this.prisma.workflowExecution.count({ where })
      ]);

      return {
        data: executions.map(execution => this.mapToWorkflowExecution(execution)),
        total,
        page,
        limit
      };
    } catch (error) {
      this.logger.error('Failed to list workflow executions', error);
      throw error;
    }
  }

  /**
   * Get workflow statistics
   */
  async getWorkflowStatistics(tenantId?: string): Promise<{
    totalWorkflows: number;
    activeWorkflows: number;
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
  }> {
    try {
      const where: any = tenantId ? { tenantId } : {};

      const [
        totalWorkflows,
        activeWorkflows,
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        avgExecutionTime
      ] = await Promise.all([
        this.prisma.workflowRule.count({ where }),
        this.prisma.workflowRule.count({ where: { ...where, isActive: true } }),
        this.prisma.workflowExecution.count({
          where: tenantId ? { workflow: { tenantId } } : {}
        }),
        this.prisma.workflowExecution.count({
          where: {
            status: ExecutionStatus.COMPLETED,
            ...(tenantId && { workflow: { tenantId } })
          }
        }),
        this.prisma.workflowExecution.count({
          where: {
            status: ExecutionStatus.FAILED,
            ...(tenantId && { workflow: { tenantId } })
          }
        }),
        this.prisma.workflowExecution.aggregate({
          where: {
            duration: { not: null },
            ...(tenantId && { workflow: { tenantId } })
          },
          _avg: { duration: true }
        })
      ]);

      return {
        totalWorkflows,
        activeWorkflows,
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        averageExecutionTime: avgExecutionTime._avg.duration || 0
      };
    } catch (error) {
      this.logger.error('Failed to get workflow statistics', error);
      throw error;
    }
  }

  /**
   * Validate workflow rule data
   */
  private async validateWorkflowRule(request: CreateWorkflowRuleRequest, ignoreId?: string): Promise<void> {
    // Check for duplicate names within tenant
    const existing = await this.prisma.workflowRule.findFirst({
      where: {
        tenantId: request.tenantId,
        name: request.name,
        ...(ignoreId ? { NOT: { id: ignoreId } } : {})
      }
    });

    if (existing) {
      throw new Error(`Workflow rule with name '${request.name}' already exists`);
    }

    // Validate triggers
    if (request.triggers) {
      for (const trigger of request.triggers) {
        this.validateTrigger(trigger);
      }
    }

    // Validate actions
    if (request.actions) {
      for (const action of request.actions) {
        this.validateAction(action);
      }
    }

    // Validate conditions
    if (request.conditions) {
      this.validateConditions(request.conditions);
    }
  }

  /**
   * Validate trigger configuration
   */
  private validateTrigger(trigger: WorkflowTrigger): void {
    if (!trigger.type) {
      throw new Error('Trigger type is required');
    }

    const validTriggerTypes = Object.values(TriggerType);
    if (!validTriggerTypes.includes(trigger.type as TriggerType)) {
      throw new Error(`Invalid trigger type: ${trigger.type}`);
    }

    // Type-specific validation
    switch (trigger.type) {
      case TriggerType.SCHEDULE:
        if (!trigger.configuration?.['schedule']) {
          throw new Error('Schedule trigger requires schedule configuration');
        }
        break;
      case TriggerType.EVENT:
        if (!trigger.configuration?.['eventType']) {
          throw new Error('Event trigger requires eventType configuration');
        }
        break;
    }
  }

  /**
   * Validate action configuration
   */
  private validateAction(action: WorkflowAction): void {
    if (!action.type) {
      throw new Error('Action type is required');
    }

    const validActionTypes = Object.values(ActionType);
    if (!validActionTypes.includes(action.type as ActionType)) {
      throw new Error(`Invalid action type: ${action.type}`);
    }

    // Type-specific validation
    switch (action.type) {
      case ActionType.ASSIGN_TICKET:
        if (!action.configuration?.['agentId'] && !action.configuration?.['teamId']) {
          throw new Error('Assign ticket action requires agentId or teamId');
        }
        break;
      case ActionType.SEND_EMAIL:
        if (!action.configuration?.['to'] && !action.configuration?.['template']) {
          throw new Error('Send email action requires recipient or template');
        }
        break;
      case ActionType.UPDATE_FIELD:
        if (!action.configuration?.['field'] || action.configuration?.['value'] === undefined) {
          throw new Error('Update field action requires field and value');
        }
        break;
    }
  }

  /**
   * Validate conditions
   */
  private validateConditions(conditions: any[]): void {
    for (const condition of conditions) {
      if (!condition.field) {
        throw new Error('Condition field is required');
      }
      if (!condition.operator) {
        throw new Error('Condition operator is required');
      }
      if (condition.value === undefined && !['exists', 'not_exists'].includes(condition.operator)) {
        throw new Error('Condition value is required for most operators');
      }
    }
  }

  /**
   * Map database record to WorkflowRule interface
   */
  private mapToWorkflowRule(dbRecord: any): WorkflowRule {
    return {
      id: dbRecord.id,
      tenantId: dbRecord.tenantId,
      name: dbRecord.name,
      description: dbRecord.description,
      type: dbRecord.type,
      priority: dbRecord.priority,
      isActive: dbRecord.isActive,
      conditions: dbRecord.conditions,
      actions: dbRecord.actions,
      triggers: dbRecord.triggers,
      schedule: dbRecord.schedule,
      metadata: dbRecord.metadata,
      executionCount: dbRecord.executionCount,
      lastExecuted: dbRecord.lastExecuted,
      createdAt: dbRecord.createdAt,
      updatedAt: dbRecord.updatedAt,
      executions: dbRecord.executions?.map((exec: any) => this.mapToWorkflowExecution(exec)) || []
    };
  }

  /**
   * Map database record to WorkflowExecution interface
   */
  private mapToWorkflowExecution(dbRecord: any): WorkflowExecution {
    return {
      id: dbRecord.id,
      workflowId: dbRecord.workflowId,
      tenantId: dbRecord.workflow?.tenantId,
      triggeredBy: dbRecord.triggeredBy,
      triggerType: (dbRecord.metadata?.triggerType || dbRecord.triggerType || 'manual') as any,
      triggerData: dbRecord.metadata?.triggerData || dbRecord.triggerData || {},
      status: dbRecord.status as ExecutionStatus,
      input: dbRecord.input,
      output: dbRecord.output,
      startedAt: dbRecord.startedAt,
      completedAt: dbRecord.completedAt,
      duration: dbRecord.duration,
      errorMessage: dbRecord.errorMessage,
      errorDetails: dbRecord.metadata?.errorDetails || dbRecord.errorDetails,
      contextData: dbRecord.metadata?.context || dbRecord.contextData || {},
      metadata: dbRecord.metadata || {},
      createdAt: dbRecord.createdAt,
      updatedAt: dbRecord.updatedAt
    };
  }

  /**
   * Publish workflow event
   */
  private async publishWorkflowEvent(eventType: string, tenantId: string, data: any): Promise<void> {
    try {
      await this.eventPublisher.publishWorkflowEvent({
        eventType,
        tenantId,
        timestamp: new Date().toISOString(),
        data
      });
    } catch (error) {
      this.logger.warn(`Failed to publish workflow event: ${eventType}`, error);
    }
  }

  /**
   * Create audit log entry
   */
  private async createAuditLog(
    tenantId: string,
    action: string,
    resourceId: string,
    oldValues: any,
    newValues: any
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          action,
          resource: 'workflow',
          resourceId,
          oldValues,
          newValues
        }
      });
    } catch (error) {
      this.logger.warn('Failed to create audit log entry', error);
    }
  }
}