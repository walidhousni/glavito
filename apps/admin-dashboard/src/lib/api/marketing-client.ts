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
}


