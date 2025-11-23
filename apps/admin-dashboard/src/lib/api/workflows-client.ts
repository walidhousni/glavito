import api from './config';
import { getTemplateById } from '@/lib/workflows/templates';
import { toBackendNodeKind } from '@/lib/workflows/node-type-mapping';

// Flow DTOs matching backend structure
export interface FlowDTO {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  status: 'draft' | 'published' | 'archived';
  currentVersionId?: string;
  currentVersion?: FlowVersionDTO;
  versions?: FlowVersionDTO[];
  _count?: {
    runs: number;
  };
  createdAt: string;
  updatedAt: string;
  createdById?: string;
  updatedById?: string;
}

export interface FlowVersionDTO {
  id: string;
  flowId: string;
  version: number;
  isPublished: boolean;
  graph?: {
    nodes: FlowNodeInputDTO[];
    edges: FlowEdgeInputDTO[];
  };
  nodes: FlowNodeDTO[];
  edges: FlowEdgeDTO[];
  createdAt: string;
  createdById?: string;
}

export interface FlowNodeDTO {
  id: string;
  versionId: string;
  key: string;
  kind: string;
  label?: string;
  position: { x: number; y: number };
  config: Record<string, any>;
  createdAt: string;
}

export interface FlowEdgeDTO {
  id: string;
  versionId: string;
  sourceKey: string;
  sourcePort?: string;
  targetKey: string;
  targetPort?: string;
  label?: string;
  condition?: any;
  createdAt: string;
}

// Input DTOs for creating/updating flows
export interface FlowNodeInputDTO {
  key: string;
  kind: string;
  label?: string;
  position?: { x: number; y: number };
  config?: Record<string, any>;
}

export interface FlowEdgeInputDTO {
  sourceKey: string;
  sourcePort?: string;
  targetKey: string;
  targetPort?: string;
  label?: string;
  condition?: any;
}

export interface FlowRunDTO {
  id: string;
  flowId: string;
  versionId?: string;
  tenantId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  input: Record<string, any>;
  output?: Record<string, any>;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  context: Record<string, any>;
  events?: FlowEventDTO[];
  flow?: {
    name: string;
  };
}

export interface FlowEventDTO {
  id: string;
  runId: string;
  nodeKey?: string;
  eventType: string;
  message?: string;
  data?: any;
  timestamp: string;
}

export interface FlowStatisticsDTO {
  totalFlows: number;
  publishedFlows: number;
  draftFlows: number;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  successRate: number;
  recentRuns: Array<{
    id: string;
    flowName: string;
    status: string;
    startedAt: string;
    durationMs?: number;
  }>;
}

// Legacy DTO for backward compatibility with existing code
export interface WorkflowRuleDTO extends FlowDTO {
  type?: string;
  priority?: number;
  isActive: boolean;
  conditions?: unknown;
  actions?: unknown;
  triggers?: unknown;
  metadata?: Record<string, any>;
  executionCount?: number;
  lastExecuted?: string;
}

export interface ListWorkflowsResponse {
  success: boolean;
  data: WorkflowRuleDTO[];
  total: number;
}

export class WorkflowsApiClient {
  constructor(private basePath = '/workflows') {}

  async list(params?: { 
    status?: 'draft' | 'published' | 'archived'; 
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<FlowDTO[]> {
    const response = await api.get(this.basePath, { params });
    return (response as any)?.data?.data ?? response.data;
  }

  async get(id: string): Promise<FlowDTO> {
    const response = await api.get(`${this.basePath}/${id}`);
    return (response as any)?.data?.data ?? response.data;
  }

  async getStats(): Promise<FlowStatisticsDTO> {
    const response = await api.get(`${this.basePath}/stats`);
    return (response as any)?.data?.data ?? response.data;
  }

  async getTemplates() {
    const response = await api.get(`${this.basePath}/templates`);
    return (response as any)?.data?.data ?? response.data;
  }

  async create(payload: {
    name: string;
    description?: string;
    nodes?: FlowNodeInputDTO[];
    edges?: FlowEdgeInputDTO[];
  }): Promise<FlowDTO> {
    const response = await api.post(`${this.basePath}`, payload);
    return (response as any)?.data?.data ?? response.data;
  }

  async createFromTemplate(templateName: string, customizations?: Record<string, unknown>): Promise<FlowDTO> {
    // First, check if it's a frontend template
    const frontendTemplate = getTemplateById(templateName);
    
    if (frontendTemplate) {
      // Handle frontend template - create workflow directly from template data
      const nodes: FlowNodeInputDTO[] = frontendTemplate.nodes.map((node) => {
        const backendKind = toBackendNodeKind(node.type);
        return {
          key: node.id,
          kind: backendKind,
          label: node.data?.label || node.id,
          position: node.position || { x: 0, y: 0 },
          config: {
            ...(node.data || {}),
            backendKind, // Store for reference
          },
        };
      });

      const edges: FlowEdgeInputDTO[] = frontendTemplate.edges.map((edge) => ({
        sourceKey: edge.source,
        sourcePort: edge.sourceHandle || 'default',
        targetKey: edge.target,
        targetPort: undefined, // TemplateEdge doesn't have targetHandle
        label: edge.id,
        condition: undefined, // Don't set condition for frontend templates
      }));

      // Create workflow directly using the create endpoint
      // Convert to backend DTO format
      const backendPayload: any = {
        name: (customizations?.name as string) || frontendTemplate.name,
        description: (customizations?.description as string) || frontendTemplate.description,
        nodes: nodes.map(node => ({
          id: node.key,
          type: node.kind,
          name: node.label || node.key,
          position: node.position || { x: 0, y: 0 },
          configuration: node.config || {},
          inputs: [],
          outputs: []
        })),
        connections: edges.map((edge, index) => {
          const conn: any = {
            id: edge.label || `conn-${index}`,
            sourceNodeId: edge.sourceKey,
            sourceOutput: edge.sourcePort || 'default',
            targetNodeId: edge.targetKey,
            targetInput: edge.targetPort || 'default',
          };
          // Only include condition if it's defined and is an object
          if (edge.condition && typeof edge.condition === 'object') {
            conn.condition = edge.condition;
          }
          return conn;
        }),
        metadata: {
          templateId: frontendTemplate.id,
          category: frontendTemplate.category,
          tags: frontendTemplate.tags,
          difficulty: frontendTemplate.difficulty,
        },
      };

      const response = await api.post(`${this.basePath}`, backendPayload);
      return (response as any)?.data?.data ?? response.data;
    }

    // Fall back to backend template API
    const response = await api.post(`${this.basePath}/templates/${templateName}`, customizations || {});
    return (response as any)?.data?.data ?? response.data;
  }

  async update(id: string, payload: {
    name?: string;
    description?: string;
    nodes?: FlowNodeInputDTO[];
    edges?: FlowEdgeInputDTO[];
    status?: 'draft' | 'published' | 'archived';
    isActive?: boolean;
    metadata?: Record<string, any>;
  }): Promise<FlowDTO> {
    // Convert to backend DTO format
    const backendPayload: any = {
      name: payload.name,
      description: payload.description,
      isActive: payload.isActive ?? (payload.status === 'published'),
    };
    
    // Convert nodes to backend format if provided
    if (payload.nodes) {
      backendPayload.nodes = payload.nodes.map(node => ({
        id: node.key,
        type: node.kind, // Backend expects 'type' in DTO but stores as 'kind' in DB
        name: node.label || node.key,
        position: node.position || { x: 0, y: 0 },
        configuration: node.config || {}
      }));
    }
    
    // Convert edges to backend format if provided
    if (payload.edges) {
      backendPayload.connections = payload.edges.map((edge, index) => ({
        id: `conn-${index}`,
        sourceNodeId: edge.sourceKey,
        sourceOutput: edge.sourcePort || 'default',
        targetNodeId: edge.targetKey,
        targetInput: edge.targetPort || 'default',
        condition: edge.condition
      }));
    }
    
    // Include metadata if provided (for backward compatibility)
    if (payload.metadata) {
      backendPayload.metadata = payload.metadata;
    }
    
    const response = await api.put(`${this.basePath}/${id}`, backendPayload);
    return (response as any)?.data?.data ?? response.data;
  }

  async publish(id: string): Promise<FlowDTO> {
    const response = await api.put(`${this.basePath}/${id}`, { isActive: true });
    return (response as any)?.data?.data ?? response.data;
  }

  async unpublish(id: string): Promise<FlowDTO> {
    const response = await api.put(`${this.basePath}/${id}`, { isActive: false });
    return (response as any)?.data?.data ?? response.data;
  }

  async remove(id: string): Promise<void> {
    await api.delete(`${this.basePath}/${id}`);
  }

  async execute(id: string, input?: Record<string, unknown>, context?: Record<string, unknown>): Promise<any> {
    const response = await api.post(`${this.basePath}/${id}/execute`, { input: input || {}, context });
    return (response as any)?.data?.data ?? response.data;
  }

  async getExecutions(id: string, params?: { page?: number; limit?: number }): Promise<FlowRunDTO[]> {
    const response = await api.get(`${this.basePath}/${id}/executions`, { params });
    return (response as any)?.data?.data ?? response.data;
  }

  async getExecution(flowId: string, runId: string): Promise<FlowRunDTO> {
    const response = await api.get(`${this.basePath}/${flowId}/executions/${runId}`);
    return (response as any)?.data?.data ?? response.data;
  }

  async analytics(id: string, startDate?: string, endDate?: string) {
    const response = await api.get(`${this.basePath}/${id}/analytics`, { params: { startDate, endDate } });
    return (response as any)?.data?.data ?? response.data;
  }

  // Legacy methods for backward compatibility
  async activate(id: string): Promise<FlowDTO> {
    return this.publish(id);
  }

  async deactivate(id: string): Promise<FlowDTO> {
    return this.unpublish(id);
  }
}

export const workflowsApi = new WorkflowsApiClient();


