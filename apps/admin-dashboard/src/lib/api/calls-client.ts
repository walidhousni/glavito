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
  async create(payload: { conversationId?: string; type: 'voice' | 'video'; metadata?: Record<string, any> }) {
    const { data } = await api.post('/calls', payload);
    return data as CallRecord;
  },
  async end(callId: string, payload?: { recordingUrl?: string; transcription?: string }) {
    const { data } = await api.patch(`/calls/${callId}/end`, payload);
    return data as CallRecord;
  },
  async list(params?: { conversationId?: string; status?: string }) {
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
    const { data } = await api.get('/tenants/me/call-analytics');
    return data as {
      totals: { totalCalls: number; activeCalls: number; endedCalls: number; totalDurationSec: number; totalCostCents: number };
      breakdown: { byType: Record<string, number>; byDirection: Record<string, number> };
      quality24h: { avgRttMs: number; avgJitterMs: number; avgBitrateUp: number; avgBitrateDown: number; avgPacketLossUp: number; avgPacketLossDown: number };
      last7Days: { date: string; durationSec: number }[];
    };
  },
  async analyzeCall(callId: string, transcript: string) {
    const { data } = await api.post(`/ai/analyze/call/${callId}`, { transcript });
    return data as { analysisId: string; results: any };
  },
};


