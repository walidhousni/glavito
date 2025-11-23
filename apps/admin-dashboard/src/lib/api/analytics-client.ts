import {api as apiClient} from "./config";


// Benchmarks
export interface BenchmarkMetric {
  metric: string;
  value: number;
  percentile25?: number;
  percentile50?: number;
  percentile75?: number;
  percentile90?: number;
  sampleSize: number;
  trend?: 'up' | 'down' | 'stable';
  comparedToIndustry?: 'above' | 'below' | 'average';
}

export interface TenantBenchmarkComparison {
  tenantValue: number;
  industryAverage: number;
  percentileRank: number;
  difference: number;
  differencePercent: number;
  position: 'above' | 'below' | 'average';
}

export const benchmarksApi = {
  getIndustries: async (): Promise<string[]> => {
    const response = await apiClient.get('/analytics/benchmarks/industries');
    return response.data;
  },

  getMetrics: async (industry: string): Promise<string[]> => {
    const response = await apiClient.get(`/analytics/benchmarks/metrics/${industry}`);
    return response.data;
  },

  getBenchmark: async (
    industry: string,
    metric: string,
    period?: string
  ): Promise<BenchmarkMetric> => {
    const response = await apiClient.get(
      `/analytics/benchmarks/${industry}/${metric}`,
      { params: { period } }
    );
    return response.data;
  },

  getAllBenchmarks: async (
    industry: string,
    period?: string,
    limit?: number
  ): Promise<BenchmarkMetric[]> => {
    const response = await apiClient.get(`/analytics/benchmarks/${industry}`, {
      params: { period, limit },
    });
    return response.data;
  },

  getTrends: async (
    industry: string,
    metric: string,
    startDate: string,
    endDate: string,
    period?: string
  ): Promise<BenchmarkMetric[]> => {
    const response = await apiClient.get(
      `/analytics/benchmarks/${industry}/${metric}/trends`,
      { params: { startDate, endDate, period } }
    );
    return response.data;
  },

  compareTenant: async (
    metric: string,
    value: number,
    period?: string
  ): Promise<TenantBenchmarkComparison> => {
    const response = await apiClient.post('/analytics/benchmarks/compare', {
      metric,
      value,
      period,
    });
    return response.data;
  },
};

// Dashboards
export interface WidgetConfig {
  id: string;
  type: string;
  title: string;
  metric: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  filters?: Record<string, unknown>;
  timeRange?: string;
  groupBy?: string;
  refreshInterval?: number;
  size?: { w: number; h: number };
  position?: { x: number; y: number };
  config?: Record<string, unknown>;
}

export interface DashboardLayout {
  id: string;
  name: string;
  description?: string;
  role?: string;
  industry?: string;
  isDefault?: boolean;
  isPublic?: boolean;
  viewCount?: number;
  layout: Array<{ i: string; x: number; y: number; w: number; h: number }>;
  widgets: WidgetConfig[];
}

export const dashboardsApi = {
  list: async (): Promise<DashboardLayout[]> => {
    const response = await apiClient.get('/analytics/dashboards');
    return response.data;
  },

  getDefault: async (): Promise<DashboardLayout | null> => {
    const response = await apiClient.get('/analytics/dashboards/default');
    return response.data;
  },

  getById: async (id: string): Promise<DashboardLayout> => {
    const response = await apiClient.get(`/analytics/dashboards/${id}`);
    return response.data;
  },

  create: async (data: Omit<DashboardLayout, 'id'>): Promise<DashboardLayout> => {
    const response = await apiClient.post('/analytics/dashboards', data);
    return response.data;
  },

  update: async (
    id: string,
    data: Partial<DashboardLayout>
  ): Promise<DashboardLayout> => {
    const response = await apiClient.put(`/analytics/dashboards/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/analytics/dashboards/${id}`);
  },

  duplicate: async (id: string, name: string): Promise<DashboardLayout> => {
    const response = await apiClient.post(`/analytics/dashboards/${id}/duplicate`, {
      name,
    });
    return response.data;
  },

  getWidgetTypes: async () => {
    const response = await apiClient.get('/analytics/dashboards/widget-types');
    return response.data;
  },

  getWidgetData: async (dashboardId: string, widgetId: string) => {
    const response = await apiClient.get(
      `/analytics/dashboards/${dashboardId}/widgets/${widgetId}/data`
    );
    return response.data;
  },
};

// Reports
export interface MetricDefinition {
  field: string;
  aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'distinct';
  label: string;
  format?: 'number' | 'currency' | 'percent' | 'duration';
}

export interface CustomReport {
  id: string;
  name: string;
  description?: string;
  category: string;
  industry?: string;
  metrics: MetricDefinition[];
  filters?: Record<string, unknown>;
  groupBy?: string[];
  visualization: {
    type: 'line' | 'bar' | 'pie' | 'area' | 'table' | 'number' | 'gauge';
    xAxis?: string;
    yAxis?: string[];
    colors?: string[];
    showLegend?: boolean;
    showGrid?: boolean;
    stacked?: boolean;
  };
  isPublic?: boolean;
  isFavorite?: boolean;
  viewCount?: number;
  lastGeneratedAt?: string;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  schedules?: ReportSchedule[];
}

export interface ReportSchedule {
  id: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  dayOfWeek?: number;
  dayOfMonth?: number;
  time: string;
  timezone: string;
  recipients: string[];
  format: 'pdf' | 'csv' | 'excel' | 'json';
  isActive: boolean;
  nextRun: string;
}

export const reportsApi = {
  list: async (filters?: {
    category?: string;
    industry?: string;
    createdBy?: string;
    isFavorite?: boolean;
  }): Promise<CustomReport[]> => {
    const response = await apiClient.get('/analytics/reports', { params: filters });
    return response.data;
  },

  getById: async (id: string): Promise<CustomReport> => {
    const response = await apiClient.get(`/analytics/reports/${id}`);
    return response.data;
  },

  create: async (data: Partial<CustomReport>): Promise<CustomReport> => {
    const response = await apiClient.post('/analytics/reports', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CustomReport>): Promise<CustomReport> => {
    const response = await apiClient.put(`/analytics/reports/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/analytics/reports/${id}`);
  },

  generate: async (id: string) => {
    const response = await apiClient.post(`/analytics/reports/${id}/generate`);
    return response.data;
  },

  getCategories: async () => {
    const response = await apiClient.get('/analytics/reports/categories');
    return response.data;
  },

  getMetrics: async (category: string) => {
    const response = await apiClient.get(`/analytics/reports/metrics/${category}`);
    return response.data;
  },

  // Schedules
  getSchedules: async (reportId: string): Promise<ReportSchedule[]> => {
    const response = await apiClient.get(`/analytics/reports/${reportId}/schedules`);
    return response.data;
  },

  createSchedule: async (
    reportId: string,
    data: Partial<ReportSchedule>
  ): Promise<ReportSchedule> => {
    const response = await apiClient.post(
      `/analytics/reports/${reportId}/schedules`,
      data
    );
    return response.data;
  },

  updateSchedule: async (
    scheduleId: string,
    data: Partial<ReportSchedule>
  ): Promise<ReportSchedule> => {
    const response = await apiClient.put(
      `/analytics/reports/schedules/${scheduleId}`,
      data
    );
    return response.data;
  },

  deleteSchedule: async (scheduleId: string): Promise<void> => {
    await apiClient.delete(`/analytics/reports/schedules/${scheduleId}`);
  },
};

// Main Analytics API
export const analyticsApi = {
  getRealTimeMetrics: async (timeframe: '24h' | '7d' | '30d' | '90d' = '7d') => {
    const response = await apiClient.get('/analytics/real-time-metrics', {
      params: { timeframe },
    });
    return (response.data?.data ?? response.data) as any;
  },

  getKpiMetrics: async (timeframe: '24h' | '7d' | '30d' | '90d' = '7d') => {
    const response = await apiClient.get('/analytics/kpi-metrics', {
      params: { timeframe },
    });
    return (response.data?.data ?? response.data) as any[];
  },

  getDemandForecast: async (forecastPeriod: number = 30) => {
    const response = await apiClient.get('/analytics/demand-forecast', {
      params: { duration: forecastPeriod },
    });
    return (response.data?.data ?? response.data) as any;
  },

  getCapacityPrediction: async (timeframe: '24h' | '7d' | '30d' | '90d' = '7d') => {
    const response = await apiClient.get('/analytics/capacity-prediction', {
      params: { timeframe },
    });
    return (response.data?.data ?? response.data) as any;
  },

  getChurnPrediction: async () => {
    const response = await apiClient.get('/analytics/churn-prediction');
    return (response.data?.data ?? response.data) as any[];
  },

  getRevenueAttribution: async (timeframe: '24h' | '7d' | '30d' | '90d' = '7d') => {
    const response = await apiClient.get('/analytics/revenue-attribution', {
      params: { timeframe },
    });
    return (response.data?.data ?? response.data) as any;
  },

  getCostAnalytics: async (timeframe: '24h' | '7d' | '30d' | '90d' = '7d') => {
    const response = await apiClient.get('/analytics/cost-analytics', {
      params: { timeframe },
    });
    return (response.data?.data ?? response.data) as any;
  },

  getROIAnalytics: async (timeframe: '24h' | '7d' | '30d' | '90d' = '7d') => {
    const response = await apiClient.get('/analytics/roi-analytics', {
      params: { timeframe },
    });
    return (response.data?.data ?? response.data) as any;
  },

  getChannelAnalytics: async (timeframe: '24h' | '7d' | '30d' | '90d' = '7d') => {
    const response = await apiClient.get('/analytics/channel-analytics', {
      params: { timeframe },
    });
    return (response.data?.data ?? response.data) as any;
  },

  getAgentPerformance: async (agentId?: string, timeframe: '24h' | '7d' | '30d' | '90d' = '7d') => {
    const response = await apiClient.get('/analytics/agent-performance', {
      params: { agentId, timeframe },
    });
    return (response.data?.data ?? response.data) as any[];
  },

  getExecutiveSummary: async () => {
    const response = await apiClient.get('/analytics/executive-summary');
    return (response.data?.data ?? response.data) as { summary: string };
  },

  listReportTemplates: async () => {
    const response = await apiClient.get('/analytics/templates');
    return (response.data?.data ?? response.data) as any[];
  },

  requestExport: async (input: {
    type: 'dashboard' | 'metric' | 'survey';
    sourceId?: string;
    templateId?: string;
    format: 'pdf' | 'csv' | 'excel' | 'json';
    parameters?: Record<string, unknown>;
  }) => {
    const response = await apiClient.post('/analytics/exports', input);
    return (response.data?.data ?? response.data) as any;
  },

  listExports: async () => {
    const response = await apiClient.get('/analytics/exports');
    return (response.data?.data ?? response.data) as any[];
  },

  listSchedules: async () => {
    const response = await apiClient.get('/analytics/schedules');
    return (response.data?.data ?? response.data) as any[];
  },

  createSchedule: async (input: {
    name?: string;
    description?: string;
    type: 'dashboard' | 'metric' | 'survey' | 'custom';
    source: string;
    schedule?: {
      frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
      time: string;
      timezone: string;
      dayOfWeek?: number;
      dayOfMonth?: number;
    };
    recipients?: Array<{
      type: 'email' | 'webhook' | 'slack' | 'teams';
      address: string;
      name?: string;
    }>;
    format?: 'pdf' | 'excel' | 'csv' | 'json';
    filters?: Record<string, unknown>;
  }) => {
    const response = await apiClient.post('/analytics/schedules', input);
    return (response.data?.data ?? response.data) as any;
  },

  listDashboards: async () => {
    const response = await apiClient.get('/analytics/dashboards');
    return (response.data?.data ?? response.data) as any[];
  },

  createDashboard: async (input: {
    name: string;
    description?: string;
    layout: any;
    widgets: any[];
    filters: any[];
    isPublic?: boolean;
  }) => {
    const response = await apiClient.post('/analytics/dashboards', input);
    return (response.data?.data ?? response.data) as any;
  },
};
