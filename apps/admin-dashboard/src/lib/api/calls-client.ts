import api from './config';

export interface CallRecord {
  id: string;
  tenantId: string;
  conversationId?: string;
  startedBy: string;
  type: 'voice' | 'video';
  status: 'active' | 'ended' | 'failed';
  startedAt: string;
  endedAt?: string;
  recordingUrl?: string;
  transcription?: string;
}

export const callsApi = {
  async create(payload: { conversationId?: string; type: 'voice' | 'video'; metadata?: Record<string, any>; customerId?: string; channelId?: string }) {
    const { data } = await api.post('/calls', payload);
    return data as CallRecord;
  },
  async end(callId: string, payload?: { recordingUrl?: string; transcription?: string }) {
    const { data } = await api.patch(`/calls/${callId}/end`, payload);
    return data as CallRecord;
  },
  async startOutbound(payload: { to: string; from?: string; conversationId?: string; type?: 'voice' | 'video' }) {
    const { data } = await api.post('/calls/telephony/outbound', payload);
    return data as CallRecord;
  },
  async list(params?: { conversationId?: string; status?: string; customerId?: string }) {
    const { data } = await api.get('/calls', { params });
    return data as CallRecord[];
  },
  async get(callId: string) {
    const { data } = await api.get(`/calls/${callId}`);
    return data as CallRecord;
  },
  async addParticipant(callId: string, payload?: { userId?: string; customerId?: string; role?: string }) {
    const { data } = await api.post(`/calls/${callId}/participants`, payload);
    return data;
  },
  async analyticsMe() {
    const { data } = await api.get('/calls/analytics/me');
    return data as {
      totals: { totalCalls: number; activeCalls: number; endedCalls: number; totalDurationSec: number };
      breakdown: { byType: Record<string, number>; byDirection: Record<string, number> };
      quality24h: { avgRttMs: number; avgJitterMs: number; avgBitrateUp: number; avgBitrateDown: number; avgPacketLossUp: number; avgPacketLossDown: number };
      last7Days: { date: string; durationSec: number }[];
    };
  },
  async quality24h() {
    const { data } = await api.get('/calls/analytics/quality');
    return data as {
      avgRttMs: number;
      avgJitterMs: number;
      avgBitrateUp: number;
      avgBitrateDown: number;
      avgPacketLossUp: number;
      avgPacketLossDown: number;
      sampleCount: number;
      timestamp: Date;
    };
  },
  async trends(days = 7) {
    const { data } = await api.get('/calls/analytics/trends', { params: { days } });
    return data as Array<{ date: string; totalCalls: number; durationSec: number; avgDurationSec: number }>;
  },
  async breakdown(startDate?: Date, endDate?: Date) {
    const { data } = await api.get('/calls/analytics/breakdown', {
      params: {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString()
      }
    });
    return data as { byType: Record<string, number>; byDirection: Record<string, number> };
  },
  async analyzeCall(callId: string, transcript: string) {
    const { data } = await api.post(`/ai/analyze/call/${callId}`, { transcript });
    return data as { analysisId: string; results: any };
  },
};


