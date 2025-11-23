import api from './config';

export interface SatisfactionSurvey {
  id: string;
  tenantId: string;
  customerId: string;
  ticketId?: string;
  surveyType: 'csat' | 'nps' | 'ces' | 'custom';
  channel: 'email' | 'whatsapp' | 'web' | 'sms';
  status: 'sent' | 'delivered' | 'opened' | 'responded' | 'expired';
  rating?: number;
  comment?: string;
  customAnswers?: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  respondedAt?: string;
  expiresAt?: string;
}

export interface SatisfactionAnalytics {
  totalSurveys: number;
  responseRate: number;
  averageRating: number;
  satisfactionBreakdown: {
    totalResponses: number;
    positivePct: number;
    negativePct: number;
    neutralPct: number;
  };
  channelBreakdown: Record<string, number>;
  trendData: Array<{
    date: string;
    rating: number;
    responseCount: number;
  }>;
  topIssues: Array<{
    issue: string;
    count: number;
    impact: number;
  }>;
}

export interface SatisfactionQueryParams {
  customerId?: string;
  ticketId?: string;
  surveyType?: string;
  channel?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export const satisfactionApi = {
  // Surveys
  async getCustomerSurveys(customerId: string): Promise<SatisfactionSurvey[]> {
    const { data } = await api.get(`/satisfaction/surveys/customer/${customerId}`);
    return (data as any)?.data ?? data;
  },

  async getSurveyDetails(surveyId: string): Promise<SatisfactionSurvey> {
    const { data } = await api.get(`/satisfaction/surveys/${surveyId}`);
    return (data as any)?.data ?? data;
  },

  async sendEmailSurvey(surveyData: {
    customerId: string;
    ticketId?: string;
    surveyType?: string;
    customQuestions?: Record<string, any>;
    expiresInDays?: number;
  }): Promise<SatisfactionSurvey> {
    const { data } = await api.post('/satisfaction/surveys/email', surveyData);
    return (data as any)?.data ?? data;
  },

  async sendWhatsAppSurvey(surveyData: {
    customerId: string;
    ticketId?: string;
    surveyType?: string;
    customQuestions?: Record<string, any>;
    expiresInDays?: number;
  }): Promise<SatisfactionSurvey> {
    const { data } = await api.post('/satisfaction/surveys/whatsapp', surveyData);
    return (data as any)?.data ?? data;
  },

  async sendSurveyToSegment(surveyData: {
    segmentId: string;
    channel: 'email' | 'whatsapp';
    surveyType?: 'post_resolution' | 'periodic' | 'manual';
    customQuestions?: Array<{
      id: string;
      question: string;
      type: 'rating' | 'text' | 'choice';
      required?: boolean;
      options?: string[];
    }>;
  }): Promise<{ success: boolean; total: number; successful: number; failed: number; results: Array<{ customerId: string; status: string; error?: string }> }> {
    const { data } = await api.post('/satisfaction/surveys/segment', surveyData);
    return (data as any)?.data ?? data;
  },

  async submitSurveyResponse(surveyId: string, response: {
    rating: number;
    comment?: string;
    customAnswers?: Record<string, any>;
  }): Promise<void> {
    await api.post(`/satisfaction/surveys/${surveyId}/response`, response);
  },

  // Analytics
  async getSurveyAnalytics(params?: {
    startDate?: string;
    endDate?: string;
    channel?: string;
    surveyType?: string;
  }): Promise<SatisfactionAnalytics> {
    const { data } = await api.get('/satisfaction/analytics', { params });
    return (data as any)?.data ?? data;
  },

  // Aggregate customer satisfaction score
  async getCustomerSatisfactionScore(customerId: string): Promise<{
    score: number;
    totalSurveys: number;
    lastSurveyDate?: string;
    trend: 'improving' | 'declining' | 'stable';
  }> {
    const { data } = await api.get(`/satisfaction/customer/${customerId}/score`);
    return (data as any)?.data ?? data;
  }
};
