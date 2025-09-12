import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import { WorkflowService } from '@glavito/shared-workflow';

@Injectable()
export class PipelinesService {
  constructor(private readonly db: DatabaseService, private readonly workflows: WorkflowService) {}

  async create(tenantId: string, payload: any) {
    const pipeline = await this.db.salesPipeline.create({ data: { tenantId, ...payload } });
    try {
      await this.workflows.executeWorkflowByTrigger('event', {
        eventType: 'crm.pipeline.created',
        tenantId,
        pipelineId: (pipeline as any).id
      });
    } catch (_e) { void 0 }
    return pipeline;
  }

  async list(tenantId: string) {
    return this.db.salesPipeline.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
  }

  async get(id: string, tenantId: string) {
    return this.db.salesPipeline.findFirst({ where: { id, tenantId } });
  }

  async update(id: string, tenantId: string, payload: any) {
    await this.get(id, tenantId);
    const updated = await this.db.salesPipeline.update({ where: { id }, data: payload });
    try {
      await this.workflows.executeWorkflowByTrigger('event', {
        eventType: 'crm.pipeline.updated',
        tenantId,
        pipelineId: id,
        changes: payload
      });
    } catch (_e) { void 0 }
    return updated;
  }

  async remove(id: string, tenantId: string) {
    await this.get(id, tenantId);
    await this.db.salesPipeline.delete({ where: { id } });
    try {
      await this.workflows.executeWorkflowByTrigger('event', {
        eventType: 'crm.pipeline.deleted',
        tenantId,
        pipelineId: id
      });
    } catch (_e) { void 0 }
  }
}


