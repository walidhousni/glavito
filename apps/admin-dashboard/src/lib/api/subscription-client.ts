import api from './config'

export type BillingCycle = 'monthly' | 'yearly'

export interface SubscriptionPlanDTO {
  id: string
  name: string
  price: number
  currency: string
  features: string[]
  limits: {
    agents: number
    customers: number
    tickets: number
    storage: number
    apiCalls: number
  }
  isActive: boolean
}

export interface SubscriptionDTO {
  id: string
  tenantId: string
  plan: string
  status: string
  currentPeriodStart: string
  currentPeriodEnd: string
  canceledAt?: string | null
  metadata?: Record<string, unknown> & {
    price?: number
    currency?: string
    billingCycle?: BillingCycle
    features?: string[]
    limits?: Record<string, number>
  }
}

export interface UsageReportDTO {
  subscription: SubscriptionDTO
  usage: { agents: number; customers: number; tickets: number; storage: number; apiCalls: number }
  limits: { agents: number; customers: number; tickets: number; storage: number; apiCalls: number }
}

export const subscriptionApi = {
  async getPlans(): Promise<SubscriptionPlanDTO[]> {
    const { data } = await api.get('/subscription/plans')
    return Array.isArray(data) ? data as SubscriptionPlanDTO[] : (data?.data || [])
  },

  async getCurrent(): Promise<SubscriptionDTO | null> {
    const { data } = await api.get('/subscription/current')
    return (data?.id ? data : data?.data) || null
  },

  async create(planId: string, billingCycle: BillingCycle = 'monthly') {
    const { data } = await api.post('/subscription', { planId, billingCycle })
    return data as SubscriptionDTO
  },

  async update(planId: string, billingCycle: BillingCycle = 'monthly') {
    const { data } = await api.put('/subscription', { planId, billingCycle })
    return data as SubscriptionDTO
  },

  async cancel() {
    const { data } = await api.delete('/subscription')
    return data as SubscriptionDTO
  },

  async usage(): Promise<UsageReportDTO> {
    const { data } = await api.get('/subscription/usage')
    return (data?.subscription ? data : data?.data) as UsageReportDTO
  }
}


