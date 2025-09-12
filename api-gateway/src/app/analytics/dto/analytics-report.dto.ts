export interface AnalyticsReportDto {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: 'standard' | 'custom' | 'scheduled';
  category: string;
  metrics: ReportMetricDto[];
  dimensions: ReportDimensionDto[];
  filters: ReportFilterDto[];
  schedule?: ReportScheduleDto;
  format: 'json' | 'csv' | 'pdf' | 'excel';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lastRunAt?: Date;
}

export interface ReportMetricDto {
  id: string;
  name: string;
  type: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'distinct';
  field: string;
  aggregation?: string;
  format?: string;
  unit?: string;
  description?: string;
}

export interface ReportDimensionDto {
  id: string;
  name: string;
  field: string;
  type: 'date' | 'string' | 'number' | 'boolean';
  format?: string;
  groupBy?: 'day' | 'week' | 'month' | 'quarter' | 'year';
}

export interface ReportFilterDto {
  id: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in';
  value: any;
  logicalOperator?: 'and' | 'or';
}

export interface ReportScheduleDto {
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
  time: string;
  timezone: string;
  recipients: ReportRecipient[];
  enabled: boolean;
}

export interface ReportRecipient {
  email: string;
  name?: string;
  role?: string;
}

export interface KPIMetricDto {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  category: string;
  value: number;
  target?: number;
  unit?: string;
  format: 'number' | 'percentage' | 'currency' | 'duration';
  trend: 'up' | 'down' | 'stable';
  trendValue?: number;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SatisfactionSurveyDto {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: 'nps' | 'csat' | 'custom';
  questions: SurveyQuestionDto[];
  status: 'draft' | 'active' | 'paused' | 'completed';
  targetAudience?: string;
  responseCount: number;
  averageScore?: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

export interface SurveyQuestionDto {
  id: string;
  type: 'rating' | 'choice' | 'multiChoice' | 'text' | 'boolean';
  question: string;
  required: boolean;
  options?: string[];
  scale?: {
    min: number;
    max: number;
    labels?: Record<number, string>;
  };
  placeholder?: string;
}

export interface AnalyticsIntegrationDto {
  id: string;
  tenantId: string;
  type: 'google_analytics' | 'mixpanel' | 'amplitude' | 'custom';
  name: string;
  description?: string;
  config: IntegrationConfigDto;
  status: 'active' | 'inactive' | 'error';
  lastSyncAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IntegrationConfigDto {
  apiKey?: string;
  secretKey?: string;
  projectId?: string;
  trackingId?: string;
  webhookUrl?: string;
  customFields?: Record<string, any>;
}

export interface AnalyticsQueryDto {
  tenantId: string;
  metrics: string[];
  dimensions?: string[];
  filters?: Record<string, any>;
  dateRange: {
    start: Date;
    end: Date;
  };
  granularity: 'hour' | 'day' | 'week' | 'month';
  limit?: number;
  offset?: number;
}

export interface AnalyticsResultDto {
  data: Record<string, any>[];
  summary?: Record<string, any>;
  metadata: {
    total: number;
    filtered: number;
    queryTime: number;
    cacheHit: boolean;
  };
}