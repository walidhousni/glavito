/**
 * Analytics Types
 * Types for analytics dashboard, KPI metrics, and reporting functionality
 */

export interface AnalyticsDashboard {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  layout: DashboardLayout;
  widgets: DashboardWidget[];
  filters: DashboardFilter[];
  isDefault: boolean;
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardLayout {
  columns: number;
  rows: number;
  gridSize: 'small' | 'medium' | 'large';
  theme: 'light' | 'dark' | 'auto';
}

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'gauge' | 'progress' | 'text';
  title: string;
  description?: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  config: WidgetConfig;
  dataSource: DataSource;
  refreshInterval: number; // seconds
  isVisible: boolean;
}

export interface WidgetConfig {
  chartType?: 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'scatter';
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  timeRange?: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  format?: 'number' | 'percentage' | 'currency' | 'duration';
  threshold?: {
    warning: number;
    critical: number;
  };
}

export interface DataSource {
  type: 'metric' | 'query' | 'external';
  source: string;
  query?: string;
  parameters?: Record<string, any>;
  transformations?: DataTransformation[];
}

export interface DataTransformation {
  type: 'filter' | 'group' | 'sort' | 'calculate' | 'format';
  config: Record<string, any>;
}

export interface DashboardFilter {
  id: string;
  name: string;
  type: 'date' | 'select' | 'multiselect' | 'text' | 'number';
  field: string;
  defaultValue?: any;
  options?: FilterOption[];
  isRequired: boolean;
}

export interface FilterOption {
  label: string;
  value: any;
}

export interface KPIMetric {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  category: 'onboarding' | 'performance' | 'satisfaction' | 'efficiency' | 'growth';
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  unit: string;
  target?: number;
  threshold?: {
    warning: number;
    critical: number;
  };
  calculation: MetricCalculation;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MetricCalculation {
  formula: string;
  dataSources: string[];
  aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'percentile';
  timeWindow: string;
  filters?: Record<string, any>;
}

export interface SatisfactionSurvey {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: 'nps' | 'csat' | 'ces' | 'custom';
  questions: SurveyQuestion[];
  triggers: SurveyTrigger[];
  settings: SurveySettings;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SurveyQuestion {
  id: string;
  type: 'rating' | 'text' | 'choice' | 'multiChoice' | 'boolean';
  question: string;
  description?: string;
  required: boolean;
  options?: string[];
  scale?: {
    min: number;
    max: number;
    labels?: string[];
  };
  order: number;
}

export interface SurveyTrigger {
  type: 'time' | 'event' | 'manual';
  condition: string;
  delay?: number; // minutes
  frequency?: 'once' | 'daily' | 'weekly' | 'monthly';
}

export interface SurveySettings {
  theme: 'light' | 'dark';
  branding: {
    logo?: string;
    colors?: {
      primary: string;
      secondary: string;
    };
  };
  notifications: {
    email: boolean;
    webhook?: string;
  };
  anonymization: boolean;
  responseLimit?: number;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  tenantId: string;
  respondentId?: string;
  responses: Record<string, any>;
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    referrer?: string;
    completionTime: number; // seconds
  };
  submittedAt: Date;
}

export interface ReportSchedule {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: 'dashboard' | 'metric' | 'survey' | 'custom';
  source: string; // dashboard ID, metric ID, etc.
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    time: string; // HH:mm format
    timezone: string;
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
  };
  recipients: ReportRecipient[];
  format: 'pdf' | 'excel' | 'csv' | 'json';
  filters?: Record<string, any>;
  isActive: boolean;
  lastRun?: Date;
  nextRun?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportRecipient {
  type: 'email' | 'webhook' | 'slack' | 'teams';
  address: string;
  name?: string;
}

export interface AnalyticsIntegration {
  id: string;
  tenantId: string;
  type: 'google_analytics' | 'mixpanel' | 'amplitude' | 'segment' | 'custom';
  name: string;
  config: IntegrationConfig;
  isActive: boolean;
  lastSync?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IntegrationConfig {
  apiKey?: string;
  trackingId?: string;
  projectId?: string;
  endpoint?: string;
  headers?: Record<string, string>;
  mappings?: Record<string, string>;
  filters?: Record<string, any>;
}

export interface AnalyticsInsights {
  onboardingMetrics: {
    completionRate: number;
    averageTime: number;
    dropOffPoints: Array<{
      step: string;
      dropOffRate: number;
    }>;
  };
  userEngagement: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    sessionDuration: number;
  };
  satisfactionScores: {
    overall: number;
    nps: number;
    csat: number;
    ces: number;
  };
  trends: {
    completionRate: { trend: 'up' | 'down' | 'stable'; change: number };
    satisfactionScore: { trend: 'up' | 'down' | 'stable'; change: number };
    timeToValue: { trend: 'up' | 'down' | 'stable'; change: number };
  };
  recommendations: Array<{
    type: 'improvement' | 'opportunity' | 'warning';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    impact: string;
  }>;
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  widgets: Partial<DashboardWidget>[];
  preview?: string;
}

export interface SurveyTemplate {
  id: string;
  name: string;
  type: 'nps' | 'csat' | 'ces' | 'custom';
  description: string;
  questions: Partial<SurveyQuestion>[];
  preview?: string;
}

export interface IntegrationTemplate {
  type: string;
  name: string;
  description: string;
  fields: Array<{
    name: string;
    label: string;
    type: 'text' | 'password' | 'number' | 'select';
    required: boolean;
    placeholder?: string;
    options?: string[];
  }>;
  features: string[];
  documentation?: string;
}

export interface MetricValue {
  value: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    borderWidth?: number;
  }>;
}

export interface TableData {
  headers: string[];
  rows: Array<Record<string, any>>;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export interface ReportData {
  title: string;
  description?: string;
  generatedAt: Date;
  timeRange: {
    start: Date;
    end: Date;
  };
  sections: Array<{
    title: string;
    type: 'chart' | 'table' | 'metric' | 'text';
    data: ChartData | TableData | MetricValue | string;
  }>;
  summary?: {
    keyMetrics: Array<{
      name: string;
      value: number;
      unit: string;
      change?: number;
    }>;
    insights: string[];
    recommendations: string[];
  };
}