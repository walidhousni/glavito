'use client';

import { api } from './config';


export interface AISuggestionOptions {
  improveTone?: boolean;
  tone?: string;
  fixGrammar?: boolean;
  format?: 'paragraph' | 'bullets' | 'email' | 'whatsapp';
  context?: Record<string, unknown>;
}

export async function aiGetResponseSuggestions(content: string, options?: AISuggestionOptions) {
  const { data } = await api.post('/ai/suggestions/response', {
    content,
    context: options?.context,
    actions: {
      improveTone: options?.improveTone,
      tone: options?.tone,
      fixGrammar: options?.fixGrammar,
      format: options?.format,
    },
  });
  return data as {
    responses: Array<{ response: string; tone: string; confidence: number; reasoning: string }>;
    templates: Array<{ templateId: string; title: string; content: string; relevanceScore: number }>;
    knowledgeArticles: Array<{ id: string; title: string; snippet: string; relevanceScore: number }>;
    faqs: Array<{ id: string; question: string; answer: string; relevanceScore: number }>;
    rewrite?: string;
    grammarFix?: string;
  };
}

export async function aiSummarizeThread(messages: Array<{ content: string; senderType?: string }>, maxBullets = 5) {
  const { data } = await api.post('/ai/summarize/thread', { messages, maxBullets });
  return data as { success: boolean; data: { short: string; bullets: string[] } };
}

export async function aiSuggestKB(query: string) {
  const { data } = await api.post('/ai/kb/suggest', { query });
  return data as { success: boolean; data: { articles: any[]; faqs: any[] } };
}

export async function aiGetAutopilotConfig() {
  const { data } = await api.get('/ai/autopilot/config');
  return data as { mode: 'off'|'draft'|'auto'; minConfidence: number; allowedChannels: string[] };
}

export async function aiUpdateAutopilotConfig(payload: { mode?: 'off'|'draft'|'auto'; minConfidence?: number; allowedChannels?: string[] }) {
  const { data } = await api.patch('/ai/autopilot/config', payload);
  return data as { success: boolean; config?: { mode?: 'off'|'draft'|'auto'; minConfidence?: number; allowedChannels?: string[] } };
}

export async function aiAutopilotReply(conversationId: string, content: string, channelType?: string) {
  const { data } = await api.post('/ai/autopilot/reply', { conversationId, content, channelType });
  return data as { success: true; data: { decision: string; answer?: string; messageId?: string; confidence?: number } };
}

// ---------------- Aggregated API (for dashboards/admin pages) ----------------

export interface AIInsightsDTO {
  totalAnalyses: number
  averageConfidence: number
  modelsActive: number
  topIntents: Array<{ intent: string; count: number; percentage: number }>
  sentimentTrends: Array<{ date: string; positive: number; negative: number; neutral: number }>
  performanceMetrics: { accuracy: number; responseTime: number; successRate: number }
}

export interface AIRecentAnalysisDTO {
  id: string
  tenantId?: string | null
  conversationId?: string | null
  customerId?: string | null
  content: string
  results: unknown
  processingTime: number
  confidence: number
  createdAt: string
}

type ApiEnvelope<T> = { success?: boolean; data: T }

function unwrap<T>(payload: T | ApiEnvelope<T>): T {
  const maybe = payload as ApiEnvelope<T>
  return (maybe && typeof maybe === 'object' && 'data' in maybe)
    ? (maybe.data as T)
    : (payload as T)
}

export const aiApi = {
  async analyze(payload: { content: string; context?: any; analysisTypes: string[] }) {
    const { data } = await api.post('/ai/analyze', payload)
    return data
  },

  async insights(params?: { from?: string; to?: string }) {
    const query: any = {}
    if (params?.from && params?.to) {
      // Match controller’s expected nested timeRange structure by flattening to query params
      query['timeRange[from]'] = params.from
      query['timeRange[to]'] = params.to
    }
    const { data } = await api.get('/ai/insights', { params: query })
    return unwrap<AIInsightsDTO | undefined>(data)
  },

  async triage(payload: { ticketId?: string; conversationId?: string; content?: string; subject?: string; channel?: string }) {
    const { data } = await api.post('/ai/triage', payload)
    return data
  },

  // getAutopilotConfig is defined below with a typed return (see Autopilot configuration helpers)

  async recentAnalyses(limit = 20, agentId?: string) {
    const params: Record<string, unknown> = { limit }
    if (agentId) params.agentId = agentId
    const { data } = await api.get('/ai/analyses/recent', { params })
    const unwrapped = unwrap<AIRecentAnalysisDTO[] | undefined>(data)
    return Array.isArray(unwrapped) ? unwrapped : []
  },

  async predictEscalation(payload: { content: string; context?: any }) {
    const { data } = await api.post('/ai/predict/escalation', payload)
    return data
  },

  async assessChurnRisk(payload: { content: string; customerId: string; context?: any }) {
    const { data } = await api.post('/ai/assess/churn-risk', payload)
    return data
  },

  async getResponseSuggestions(payload: { content: string; context?: any }) {
    const { data } = await api.post('/ai/suggestions/response', payload)
    return unwrap<{
      responses: Array<{ response: string; tone: string; confidence: number; reasoning: string }>
      templates: Array<{ templateId: string; title: string; content: string; relevanceScore: number }>
      knowledgeArticles: Array<{ id: string; title: string; snippet: string; relevanceScore: number; url?: string }>
      faqs: Array<{ id: string; question: string; answer: string; relevanceScore: number }>
    }>(data)
  },

  async coachingLatest(params: { callId?: string; conversationId?: string }) {
    const { data } = await api.get('/ai/coaching/latest', { params });
    return unwrap<any>(data);
  },

  async coachingTrends(params?: { from?: string; to?: string }) {
    const { data } = await api.get('/ai/coaching/trends', { params });
    return unwrap<any>(data);
  },

  async coachingRecommendations(limit = 10) {
    const { data } = await api.get('/ai/coaching/recommendations', { params: { limit } });
    return unwrap<any>(data);
  },

  async logCoachingAction(payload: { action: string; agentUserId?: string; context?: any; conversationId?: string; callId?: string; coachingAnalysisId?: string }) {
    const { data } = await api.post('/ai/coaching/actions/log', payload)
    return unwrap<{ id: string }>(data)
  },

  async coachingEffectiveness(agentId?: string, windowDays = 30) {
    const { data } = await api.get('/ai/coaching/effectiveness', { params: { agentId, windowDays }})
    return unwrap<{ windowDays: number; score: number; metrics: { clarityDelta?: number; fillerDelta?: number; sentimentDelta?: number; samples: number } }>(data)
  },

  // Autopilot configuration helpers
  async getAutopilotConfig(): Promise<{ mode: 'off'|'draft'|'auto'; minConfidence: number; maxAutoRepliesPerHour: number; allowedChannels: string[]; guardrails: Record<string, unknown> } | undefined> {
    const { data } = await api.get('/ai/autopilot/config')
    const unwrapped = unwrap<any>(data)
    return (unwrapped as any)?.data ?? unwrapped
  },

  async setAutopilotConfig(payload: Partial<{ mode: 'off'|'draft'|'auto'; minConfidence: number; maxAutoRepliesPerHour: number; allowedChannels: string[]; guardrails: Record<string, unknown> }>): Promise<any> {
    const { data } = await api.post('/ai/autopilot/config', payload)
    return unwrap<any>(data)
  },

  async autopilotReply(payload: { conversationId: string; content: string; channelType?: string }): Promise<{ decision: string; answer?: string; messageId?: string; confidence?: number }> {
    const { data } = await api.post('/ai/autopilot/reply', payload)
    const unwrapped = unwrap<{ decision: string; answer?: string; messageId?: string; confidence?: number }>(data as any)
    // unwrap handles envelopes; controller returns { success, data }
    return (data as any)?.data ?? unwrapped
  },
}

// Types already exported above via interface declarations
