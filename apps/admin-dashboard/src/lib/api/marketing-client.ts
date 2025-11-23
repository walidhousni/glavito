import { api } from './config'

export interface CampaignItem {
  id: string
  name: string
  description?: string
  type: 'EMAIL' | 'SMS' | 'SOCIAL' | 'WEBINAR' | 'CONTENT' | 'PAID_ADS'
  status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
  segmentId?: string
  startDate?: string
  endDate?: string
  budget?: number
  spent: number
  subject?: string
}

export interface RelatedTicket {
  id: string
  subject: string
  status: string
  priority: string
  createdAt: string
  tags: string[]
}

export const marketingApi = {
  async list(): Promise<CampaignItem[]> {
    const res = await api.get('/marketing/campaigns')
    return ((res as any).data?.data ?? res.data) as CampaignItem[]
  },
  async get(id: string): Promise<CampaignItem> {
    const res = await api.get(`/marketing/campaigns/${id}`)
    return ((res as any).data?.data ?? res.data) as CampaignItem
  },
  async create(payload: Record<string, unknown>): Promise<CampaignItem> {
    const res = await api.post('/marketing/campaigns', payload)
    return ((res as any).data?.data ?? res.data) as CampaignItem
  },
  async update(id: string, payload: Record<string, unknown>): Promise<CampaignItem> {
    const res = await api.post(`/marketing/campaigns/${id}`, payload)
    return ((res as any).data?.data ?? res.data) as CampaignItem
  },
  async launch(id: string): Promise<{ enqueued: number }> {
    const res = await api.post(`/marketing/campaigns/${id}/launch`)
    return ((res as any).data?.data ?? res.data) as { enqueued: number }
  },
  async schedule(id: string, startDate: string): Promise<CampaignItem> {
    const res = await api.post(`/marketing/campaigns/${id}/schedule`, { startDate })
    return ((res as any).data?.data ?? res.data) as CampaignItem
  },
  async listVariants(id: string): Promise<Array<{ id: string; name: string; weight: number; subject?: string }>> {
    const res = await api.get(`/marketing/campaigns/${id}/variants`)
    return ((res as any).data?.data ?? res.data) as Array<{ id: string; name: string; weight: number; subject?: string }>
  },
  async createVariant(id: string, payload: { name: string; weight?: number; subject?: string; content?: Record<string, unknown> }): Promise<{ id: string }> {
    const res = await api.post(`/marketing/campaigns/${id}/variants`, payload)
    return ((res as any).data?.data ?? res.data) as { id: string }
  },
  async performance(id: string): Promise<{ openRate: number; clickRate: number; totals: Record<string, number> }> {
    const res = await api.get(`/marketing/campaigns/${id}/performance`)
    return ((res as any).data?.data ?? res.data) as { openRate: number; clickRate: number; totals: Record<string, number> }
  }
  ,
  async deliveries(id: string): Promise<Array<{ id: string; status: string; channel: string; customer: { id: string; email?: string; firstName?: string; lastName?: string }; variant?: { id: string; name: string }; sentAt?: string; openedAt?: string; clickedAt?: string }>> {
    const res = await api.get(`/marketing/campaigns/${id}/deliveries`)
    return ((res as any).data?.data ?? res.data) as Array<{ id: string; status: string; channel: string; customer: { id: string; email?: string; firstName?: string; lastName?: string }; variant?: { id: string; name: string }; sentAt?: string; openedAt?: string; clickedAt?: string }>
  }
  ,
  async touchpointsForCustomer(customerId: string): Promise<Array<{ id: string; campaignId: string; campaignName?: string; channel: string; status: string; sentAt?: string; openedAt?: string; clickedAt?: string }>> {
    const res = await api.get(`/marketing/customers/${customerId}/touchpoints`)
    return ((res as any).data?.data ?? res.data) as Array<{ id: string; campaignId: string; campaignName?: string; channel: string; status: string; sentAt?: string; openedAt?: string; clickedAt?: string }>
  },
  async listTemplates(type?: string): Promise<Array<{ id: string; name: string; category?: string; language?: string; content?: string; variables?: string[] }>> {
    const params = type ? { type } : {};
    const res = await api.get('/marketing/campaigns/templates', { params });
    return ((res as any).data?.data ?? res.data) as Array<{ id: string; name: string; category?: string; language?: string; content?: string; variables?: string[] }>;
  },

  async preview(content: string, vars: Record<string, string> = {}): Promise<string> {
    const res = await api.post('/marketing/preview', { content, vars });
    return ((res as any).data?.data ?? res.data) as string;
  },

  async generatePersonalized(campaignId: string, customerId: string, field: 'subject' | 'body'): Promise<string> {
    const res = await api.post('/marketing/personalize', { campaignId, customerId, field });
    return ((res as any).data?.data ?? res.data) as string;
  },

  async exportCampaign(id: string, format: 'csv' | 'pdf'): Promise<string | Blob> {
    const res = await api.get(`/marketing/campaigns/${id}/export`, { params: { format }, responseType: 'blob' });
    return res.data; // Blob for download
  },

  async scheduleReport(payload: { frequency: 'weekly' | 'monthly'; email: string }): Promise<{ success: boolean }> {
    const res = await api.post('/marketing/reports/schedule', payload);
    return ((res as any).data?.data ?? res.data) as { success: boolean };
  },

  async relatedTickets(id: string): Promise<RelatedTicket[]> {
    const res = await api.get(`/marketing/campaigns/${id}/related-tickets`)
    return ((res as any).data?.data ?? res.data) as RelatedTicket[]
  },

  // New APIs
  async createBroadcast(payload: { name: string; description?: string; type: string; segmentId: string }): Promise<{ id: string; enqueued: number }> {
    const res = await api.post('/marketing/campaigns/broadcast', payload);
    return ((res as any).data?.data ?? res.data) as { id: string; enqueued: number };
  },
  async retarget(id: string, payload: { afterHours?: number; condition?: 'no_open' | 'no_click' } = {}): Promise<{ enqueued: number }> {
    const res = await api.post(`/marketing/campaigns/${id}/retarget`, payload);
    return ((res as any).data?.data ?? res.data) as { enqueued: number };
  },
  async conversions(id: string): Promise<Array<{ id: string; amount?: number; currency?: string; occurredAt: string }>> {
    const res = await api.get(`/marketing/campaigns/${id}/conversions`);
    return ((res as any).data?.data ?? res.data) as Array<{ id: string; amount?: number; currency?: string; occurredAt: string }>;
  },
  async createCheckoutSession(payload: { lineItems: Array<{ amount: number; currency: string; quantity?: number; name?: string; description?: string }>; metadata?: Record<string, string>; successUrl?: string; cancelUrl?: string; customerId?: string }): Promise<{ url: string }> {
    const res = await api.post('/stripe/checkout-session', payload);
    return ((res as any).data?.data ?? res.data) as { url: string };
  },
}


