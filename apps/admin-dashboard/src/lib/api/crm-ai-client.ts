import { api } from './config';

export interface AIInsight {
  id: string;
  name: string;
  score?: number;
  reason?: string;
  suggestedAction?: string;
}

export interface AtRiskDeal {
  id: string;
  name: string;
  riskScore: number;
  riskFactors: string[];
}

export interface ChurnAlert {
  id: string;
  customerName: string;
  primaryReason: string;
  churnProbability?: number;
}

export interface AIRecommendation {
  title: string;
  description: string;
  actionLabel: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface DashboardInsights {
  topLeads: AIInsight[];
  atRiskDeals: AtRiskDeal[];
  churnAlerts: ChurnAlert[];
  recommendations: AIRecommendation[];
}

export interface LeadScore {
  leadId: string;
  score: number;
  factors: Array<{
    name: string;
    weight: number;
    value: number;
  }>;
  confidence: number;
}

export interface DealWinProbability {
  dealId: string;
  winProbability: number;
  factors: Array<{
    name: string;
    impact: string;
  }>;
  nextBestAction: string;
}

export interface ChurnRisk {
  customerId: string;
  churnProbability: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  recommendations: string[];
}

export const crmAiApi = {
  async getDashboardInsights(): Promise<DashboardInsights> {
    const response = await api.get('/crm/ai/dashboard/insights');
    // Backend returns { success: true, data: { topLeads, atRiskDeals, ... } }
    const data = response.data?.data || response.data;
    // Ensure all arrays exist
    return {
      topLeads: Array.isArray(data?.topLeads) ? data.topLeads : [],
      atRiskDeals: Array.isArray(data?.atRiskDeals) ? data.atRiskDeals : [],
      churnAlerts: Array.isArray(data?.churnAlerts) ? data.churnAlerts : [],
      recommendations: Array.isArray(data?.recommendations) ? data.recommendations : [],
    };
  },

  async getLeadScore(leadId: string): Promise<LeadScore> {
    const response = await api.get(`/crm/ai/lead/${leadId}/score`);
    return response.data.data || response.data;
  },

  async getDealWinProbability(dealId: string): Promise<DealWinProbability> {
    const response = await api.get(`/crm/ai/deal/${dealId}/win-probability`);
    return response.data.data || response.data;
  },

  async getChurnRisk(customerId: string): Promise<ChurnRisk> {
    const response = await api.get(`/crm/ai/customer/${customerId}/churn-risk`);
    return response.data.data || response.data;
  },
};
