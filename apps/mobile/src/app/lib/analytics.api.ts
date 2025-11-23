import { createApiClient } from './api';

export type RealTimeMetricsUI = {
  activeTickets: number;
  activeAgents: number;
  averageResponseTime: number;
  customerSatisfactionScore: number;
  queueLength: number;
  channelDistribution: Array<any>;
  priorityDistribution: Array<any>;
  slaBreachRate: number;
};

export async function fetchRealTimeMetrics(): Promise<RealTimeMetricsUI> {
  const api = createApiClient();
  const res = await api.get('/analytics/real-time-metrics');
  return (res.data?.data || {
    activeTickets: 0,
    activeAgents: 0,
    averageResponseTime: 0,
    customerSatisfactionScore: 0,
    queueLength: 0,
    channelDistribution: [],
    priorityDistribution: [],
    slaBreachRate: 0,
  }) as RealTimeMetricsUI;
}

export type KPI = {
  id: string;
  name: string;
  description?: string;
  value: number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  changePercentage?: number;
  chartType?: 'line' | 'bar' | 'gauge' | 'number' | 'pie';
  format?: 'number' | 'percentage' | 'currency' | 'duration';
};

export async function fetchKPIs(): Promise<KPI[]> {
  const api = createApiClient();
  const res = await api.get('/analytics/kpi-metrics');
  return (res.data?.data || []) as KPI[];
}

export async function fetchAgentPerformance(agentId?: string) {
  const api = createApiClient();
  const params: any = {};
  if (agentId) params.agentId = agentId;
  const res = await api.get('/analytics/agent-performance', { params });
  return res.data?.data || {};
}

export async function fetchBusinessInsights() {
  const api = createApiClient();
  const res = await api.get('/analytics/business-insights');
  return res.data?.data || {};
}


