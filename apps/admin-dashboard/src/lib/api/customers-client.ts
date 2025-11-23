import api from './config';

export interface CustomerListItem {
  id: string;
  tenantId: string;
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  tags?: string[];
  healthScore?: number | null;
  churnRisk?: 'low' | 'medium' | 'high' | 'critical' | null;
  healthReasons?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerPreferences {
  marketingPreferences?: { whatsappOptOut?: boolean; emailOptOut?: boolean; smsOptOut?: boolean };
  quietHours?: { start?: string; end?: string; timezone?: string };
  language?: string;
}

export const customersApi = {
  async list(q?: string): Promise<CustomerListItem[]> {
    const res = await api.get('/customers', { params: { q } });
    // Some backends wrap data under data.data
    const data = (res as any)?.data?.data ?? res.data;
    return (data ?? []) as CustomerListItem[];
  },

  async get(id: string): Promise<CustomerListItem> {
    const res = await api.get(`/customers/${id}`);
    const data = (res as any)?.data?.data ?? res.data;
    return data as CustomerListItem;
  },

  async create(payload: Record<string, unknown>): Promise<CustomerListItem> {
    const res = await api.post('/customers', payload);
    const data = (res as any)?.data?.data ?? res.data;
    return data as CustomerListItem;
  },
  async update(id: string, payload: Record<string, unknown>): Promise<CustomerListItem> {
    const res = await api.patch(`/customers/${id}`, payload);
    const data = (res as any)?.data?.data ?? res.data;
    return data as CustomerListItem;
  },
  async rescoreHealth(id: string): Promise<CustomerListItem> {
    const res = await api.post(`/customers/${id}/health/rescore`, {});
    const data = (res as any)?.data?.data ?? res.data;
    return data as CustomerListItem;
  },
  async getInsights(id: string): Promise<{
    keyInsights: string[];
    riskFactors: string[];
    opportunities: string[];
    nextBestActions: string[];
    sentimentAnalysis?: { overall: 'positive' | 'negative' | 'neutral'; score: number; trend: 'improving' | 'stable' | 'declining' };
    behavioralAnalysis?: { recentActivity: Array<{ type: string; count: number }>; channelPreference: Array<{ channel: string; percentage: number }> };
    explanation?: string;
    confidence?: number;
  }> {
    const res = await api.get(`/customers/${id}/analytics/insights`);
    const data = (res as any)?.data?.data ?? res.data;
    return data as any;
  },

  async getHealth(id: string): Promise<import('@/lib/hooks/use-customer-analytics').CustomerHealthScore> {
    let res: any;
    try {
      res = await api.get(`/customers/${id}/analytics/health`);
    } catch {
      res = await api.get(`/customers/${id}/health-score`);
    }
    const data = (res as any)?.data?.data ?? res.data;
    return data;
  },

  async getLifetimeValue(id: string): Promise<{ totalValue: number; predictedValue: number; averageOrderValue: number; purchaseFrequency: number; customerLifespan: number; profitMargin: number }> {
    let res: any;
    try {
      res = await api.get(`/customers/${id}/analytics/lifetime-value`);
    } catch {
      res = await api.get(`/customers/${id}/lifetime-value`);
    }
    const data = (res as any)?.data?.data ?? res.data;
    return data;
  },

  async getJourney(id: string): Promise<{ touchpoints: Array<{ id: string; type: string; timestamp: string | Date; channel: string; interaction: string; outcome: string; sentiment?: string }>; stages: Array<{ stage: string; entryDate: string | Date; duration: number; touchpointCount: number }>; conversionEvents: Array<{ event: string; timestamp: string | Date; value: number; attribution: string[] }> }> {
    // Prefer CustomersController analytics route if available
    try {
      const res = await api.get(`/customers/${id}/analytics/journey`);
      return (res as any)?.data?.data ?? res.data;
    } catch {
      const res = await api.get(`/customers/${id}/journey`);
      return (res as any)?.data?.data ?? res.data;
    }
  },

  async getSegments(id: string): Promise<Array<{ id: string; name: string; description?: string; criteria?: Record<string, unknown>; customerCount?: number; averageValue?: number }>> {
    try {
      const res = await api.get(`/customers/${id}/analytics/segments`);
      return (res as any)?.data?.data ?? res.data;
    } catch {
      const res = await api.get(`/customers/${id}/segments`);
      return (res as any)?.data?.data ?? res.data;
    }
  },

  async getRelationships(id: string): Promise<any> {
    const res = await api.get(`/customers/${id}/relationships`);
    return (res as any)?.data?.data ?? res.data;
  },

  async get360Profile(id: string): Promise<any> {
    const res = await api.get(`/customers/${id}/360-profile`);
    return (res as any)?.data?.data ?? res.data;
  },

  async getAnalyticsDashboard(params?: { timeframe?: '7d' | '30d' | '90d' | '1y' }): Promise<any> {
    const res = await api.get(`/customers/analytics/dashboard`, { params });
    return (res as any)?.data?.data ?? res.data;
  },

  async getBehavioralAnalytics(params: { timeframe?: '7d' | '30d' | '90d' | '1y'; segment?: string } = {}): Promise<any> {
    const res = await api.get(`/customers/behavioral-analytics`, { params });
    return (res as any)?.data?.data ?? res.data;
  },

  async getPredictiveInsights(): Promise<any> {
    const res = await api.get(`/customers/predictive-insights`)
    return (res as any)?.data?.data ?? res.data
  },

  async getActivities(id: string, params: { limit?: number; since?: string; types?: string[] } = {}): Promise<Array<{ id: string; type: string; subject?: string; status?: string; channel?: any; timestamp: string; metadata?: Record<string, unknown> }>> {
    const qp: any = { limit: params.limit };
    if (params.since) qp.since = params.since;
    if (Array.isArray(params.types) && params.types.length) qp.types = params.types.join(',');
    const res = await api.get(`/customers/${id}/activities`, { params: qp });
    const data = (res as any)?.data?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  },

  async getRecentOrders(id: string, limit = 5) {
    const res = await api.get(`/customers/${id}/orders/recent`, { params: { limit } })
    return (res as any)?.data?.data ?? res.data
  },

  async createOrder(id: string, payload: { items: Array<{ sku: string; quantity: number; unitPrice: number; currency?: string }>; notes?: string }) {
    const res = await api.post(`/customers/${id}/orders`, payload)
    return (res as any)?.data?.data ?? res.data
  },

  async whatsappOptOut(id: string) {
    const res = await api.post(`/customers/${id}/preferences/whatsapp/opt-out`, {});
    return (res as any)?.data?.data ?? res.data;
  },
  async whatsappOptIn(id: string) {
    const res = await api.post(`/customers/${id}/preferences/whatsapp/opt-in`, {});
    return (res as any)?.data?.data ?? res.data;
  },
  async getPreferences(id: string): Promise<{ marketingPreferences?: { whatsappOptOut?: boolean; emailOptOut?: boolean; smsOptOut?: boolean }; quietHours?: { start?: string; end?: string; timezone?: string }; language?: string }>{
    const res = await api.get(`/customers/${id}/preferences`)
    const data = (res as any)?.data?.data ?? res.data
    return data as CustomerPreferences
  },
  async updatePreferences(id: string, payload: CustomerPreferences){
    const res = await api.post(`/customers/${id}/preferences`, payload)
    const data = (res as any)?.data?.data ?? res.data
    return data as CustomerPreferences
  },
  async getConsentLogs(id: string): Promise<Array<Record<string, unknown>>>{
    const res = await api.get(`/customers/${id}/consent/logs`)
    const data = (res as any)?.data?.data ?? res.data
    return data as Array<Record<string, unknown>>
  },
  async appendConsent(id: string, payload: { channel?: 'whatsapp'|'email'|'sms'|'web'; consent: boolean; reason?: string }): Promise<Record<string, unknown>>{
    const res = await api.post(`/customers/${id}/consent`, payload)
    const data = (res as any)?.data?.data ?? res.data
    return data as Record<string, unknown>
  },
  async getTrends(params?: { timeframe?: '7d' | '30d' | '90d' | '1y' }): Promise<{ csatTrend: Array<{ label: string; value: number }>; clvTrend: Array<{ label: string; value: number }> }>{
    const res = await api.get(`/customers/analytics/trends`, { params })
    const data = (res as any)?.data?.data ?? res.data
    return data as { csatTrend: Array<{ label: string; value: number }>; clvTrend: Array<{ label: string; value: number }> }
  },
};


