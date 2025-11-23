import { api } from './config'

export interface LeadScore {
  leadId: string
  score: number
  probability: number
  factors: Array<{
    feature: string
    value: unknown
    weight: number
    contribution: number
  }>
  explanation: string
  lastUpdated: string
}

export interface ChurnRiskAssessment {
  customerId: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  riskScore: number
  probability: number
  factors: Array<{
    factor: string
    value: unknown
    weight: number
    contribution: number
    trend: 'improving' | 'stable' | 'declining'
  }>
  recommendations: string[]
  lastUpdated: string
}

export interface DealWinPrediction {
  dealId: string
  winProbability: number
  confidence: number
  factors: Array<{
    factor: string
    value: unknown
    weight: number
    contribution: number
  }>
  recommendations: string[]
  lastUpdated: string
}

export interface PricingRecommendation {
  productId: string
  currentPrice: number
  recommendedPrice: number
  confidence: number
  reasoning: string
  expectedImpact: {
    revenue: number
    volume: number
    margin: number
  }
  lastUpdated: string
}

export interface CustomerJourneyMap {
  customerId: string
  journeyId: string
  stages: Array<{
    id: string
    name: string
    status: 'completed' | 'active' | 'pending'
    duration: number
    touchpoints: Array<{
      id: string
      type: string
      timestamp: string
      outcome: string
    }>
  }>
  timeline: Array<{
    timestamp: string
    event: string
    stage: string
    outcome: string
  }>
  insights: {
    totalDuration: number
    conversionRate: number
    dropoffPoints: string[]
    optimizationOpportunities: string[]
  }
  lastUpdated: string
}

export interface AIModel {
  id: string
  name: string
  type: 'lead_scoring' | 'churn_prediction' | 'deal_win_prediction' | 'pricing_optimization'
  version: string
  status: 'training' | 'deployed' | 'deprecated'
  accuracy: number
  description: string
  features: string[]
  lastTrained: string
  performance: {
    accuracy: number
    precision: number
    recall: number
    f1Score: number
  }
}

export interface ModelTrainingJob {
  id: string
  modelId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  startTime: string
  endTime?: string
  metrics?: {
    accuracy: number
    loss: number
    validationScore: number
  }
  error?: string
}

export interface ModelABTest {
  id: string
  name: string
  modelA: string
  modelB: string
  status: 'active' | 'completed' | 'paused'
  startDate: string
  endDate?: string
  results?: {
    modelA: { performance: number; samples: number }
    modelB: { performance: number; samples: number }
    winner?: string
    confidence: number
  }
}

// Unwrap responses from the backend TransformInterceptor and ok() helper.
// Shapes we may receive:
// 1) T
// 2) { data: T }
// 3) { data: { success: boolean, data: T } }
function unwrap<T>(payload: unknown): T {
  // Peel off any number of nested { data: ... } envelopes
  let value: unknown = payload
  while (value && typeof value === 'object' && 'data' in (value as Record<string, unknown>)) {
    value = (value as { data: unknown }).data
  }
  return value as T
}

export const predictiveAnalyticsApi = {
  // Lead Scoring
  async getLeadScores(leadIds?: string[]): Promise<LeadScore[]> {
    const params = leadIds ? { leadIds: leadIds.join(',') } : {}
    const { data } = await api.get('/ai/predictive/lead-scoring/scores', { params })
    return unwrap<LeadScore[]>(data)
  },

  async predictLeadScore(leadId: string): Promise<LeadScore> {
    const { data } = await api.post('/ai/predictive/lead-scoring/predict', { leadId })
    return unwrap<LeadScore>(data)
  },

  async getLeadScoreExplanation(leadId: string): Promise<{ explanation: string; factors: LeadScore['factors'] }> {
    const { data } = await api.get(`/ai/predictive/lead-scoring/explain/${leadId}`)
    return unwrap<{ explanation: string; factors: LeadScore['factors'] }>(data)
  },

  // Churn Prevention
  async getChurnRiskAssessments(customerIds?: string[]): Promise<ChurnRiskAssessment[]> {
    const params = customerIds ? { customerIds: customerIds.join(',') } : {}
    const { data } = await api.get('/ai/predictive/churn-prevention/assessments', { params })
    return unwrap<ChurnRiskAssessment[]>(data)
  },

  async assessChurnRisk(customerId: string): Promise<ChurnRiskAssessment> {
    const { data } = await api.post('/ai/predictive/churn-prevention/assess', { customerId })
    return unwrap<ChurnRiskAssessment>(data)
  },

  async getChurnRiskFactors(customerId: string): Promise<ChurnRiskAssessment['factors']> {
    const { data } = await api.get(`/ai/predictive/churn-prevention/factors/${customerId}`)
    return unwrap<ChurnRiskAssessment['factors']>(data)
  },

  async triggerRetentionCampaign(customerId: string, campaignType: string): Promise<{ campaignId: string; status: string }> {
    const { data } = await api.post('/ai/predictive/churn-prevention/campaigns/trigger', { customerId, campaignType })
    return unwrap<{ campaignId: string; status: string }>(data)
  },

  // Sales Optimization
  async getDealWinPredictions(dealIds?: string[]): Promise<DealWinPrediction[]> {
    const params = dealIds ? { dealIds: dealIds.join(',') } : {}
    const { data } = await api.get('/ai/predictive/sales-optimization/deal-predictions', { params })
    return unwrap<DealWinPrediction[]>(data)
  },

  async predictDealWinLoss(dealId: string): Promise<DealWinPrediction> {
    const { data } = await api.post('/ai/predictive/sales-optimization/predict-deal', { dealId })
    return unwrap<DealWinPrediction>(data)
  },

  async getOptimalPricing(productId: string, context?: Record<string, unknown>): Promise<PricingRecommendation> {
    const { data } = await api.post('/ai/predictive/sales-optimization/pricing', { productId, context })
    return unwrap<PricingRecommendation>(data)
  },

  async getCompetitiveAnalysis(productId: string): Promise<{
    competitors: Array<{ name: string; price: number; features: string[] }>
    marketPosition: string
    recommendations: string[]
  }> {
    const { data } = await api.get(`/ai/predictive/sales-optimization/competitive-analysis/${productId}`)
    return unwrap<{
      competitors: Array<{ name: string; price: number; features: string[] }>
      marketPosition: string
      recommendations: string[]
    }>(data)
  },

  // Customer Journey
  async getCustomerJourneyMaps(customerIds?: string[]): Promise<CustomerJourneyMap[]> {
    const params = customerIds ? { customerIds: customerIds.join(',') } : {}
    const { data } = await api.get('/ai/predictive/customer-journey/maps', { params })
    return unwrap<CustomerJourneyMap[]>(data)
  },

  async mapCustomerJourney(customerId: string): Promise<CustomerJourneyMap> {
    const { data } = await api.post('/ai/predictive/customer-journey/map', { customerId })
    return unwrap<CustomerJourneyMap>(data)
  },

  async getJourneyOptimizationRecommendations(customerId: string): Promise<{
    recommendations: Array<{
      stage: string
      action: string
      expectedImpact: string
      priority: 'low' | 'medium' | 'high'
    }>
    overallScore: number
  }> {
    const { data } = await api.get(`/ai/predictive/customer-journey/optimization/${customerId}`)
    return unwrap<{
      recommendations: Array<{
        stage: string
        action: string
        expectedImpact: string
        priority: 'low' | 'medium' | 'high'
      }>
      overallScore: number
    }>(data)
  },

  // Model Management
  async getModels(): Promise<AIModel[]> {
    const { data } = await api.get('/ai/predictive/models')
    return unwrap<AIModel[]>(data)
  },

  async getModel(modelId: string): Promise<AIModel> {
    const { data } = await api.get(`/ai/predictive/models/${modelId}`)
    return unwrap<AIModel>(data)
  },

  async createModel(payload: {
    name: string
    type: AIModel['type']
    description: string
    features: string[]
  }): Promise<AIModel> {
    const { data } = await api.post('/ai/predictive/models', payload)
    return unwrap<AIModel>(data)
  },

  async updateModel(modelId: string, payload: Partial<AIModel>): Promise<AIModel> {
    const { data } = await api.put(`/ai/predictive/models/${modelId}`, payload)
    return unwrap<AIModel>(data)
  },

  async deleteModel(modelId: string): Promise<void> {
    await api.delete(`/ai/predictive/models/${modelId}`)
  },

  async deployModel(modelId: string): Promise<{ status: string; deployedAt: string }> {
    const { data } = await api.post(`/ai/predictive/models/${modelId}/deploy`)
    return unwrap<{ status: string; deployedAt: string }>(data)
  },

  async getTrainingJobs(): Promise<ModelTrainingJob[]> {
    const { data } = await api.get('/ai/predictive/models/training-jobs')
    return unwrap<ModelTrainingJob[]>(data)
  },

  async startTrainingJob(modelId: string): Promise<ModelTrainingJob> {
    const { data } = await api.post(`/ai/predictive/models/${modelId}/train`)
    return unwrap<ModelTrainingJob>(data)
  },

  async getABTests(): Promise<ModelABTest[]> {
    const { data } = await api.get('/ai/predictive/models/ab-tests')
    return unwrap<ModelABTest[]>(data)
  },

  async createABTest(payload: {
    name: string
    modelA: string
    modelB: string
    startDate: string
    endDate?: string
  }): Promise<ModelABTest> {
    const { data } = await api.post('/ai/predictive/models/ab-tests', payload)
    return unwrap<ModelABTest>(data)
  },

  async getABTestResults(testId: string): Promise<ModelABTest['results']> {
    const { data } = await api.get(`/ai/predictive/models/ab-tests/${testId}/results`)
    return unwrap<ModelABTest['results']>(data)
  }
}
