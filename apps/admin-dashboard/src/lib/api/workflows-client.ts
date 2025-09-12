import api from './config';

export interface WorkflowRuleDTO {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: string;
  priority: number;
  isActive: boolean;
  conditions: unknown;
  actions: unknown;
  triggers: unknown;
  schedule?: unknown;
  metadata: WorkflowMetadataDTO;
  executionCount?: number;
  lastExecuted?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowMetadataDTO {
  // Legacy fields for backward compatibility
  category?: string;
  tags?: string[];
  version?: string;
  createdBy?: string;
  status?: 'draft' | 'active' | 'inactive';
  
  // New node-based structure
  nodes?: WorkflowNodeDTO[];
  connections?: WorkflowConnectionDTO[];
  settings?: WorkflowSettingsDTO;
  variables?: WorkflowVariableDTO[];
  
  // Analytics and execution data
  avgExecutionTime?: number;
  successRate?: number;
  lastExecutionStatus?: string;
  errorCount?: number;
  
  // N8N integration
  n8nWorkflowId?: string;
  n8nExecutionId?: string;
}

export interface WorkflowNodeDTO {
  id: string;
  type: string;
  name: string;
  position: { x: number; y: number };
  configuration: Record<string, any>;
  inputs: Array<{ name: string; type: string; required: boolean }>;
  outputs: Array<{ name: string; type: string; description?: string }>;
}

export interface WorkflowConnectionDTO {
  id: string;
  sourceNodeId: string;
  sourceOutput: string;
  targetNodeId: string;
  targetInput: string;
}

export interface WorkflowSettingsDTO {
  timeout: number;
  maxRetries: number;
  errorHandling: string;
  logging: string;
  executionMode: string;
  priority: string;
  permissions: Array<{ role: string; actions: string[] }>;
  allowedIntegrations: string[];
}

export interface WorkflowVariableDTO {
  name: string;
  type: string;
  defaultValue: any;
  required: boolean;
  description?: string;
}

export interface ListWorkflowsResponse {
  success: boolean;
  data: WorkflowRuleDTO[];
  total: number;
}

export class WorkflowsApiClient {
  constructor(private basePath = '/workflows') {}

  async list(params?: { status?: 'active' | 'inactive' | 'draft'; category?: string; search?: string }) {
    const response = await api.get<ListWorkflowsResponse>(this.basePath, { params });
    return response.data;
  }

  async get(id: string) {
    const response = await api.get<{ success: boolean; data: WorkflowRuleDTO }>(`${this.basePath}/${id}`);
    return response.data;
  }

  async getTemplates() {
    const response = await api.get<{ success: boolean; data: any[] }>(`${this.basePath}/templates`);
    return response.data;
  }

  async create(payload: Partial<WorkflowRuleDTO>) {
    const response = await api.post(`${this.basePath}`, payload);
    return response.data;
  }

  async createFromTemplate(templateName: string, customizations?: Record<string, unknown>) {
    const response = await api.post(`${this.basePath}/templates/${templateName}`, customizations || {});
    return response.data;
  }

  async update(id: string, payload: Partial<WorkflowRuleDTO>) {
    const response = await api.put(`${this.basePath}/${id}`, payload);
    return response.data;
  }

  async remove(id: string) {
    const response = await api.delete(`${this.basePath}/${id}`);
    return response.data;
  }

  async execute(id: string, input?: Record<string, unknown>) {
    const response = await api.post(`${this.basePath}/${id}/execute`, { input: input || {} });
    return response.data;
  }

  async executions(id: string, limit?: number) {
    const response = await api.get(`${this.basePath}/${id}/executions`, { params: { limit } });
    return response.data;
  }

  async analytics(id: string, startDate?: string, endDate?: string) {
    const response = await api.get(`${this.basePath}/${id}/analytics`, { params: { startDate, endDate } });
    return response.data;
  }

  // Sync APIs (manual): /workflows/:id/sync, /workflows/sync-all
  async sync(id: string) {
    const response = await api.post(`${this.basePath}/${id}/sync`);
    return response.data;
  }

  async syncAll(tenantId?: string) {
    const response = await api.post(`${this.basePath}/sync-all`, tenantId ? { tenantId } : undefined);
    return response.data;
  }

  // Activation controls via update(isActive)
  async activate(id: string) {
    const response = await api.put(`${this.basePath}/${id}`, { isActive: true });
    return response.data;
  }
  async deactivate(id: string) {
    const response = await api.put(`${this.basePath}/${id}`, { isActive: false });
    return response.data;
  }
}

export const workflowsApi = new WorkflowsApiClient();


