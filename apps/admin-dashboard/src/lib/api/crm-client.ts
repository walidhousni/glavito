import { api } from './config';

export interface LeadItem {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  company?: string;
  phone?: string;
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
  async updateLead(id: string, payload: Record<string, unknown>): Promise<LeadItem> {
    const res = await api.patch(`/crm/leads/${id}`, payload);
    const data = (res as any)?.data?.data ?? res.data;
    return data as LeadItem;
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
    const rows = Array.isArray(data) ? data : [];
    // Normalize server fields { value, currency } -> client { valueAmount, valueCurrency }
    return rows.map((d: any) => ({
      id: String(d.id),
      title: d.title || d.name,
      name: d.name || d.title,
      stage: String(d.stage || 'NEW').toUpperCase(),
      valueAmount: typeof d.value === 'number' ? d.value : (typeof d.valueAmount === 'number' ? d.valueAmount : undefined),
      valueCurrency: d.currency || d.valueCurrency,
    })) as DealItem[];
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
  async listLeadActivities(leadId: string, options: { page?: number; limit?: number } = {}) {
    const res = await api.get(`/crm/leads/${leadId}/activities`, { params: options });
    const data = (res as any)?.data?.data ?? res.data;
    const pagination = (res as any)?.data?.pagination ?? undefined;
    const rows = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
    return { data: rows as Array<{ id: string; type: string; description: string; metadata?: Record<string, unknown>; createdAt: string; userId?: string }>, pagination };
  },
  async createLeadActivity(leadId: string, payload: { type: string; description: string; metadata?: Record<string, unknown>; userId?: string }) {
    const res = await api.post(`/crm/leads/${leadId}/activities`, payload);
    return ((res as any)?.data?.data ?? res.data) as { id: string };
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
  async addCustomersToSegment(segmentId: string, customerIds: string[]) {
    // Add customers manually to a segment
    const res = await api.post(`/crm/segments/${segmentId}/add-customers`, { customerIds });
    return (res as any)?.data?.data ?? res.data;
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
  },
  
  // Timeline
  async getTimeline(params: {
    customerId?: string;
    leadId?: string;
    dealId?: string;
    types?: string[];
    channels?: string[];
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams: Record<string, string> = {};
    if (params.customerId) queryParams.customerId = params.customerId;
    if (params.leadId) queryParams.leadId = params.leadId;
    if (params.dealId) queryParams.dealId = params.dealId;
    if (params.types) queryParams.types = params.types.join(',');
    if (params.channels) queryParams.channels = params.channels.join(',');
    if (params.dateFrom) queryParams.dateFrom = params.dateFrom;
    if (params.dateTo) queryParams.dateTo = params.dateTo;
    if (params.page) queryParams.page = String(params.page);
    if (params.limit) queryParams.limit = String(params.limit);
    
    const res = await api.get('/crm/timeline', { params: queryParams });
    return (res as any)?.data ?? res.data;
  },
  
  // Links
  async linkTicketToLead(ticketId: string, leadId: string) {
    const res = await api.post(`/crm/links/tickets/${ticketId}/lead`, { leadId });
    return (res as any)?.data ?? res.data;
  },
  
  async unlinkTicketFromLead(ticketId: string) {
    const res = await api.delete(`/crm/links/tickets/${ticketId}/lead`);
    return (res as any)?.data ?? res.data;
  },
  
  async linkTicketToDeal(ticketId: string, dealId: string) {
    const res = await api.post(`/crm/links/tickets/${ticketId}/deal`, { dealId });
    return (res as any)?.data ?? res.data;
  },
  
  async unlinkTicketFromDeal(ticketId: string) {
    const res = await api.delete(`/crm/links/tickets/${ticketId}/deal`);
    return (res as any)?.data ?? res.data;
  },
  
  async getTicketLinks(ticketId: string) {
    const res = await api.get(`/crm/links/tickets/${ticketId}`);
    return (res as any)?.data ?? res.data;
  },
  
  async getLeadTickets(leadId: string) {
    const res = await api.get(`/crm/links/leads/${leadId}/tickets`);
    return (res as any)?.data ?? res.data;
  },
  
  async getDealTickets(dealId: string) {
    const res = await api.get(`/crm/links/deals/${dealId}/tickets`);
    return (res as any)?.data ?? res.data;
  },
  
  // Search
  async search(params: {
    query?: string;
    entities?: string[];
    types?: string[];
    channels?: string[];
    leadStatus?: string[];
    dealStage?: string[];
    ticketStatus?: string[];
    ticketPriority?: string[];
    conversationStatus?: string[];
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const res = await api.get('/crm/search', { params });
    return (res as any)?.data ?? res.data;
  },
  
  // Analytics - Funnel
  async getPipelineFunnel(pipelineId?: string) {
    const res = await api.get('/crm/analytics/funnel', { params: { pipelineId } });
    return (res as any)?.data ?? res.data;
  },
  
  // Analytics - Rep Performance
  async getRepPerformance(timeframe: 'week' | 'month' | 'quarter' = 'month') {
    const res = await api.get('/crm/analytics/rep-performance', { params: { timeframe } });
    return (res as any)?.data ?? res.data;
  },
  
  // Quotes
  async listQuotes(dealId?: string) {
    const res = await api.get('/crm/quotes', { params: { dealId } });
    return (res as any)?.data?.data ?? res.data;
  },
  
  async createQuote(payload: Record<string, unknown>) {
    const res = await api.post('/crm/quotes', payload);
    return (res as any)?.data?.data ?? res.data;
  },
  
  async getQuote(id: string) {
    const res = await api.get(`/crm/quotes/${id}`);
    return (res as any)?.data?.data ?? res.data;
  },
  
  async updateQuote(id: string, payload: Record<string, unknown>) {
    const res = await api.patch(`/crm/quotes/${id}`, payload);
    return (res as any)?.data?.data ?? res.data;
  },
  
  async sendQuote(id: string) {
    const res = await api.post(`/crm/quotes/${id}/send`);
    return (res as any)?.data?.data ?? res.data;
  },
  
  async acceptQuote(id: string) {
    const res = await api.post(`/crm/quotes/${id}/accept`);
    return (res as any)?.data?.data ?? res.data;
  },
  
  async rejectQuote(id: string, reason?: string) {
    const res = await api.post(`/crm/quotes/${id}/reject`, { reason });
    return (res as any)?.data?.data ?? res.data;
  }
};


