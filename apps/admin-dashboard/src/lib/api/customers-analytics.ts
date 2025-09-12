import { api } from './config'

export interface CustomerHealthScore {
  score: number
  factors: {
    ticketVolume: number
    responseTime: number
    satisfaction: number
    engagement: number
    churnRisk: number
  }
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  recommendations: string[]
}

export const customersAnalyticsApi = {
  getHealthScore: async (customerId: string): Promise<CustomerHealthScore> => {
    const { data } = await api.get(`/customers/${customerId}/analytics/health`)
    return data
  },
  getLifetimeValue: async (customerId: string): Promise<any> => {
    const { data } = await api.get(`/customers/${customerId}/analytics/lifetime-value`)
    return data
  },
  getJourney: async (customerId: string): Promise<any> => {
    const { data } = await api.get(`/customers/${customerId}/analytics/journey`)
    return data
  },
  getSegments: async (customerId: string): Promise<any[]> => {
    const { data } = await api.get(`/customers/${customerId}/analytics/segments`)
    return data
  },
  getCustomer360: async (customerId: string): Promise<any> => {
    const { data } = await api.get(`/customers/${customerId}/analytics/360`)
    return data
  }
}


