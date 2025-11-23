import { api as apiClient } from "./config";


export interface ScoringRule {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'exists';
  value?: unknown;
  points: number;
  description: string;
}

export interface LeadScoringModel {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  industry?: string;
  isDefault: boolean;
  isActive: boolean;
  rules: ScoringRule[];
  weightConfig: Record<string, number>;
  thresholds: Record<string, unknown>;
  totalLeadsScored: number;
  avgScore?: number;
  conversionRate?: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    leads: number;
  };
}

export interface ScoreResult {
  success: boolean;
  score: number;
  breakdown: Record<string, number>;
  reasons: string[];
  predictedValue?: number;
  conversionProbability?: number;
}

export interface ModelAnalytics {
  model: {
    id: string;
    name: string;
    industry?: string;
    totalLeadsScored: number;
  };
  statistics: {
    avgScore: number;
    conversionRate: number;
    totalLeads: number;
    convertedLeads: number;
    scoreDistribution: Record<string, number>;
  };
}

export const leadScoringApi = {
  /**
   * Calculate score for a specific lead
   */
  async calculateLeadScore(leadId: string, modelId?: string): Promise<ScoreResult> {
    const params = modelId ? `?modelId=${modelId}` : '';
    const response = await apiClient.post(`/crm/lead-scoring/leads/${leadId}/calculate${params}`);
    return response.data;
  },

  /**
   * Bulk score all leads for tenant
   */
  async bulkScoreLeads(modelId?: string): Promise<{ success: boolean; total: number; updated: number; failed: number }> {
    const params = modelId ? `?modelId=${modelId}` : '';
    const response = await apiClient.post(`/crm/lead-scoring/bulk-score${params}`);
    return response.data;
  },

  /**
   * Create a new scoring model
   */
  async createScoringModel(data: {
    name: string;
    description?: string;
    industry?: string;
    rules: ScoringRule[];
    weightConfig?: Record<string, number>;
    thresholds?: Record<string, unknown>;
    isDefault?: boolean;
  }): Promise<LeadScoringModel> {
    const response = await apiClient.post('/crm/lead-scoring/models', data);
    return response.data;
  },

  /**
   * Update a scoring model
   */
  async updateScoringModel(
    modelId: string,
    data: {
      name?: string;
      description?: string;
      industry?: string;
      rules?: ScoringRule[];
      weightConfig?: Record<string, number>;
      thresholds?: Record<string, unknown>;
      isDefault?: boolean;
      isActive?: boolean;
    }
  ): Promise<LeadScoringModel> {
    const response = await apiClient.put(`/crm/lead-scoring/models/${modelId}`, data);
    return response.data;
  },

  /**
   * Get all scoring models for tenant
   */
  async listScoringModels(industry?: string): Promise<LeadScoringModel[]> {
    const params = industry ? `?industry=${industry}` : '';
    const response = await apiClient.get(`/crm/lead-scoring/models${params}`);
    return response.data;
  },

  /**
   * Get a specific scoring model
   */
  async getScoringModel(modelId: string): Promise<LeadScoringModel> {
    const response = await apiClient.get(`/crm/lead-scoring/models/${modelId}`);
    return response.data;
  },

  /**
   * Get scoring model analytics
   */
  async getModelAnalytics(modelId: string): Promise<ModelAnalytics> {
    const response = await apiClient.get(`/crm/lead-scoring/models/${modelId}/analytics`);
    return response.data;
  },

  /**
   * Get lead score history
   */
  async getLeadScoreHistory(leadId: string): Promise<{
    id: string;
    score: number;
    scoreHistory: Array<{
      score: number;
      calculatedAt: string;
      modelId?: string;
      breakdown: Record<string, number>;
    }>;
    scoreReason: Record<string, unknown>;
    predictedValue?: number;
    conversionProbability?: number;
  }> {
    const response = await apiClient.get(`/crm/lead-scoring/leads/${leadId}/history`);
    return response.data;
  }
};

