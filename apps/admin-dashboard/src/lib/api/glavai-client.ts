import {api as apiClient} from './config'


export interface GlavaiConfig {
  autoResolveEnabled: boolean;
  autoResolveConfidenceThreshold: number;
  autoResolveChannels: string[];
  autoResolveSendResponse: boolean;
  glavaiTheme: Record<string, unknown>;
}

export interface CopilotSuggestions {
  knowledgeArticles: Array<{ 
    id: string; 
    title: string; 
    snippet?: string;
    content?: string;
    relevanceScore?: number;
    url?: string;
  }>;
  faqs: Array<{ 
    id: string; 
    question: string; 
    answer: string;
    relevanceScore?: number;
  }>;
  responseSuggestions: Array<{ 
    text: string; 
    tone: string; 
    confidence: number;
    response?: string;
  }>;
  templates: Array<{ 
    id: string; 
    name: string; 
    content: string;
    templateId?: string;
    title?: string;
    relevanceScore?: number;
  }>;
  summary?: string;
}

export interface ConversationSummary {
  short: string;
  bullets: string[];
}

export interface InsightAlert {
  id: string;
  alertType: string;
  severity: string;
  title: string;
  description?: string;
  conversationId?: string;
  ticketId?: string;
  createdAt: string;
}

export interface InsightsData {
  sentimentTrends: Array<{ date: string; positive: number; negative: number; neutral: number }>;
  escalationAlerts: Array<{
    id: string;
    conversationId?: string;
    ticketId?: string;
    probability: number;
    reasoning: string;
    urgencyLevel: string;
  }>;
  intentDistribution: Array<{ intent: string; count: number; percentage: number; category: string }>;
  knowledgeUsage: Array<{
    articleId: string;
    title: string;
    suggestionCount: number;
    viewCount: number;
    helpfulRate: number;
  }>;
  summary: {
    totalAnalyses: number;
    avgConfidence: number;
    escalationRiskCount: number;
    topIntent: string;
  };
}

export interface WidgetData {
  autoResolvesToday: number;
  escalationAlerts: number;
  avgConfidence: number;
  sentimentSnapshot: { positive: number; negative: number; neutral: number };
}

export const glavaiClient = {
  async getConfig(): Promise<GlavaiConfig> {
    const response = await apiClient.get<{ success: boolean; data: GlavaiConfig }>(
      '/ai/glavai/config',
    );
    return response.data.data;
  },

  async updateConfig(config: Partial<GlavaiConfig>): Promise<void> {
    await apiClient.post('/ai/glavai/config', config);
  },

  async getInsights(from?: string, to?: string): Promise<InsightsData> {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    const response = await apiClient.get<{ success: boolean; data: InsightsData }>(
      `/ai/glavai/insights?${params.toString()}`,
    );
    return response.data.data;
  },

  async getInsightsWidget(): Promise<WidgetData> {
    const response = await apiClient.get<{ success: boolean; data: WidgetData }>(
      '/ai/glavai/insights/widget',
    );
    return response.data.data;
  },

  async getCopilotSuggestions(
    conversationId: string,
    context?: { recentMessages?: string[]; customerInfo?: Record<string, unknown> },
  ): Promise<CopilotSuggestions> {
    const response = await apiClient.post<{ success: boolean; data: CopilotSuggestions }>(
      '/ai/glavai/copilot/suggestions',
      { conversationId, context },
    );
    return response.data.data;
  },

  async summarizeConversation(conversationId: string): Promise<ConversationSummary> {
    const response = await apiClient.post<{ success: boolean; data: ConversationSummary }>(
      '/ai/glavai/copilot/summarize',
      { conversationId },
    );
    return response.data.data;
  },

  async triggerAutoResolve(
    conversationId: string,
    params: {
      ticketId?: string;
      content: string;
      channelType?: string;
      customerId?: string;
    },
  ): Promise<{ success: boolean; data: any }> {
    const response = await apiClient.post(`/ai/glavai/auto-resolve/${conversationId}`, params);
    return response.data;
  },

  async getActiveAlerts(limit = 50): Promise<InsightAlert[]> {
    const response = await apiClient.get<{ success: boolean; data: InsightAlert[] }>(
      `/ai/glavai/insights/alerts?limit=${limit}`,
    );
    return response.data.data;
  },

  async getRecentAnalyses(params: { limit?: number; maxConfidence?: number } = {}): Promise<any[]> {
    const query = new URLSearchParams();
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.maxConfidence) query.append('maxConfidence', params.maxConfidence.toString());
    
    const response = await apiClient.get<{ success: boolean; data: any[] }>(
      `/ai/analyses/recent?${query.toString()}`,
    );
    return Array.isArray(response.data?.data) ? response.data.data : [];
  },

  async submitFeedback(data: { analysisId: string; accepted: boolean; category?: string; correction?: string }): Promise<void> {
    await apiClient.post('/ai/feedback', data);
  },
};

