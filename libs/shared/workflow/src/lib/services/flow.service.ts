import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@glavito/shared-database';
import { WorkflowTemplates } from '../templates/workflow-templates';
import { aiPoweredWorkflowTemplates } from '../templates/ai-powered-templates';

export interface CreateFlowRequest {
  tenantId: string;
  name: string;
  description?: string;
  nodes?: Array<{
    key: string;
    kind: string;
    label?: string;
    position?: { x: number; y: number };
    config?: Record<string, any>;
  }>;
  edges?: Array<{
    sourceKey: string;
    sourcePort?: string;
    targetKey: string;
    targetPort?: string;
    label?: string;
    condition?: any;
  }>;
}

export interface UpdateFlowRequest {
  name?: string;
  description?: string;
  nodes?: Array<{
    key: string;
    kind: string;
    label?: string;
    position?: { x: number; y: number };
    config?: Record<string, any>;
  }>;
  edges?: Array<{
    sourceKey: string;
    sourcePort?: string;
    targetKey: string;
    targetPort?: string;
    label?: string;
    condition?: any;
  }>;
  status?: 'draft' | 'published' | 'archived';
}

@Injectable()
export class FlowService {
  private readonly logger = new Logger(FlowService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createFlow(request: CreateFlowRequest): Promise<any> {
    const { tenantId, name, description, nodes = [], edges = [] } = request;

    // Create flow
    const flow = await this.prisma['flow'].create({
      data: {
        tenantId,
        name,
        description,
        status: 'draft',
      },
    });

    // Create initial version
    const version = await this.prisma['flowVersion'].create({
      data: {
        flowId: flow.id,
        version: 1,
        isPublished: false,
        graph: { nodes, edges },
      },
    });

    // Create nodes
    if (nodes.length > 0) {
      await this.prisma['flowNode'].createMany({
        data: nodes.map((node) => ({
          versionId: version.id,
          key: node.key,
          kind: node.kind,
          label: node.label,
          position: node.position || { x: 0, y: 0 },
          config: node.config || {},
        })),
      });
    }

    // Create edges
    if (edges.length > 0) {
      await this.prisma['flowEdge'].createMany({
        data: edges.map((edge) => ({
          versionId: version.id,
          sourceKey: edge.sourceKey,
          sourcePort: edge.sourcePort,
          targetKey: edge.targetKey,
          targetPort: edge.targetPort,
          label: edge.label,
          condition: edge.condition,
        })),
      });
    }

    // Load complete flow
    return this.getFlow(flow.id, tenantId);
  }

  async getFlow(flowId: string, tenantId?: string): Promise<any> {
    const flow = await this.prisma['flow'].findFirst({
      where: {
        id: flowId,
        ...(tenantId ? { tenantId } : {}),
      },
      include: {
        currentVersion: {
          include: {
            nodes: true,
            edges: true,
          },
        },
        versions: {
          orderBy: { version: 'desc' },
          take: 5,
          include: {
            nodes: true,
            edges: true,
          },
        },
      },
    });

    if (!flow) {
      throw new NotFoundException(`Flow ${flowId} not found`);
    }

    return flow;
  }

  async listFlows(
    tenantId: string,
    filters: { status?: string; search?: string } = {},
    page = 1,
    limit = 20
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const where: any = { tenantId };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [flows, total] = await Promise.all([
      this.prisma['flow'].findMany({
        where,
        include: {
          currentVersion: {
            include: {
              nodes: { take: 5 },
              edges: { take: 5 },
            },
          },
          _count: {
            select: { runs: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma['flow'].count({ where }),
    ]);

    return { data: flows, total, page, limit };
  }

  async updateFlow(
    flowId: string,
    request: UpdateFlowRequest,
    tenantId?: string
  ): Promise<any> {
    const flow = await this.prisma['flow'].findFirst({
      where: {
        id: flowId,
        ...(tenantId ? { tenantId } : {}),
      },
    });

    if (!flow) {
      throw new NotFoundException(`Flow ${flowId} not found`);
    }

    // Update flow metadata
    await this.prisma['flow'].update({
      where: { id: flowId },
      data: {
        name: request.name,
        description: request.description,
        status: request.status,
      },
    });

    // If nodes/edges provided, create new version
    if (request.nodes || request.edges) {
      await this.createFlowVersion(flowId, request.nodes || [], request.edges || []);
    }

    return this.getFlow(flowId, tenantId);
  }

  private async createFlowVersion(
    flowId: string,
    nodes: any[],
    edges: any[]
  ): Promise<any> {
    // Get latest version number
    const latestVersion = await this.prisma['flowVersion'].findFirst({
      where: { flowId },
      orderBy: { version: 'desc' },
    });

    const nextVersion = (latestVersion?.version || 0) + 1;

    // Create new version
    const version = await this.prisma['flowVersion'].create({
      data: {
        flowId,
        version: nextVersion,
        isPublished: false,
        graph: { nodes, edges },
      },
    });

    // Create nodes
    if (nodes.length > 0) {
      await this.prisma['flowNode'].createMany({
        data: nodes.map((node) => ({
          versionId: version.id,
          key: node.key,
          kind: node.kind,
          label: node.label,
          position: node.position || { x: 0, y: 0 },
          config: node.config || {},
        })),
      });
    }

    // Create edges
    if (edges.length > 0) {
      await this.prisma['flowEdge'].createMany({
        data: edges.map((edge) => ({
          versionId: version.id,
          sourceKey: edge.sourceKey,
          sourcePort: edge.sourcePort,
          targetKey: edge.targetKey,
          targetPort: edge.targetPort,
          label: edge.label,
          condition: edge.condition,
        })),
      });
    }

    return version;
  }

  async publishFlow(flowId: string, tenantId?: string): Promise<any> {
    const flow = await this.prisma['flow'].findFirst({
      where: {
        id: flowId,
        ...(tenantId ? { tenantId } : {}),
      },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!flow || !flow.versions[0]) {
      throw new NotFoundException(`Flow ${flowId} not found`);
    }

    const latestVersion = flow.versions[0];

    // Mark version as published
    await this.prisma['flowVersion'].update({
      where: { id: latestVersion.id },
      data: { isPublished: true },
    });

    // Update flow to point to this version and set as published
    await this.prisma['flow'].update({
      where: { id: flowId },
      data: {
        currentVersionId: latestVersion.id,
        status: 'published',
      },
    });

    return this.getFlow(flowId, tenantId);
  }

  async deleteFlow(flowId: string, tenantId?: string): Promise<void> {
    const flow = await this.prisma['flow'].findFirst({
      where: {
        id: flowId,
        ...(tenantId ? { tenantId } : {}),
      },
    });

    if (!flow) {
      throw new NotFoundException(`Flow ${flowId} not found`);
    }

    await this.prisma['flow'].delete({
      where: { id: flowId },
    });

    this.logger.log(`Flow deleted: ${flowId}`);
  }

  async getFlowStatistics(tenantId: string): Promise<any> {
    const [totalFlows, publishedFlows, totalRuns, recentRuns] = await Promise.all([
      this.prisma['flow'].count({ where: { tenantId } }),
      this.prisma['flow'].count({ where: { tenantId, status: 'published' } }),
      this.prisma['flowRun'].count({ where: { tenantId } }),
      this.prisma['flowRun'].findMany({
        where: { tenantId },
        orderBy: { startedAt: 'desc' },
        take: 10,
        include: {
          flow: {
            select: { name: true },
          },
        },
      }),
    ]);

    const successfulRuns = await this.prisma['flowRun'].count({
      where: { tenantId, status: 'completed' },
    });

    const failedRuns = await this.prisma['flowRun'].count({
      where: { tenantId, status: 'failed' },
    });

    return {
      totalFlows,
      publishedFlows,
      draftFlows: totalFlows - publishedFlows,
      totalRuns,
      successfulRuns,
      failedRuns,
      successRate: totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0,
      recentRuns: recentRuns.map((run: any) => ({
        id: run.id,
        flowName: run.flow.name,
        status: run.status,
        startedAt: run.startedAt,
        durationMs: run.durationMs,
      })),
    };
  }

  async listFlowTemplates(tenantId?: string): Promise<any[]> {
    const templates = await this.prisma['flowTemplate'].findMany({
      where: {
        OR: [
          { tenantId },
          { isGlobal: true },
        ],
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return templates;
  }

  async createFlowFromTemplate(
    templateId: string,
    tenantId: string,
    userId?: string,
    customName?: string,
    customDescription?: string
  ): Promise<any> {
    // First, try database templates
    const template = await this.prisma['flowTemplate'].findFirst({
      where: {
        id: templateId,
        OR: [
          { tenantId },
          { isGlobal: true },
        ],
      },
    });

    let nodes: any[] = [];
    let edges: any[] = [];
    let templateName = '';
    let templateDescription = '';

    if (template) {
      // Found in database
      const graph = template.graph as any;
      nodes = graph.nodes || [];
      edges = graph.edges || [];
      templateName = template.name;
      templateDescription = template.description || '';
    } else {
      // Try static templates from WorkflowTemplates class
      const workflowTemplate = WorkflowTemplates.getTemplate(templateId, tenantId);
      
      if (workflowTemplate) {
        templateName = workflowTemplate.name;
        templateDescription = workflowTemplate.description || '';
        
        // Convert WorkflowDefinition format to Flow format
        nodes = (workflowTemplate.nodes || []).map((node: any) => ({
          key: node.id,
          kind: this.mapNodeTypeToKind(node.type),
          label: node.name || node.id,
          position: node.position || { x: 0, y: 0 },
          config: node.configuration || {},
        }));

        edges = (workflowTemplate.connections || []).map((conn: any) => ({
          sourceKey: conn.sourceNodeId,
          sourcePort: conn.sourceOutput || 'default',
          targetKey: conn.targetNodeId,
          targetPort: conn.targetInput || 'default',
          label: conn.id || undefined,
          condition: conn.condition || undefined,
        }));
      } else {
        // Try AI-powered templates
        const aiTemplate = aiPoweredWorkflowTemplates.find(t => t.id === templateId);
        
        if (aiTemplate) {
          templateName = aiTemplate.name;
          templateDescription = aiTemplate.description || '';
          
          // Convert AI template format to Flow format
          nodes = (aiTemplate.nodes || []).map((node: any) => ({
            key: node.id,
            kind: node.kind || this.mapNodeTypeToKind(node.type),
            label: node.data?.label || node.id,
            position: node.position || { x: 0, y: 0 },
            config: node.config || {},
          }));

          edges = (aiTemplate.edges || []).map((edge: any) => ({
            sourceKey: edge.source,
            sourcePort: edge.sourceHandle || 'default',
            targetKey: edge.target,
            targetPort: edge.targetHandle || 'default',
            label: edge.id || undefined,
            condition: edge.condition || undefined,
          }));
        }
      }
    }

    if (!nodes.length && !edges.length) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }

    return this.createFlow({
      tenantId,
      name: customName || `${templateName} - Copy`,
      description: customDescription || templateDescription || `Created from template: ${templateName}`,
      nodes,
      edges,
    });
  }

  private mapNodeTypeToKind(nodeType: string): string {
    // NodeType enum values are already lowercase strings, but handle both enum and string formats
    // If it's already a valid kind, return as-is
    const validKinds = [
      'start', 'end', 'condition', 'delay', 'loop',
      'send_email', 'send_notification', 'template_message',
      'api_call', 'webhook', 'log_event', 'database_query',
      'customer_lookup', 'customer_scoring', 'ai_analysis',
      'ticket_assignment', 'ticket_escalation',
      'send_message', 'ticket_create', 'ticket_update', 'ticket_assign',
      'ticket_close', 'ai_decision', 'segment_check', 'churn_risk_check',
      'journey_checkpoint', 'track_event'
    ];
    
    const normalized = nodeType.toLowerCase().replace(/_/g, '_');
    if (validKinds.includes(normalized)) {
      return normalized;
    }
    
    // Map WorkflowDefinition NodeType enum values to backend kind
    const mapping: Record<string, string> = {
      'send_notification': 'send_message',
      'ticket_assignment': 'ticket_assign',
      'ticket_escalation': 'ticket_escalate',
      'log_event': 'track_event',
      'api_call': 'http_request',
    };
    
    return mapping[normalized] || normalized;
  }

  async duplicateFlow(flowId: string, tenantId: string): Promise<any> {
    const originalFlow = await this.getFlow(flowId, tenantId);

    if (!originalFlow) {
      throw new NotFoundException(`Flow ${flowId} not found`);
    }

    const nodes = originalFlow.currentVersion?.nodes || [];
    const edges = originalFlow.currentVersion?.edges || [];

    return this.createFlow({
      tenantId,
      name: `${originalFlow.name} - Copy`,
      description: originalFlow.description,
      nodes: nodes.map((node: any) => ({
        key: node.key,
        kind: node.kind,
        label: node.label,
        position: node.position,
        config: node.config,
      })),
      edges: edges.map((edge: any) => ({
        sourceKey: edge.sourceKey,
        sourcePort: edge.sourcePort,
        targetKey: edge.targetKey,
        targetPort: edge.targetPort,
        label: edge.label,
        condition: edge.condition,
      })),
    });
  }
}

