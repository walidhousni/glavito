import { api } from './config';

export interface LeadItem {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  company?: string;
  status?: string;
  score?: number;
  source?: string;
  createdAt?: string;
  updatedAt?: string;
  assignedUserId?: string;
}

export interface DealItem {
  id: string;
  title?: string;
  name?: string;
  stage: 'NEW' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';
  valueAmount?: number;
  valueCurrency?: string;
}

export interface PipelineItem { id: string; name: string }
export interface SegmentItem { id: string; name: string; description?: string; customerCount: number }

export const crmApi = {
  async listLeads(q?: string): Promise<LeadItem[]> {
    const res = await api.get('/crm/leads', { params: { q } });
    // Handle nested data structure: response.data.data.data
    const data = (res as any)?.data?.data?.data ?? (res as any)?.data?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  },
  async createLead(payload: Record<string, unknown>): Promise<LeadItem> {
    const res = await api.post('/crm/leads', payload);
    const data = (res as any)?.data?.data ?? res.data;
    return data as LeadItem;
  },
  async rescoreLead(id: string): Promise<LeadItem> {
    const res = await api.post(`/crm/leads/${id}/score`, {});
    const data = (res as any)?.data?.data ?? res.data;
    return data as LeadItem;
  },
  async listDeals(pipelineId?: string): Promise<DealItem[]> {
    const res = await api.get('/crm/deals', { params: { pipelineId } });
    // Handle nested data structure: response.data.data.data
    const data = (res as any)?.data?.data?.data ?? (res as any)?.data?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  },
  async createDeal(payload: Record<string, unknown>): Promise<DealItem> {
    const res = await api.post('/crm/deals', payload);
    const data = (res as any)?.data?.data ?? res.data;
    return data as DealItem;
  },
  async updateDeal(id: string, payload: Record<string, unknown>): Promise<DealItem> {
    const res = await api.patch(`/crm/deals/${id}`, payload);
    const data = (res as any)?.data?.data ?? res.data;
    return data as DealItem;
  },
  async moveDealStage(id: string, stage: string): Promise<DealItem> {
    const res = await api.patch(`/crm/deals/${id}/stage/${stage}`);
    const data = (res as any)?.data?.data ?? res.data;
    return data as DealItem;
  },
  async listPipelines(): Promise<PipelineItem[]> {
    const res = await api.get('/crm/pipelines');
    const data = (res as any)?.data?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  },
  async createPipeline(payload: Record<string, unknown>): Promise<PipelineItem> {
    const res = await api.post('/crm/pipelines', payload);
    const data = (res as any)?.data?.data ?? res.data;
    return data as PipelineItem;
  },
  async listSegments(): Promise<SegmentItem[]> {
    const res = await api.get('/crm/segments');
    // Handle nested data structure: response.data.data.data
    const data = (res as any)?.data?.data?.data ?? (res as any)?.data?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  },
  async segmentMetrics(): Promise<Array<{ segmentId: string; customerCount: number; averageValue: number; monthlyGrowth: number }>> {
    const res = await api.get('/crm/segments/metrics');
    const data = (res as any)?.data?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  },
  async createSegment(payload: Record<string, unknown>) {
    const res = await api.post('/crm/segments', payload);
    const data = (res as any)?.data?.data ?? res.data;
    return data as SegmentItem;
  },
  async updateSegment(id: string, payload: Record<string, unknown>) {
    const res = await api.post(`/crm/segments/${id}`, payload);
    const data = (res as any)?.data?.data ?? res.data;
    return data as SegmentItem;
  },
  async previewSegment(id: string) {
    const res = await api.post(`/crm/segments/${id}/preview`);
    const data = (res as any)?.data?.data ?? res.data;
    return data as { sampleCount: number; totalMatched: number; sampleCustomerIds: string[] };
  },
  async recalcSegment(id: string) {
    const res = await api.post(`/crm/segments/${id}/recalculate`);
    const data = (res as any)?.data?.data ?? res.data;
    return data as { updated: number };
  },
  async exportSegment(id: string, format: 'json' | 'csv' = 'json') {
    const res = await api.get(`/crm/segments/${id}/export`, { params: { format } });
    const data = (res as any)?.data?.data ?? res.data;
    return data as { format: 'json' | 'csv'; count: number; data: any };
  },
  async triggerWorkflowForSegment(id: string, workflowId: string) {
    const res = await api.post(`/crm/segments/${id}/trigger-workflow/${workflowId}`);
    const data = (res as any)?.data?.data ?? res.data;
    return data as { triggered: number };
  },
  async getPipelineAnalytics() {
    const res = await api.get('/crm/analytics/pipeline');
    const data = (res as any)?.data?.data ?? res.data;
    return data as {
      stages: Array<{ stage: string; count: number; totalValue: number }>;
      weightedPipeline: number;
      winRate: number;
      avgCycleDays: number;
      trendByWeek: Array<{ weekStart: string; count: number; value: number }>;
    };
  },
  async getSalesForecast(days = 30) {
    const res = await api.get('/crm/analytics/forecast', { params: { days } });
    const data = (res as any)?.data?.data ?? res.data;
    return data as {
      periodDays: number;
      totalPredicted: number;
      predictions: Array<{ date: string; predictedRevenue: number; confidence: number }>;
    };
  },
  // Custom Fields & Objects (admin)
  async listCustomFields(entity?: string) {
    const res = await api.get('/crm/custom/fields', { params: { entity } });
    return (res as any)?.data?.data ?? res.data;
  },
  async createCustomField(payload: Record<string, unknown>) {
    const res = await api.post('/crm/custom/fields', payload);
    return (res as any)?.data?.data ?? res.data;
  },
  async updateCustomField(id: string, payload: Record<string, unknown>) {
    const res = await api.patch(`/crm/custom/fields/${id}`, payload);
    return (res as any)?.data?.data ?? res.data;
  },
  async deleteCustomField(id: string) {
    const res = await api.delete(`/crm/custom/fields/${id}`);
    return (res as any)?.data?.data ?? res.data;
  },
  async listCustomObjectTypes() {
    const res = await api.get('/crm/custom/object-types');
    return (res as any)?.data?.data ?? res.data;
  },
  async createCustomObjectType(payload: Record<string, unknown>) {
    const res = await api.post('/crm/custom/object-types', payload);
    return (res as any)?.data?.data ?? res.data;
  },
  async updateCustomObjectType(id: string, payload: Record<string, unknown>) {
    const res = await api.patch(`/crm/custom/object-types/${id}`, payload);
    return (res as any)?.data?.data ?? res.data;
  },
  async deleteCustomObjectType(id: string) {
    const res = await api.delete(`/crm/custom/object-types/${id}`);
    return (res as any)?.data?.data ?? res.data;
  },
  async listCustomObjectRecords(typeId: string) {
    const res = await api.get(`/crm/custom/object-types/${typeId}/records`);
    return (res as any)?.data?.data ?? res.data;
  },
  async createCustomObjectRecord(typeId: string, payload: { values?: Record<string, unknown>; references?: Record<string, unknown> }) {
    const res = await api.post(`/crm/custom/object-types/${typeId}/records`, payload);
    return (res as any)?.data?.data ?? res.data;
  },
  async updateCustomObjectRecord(id: string, payload: { values?: Record<string, unknown>; references?: Record<string, unknown> }) {
    const res = await api.patch(`/crm/custom/records/${id}`, payload);
    return (res as any)?.data?.data ?? res.data;
  },
  async deleteCustomObjectRecord(id: string) {
    const res = await api.delete(`/crm/custom/records/${id}`);
    return (res as any)?.data?.data ?? res.data;
  }
};


