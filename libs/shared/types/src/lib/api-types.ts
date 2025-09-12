/**
 * API Types
 * Types for API requests, responses, and documentation
 */

// Import shared types from types.ts
// ApiResponse import removed - not used in this file

// Common API Response Types
// ApiResponse is imported from types.ts

export interface ApiError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, any>;
}

export interface ApiMeta {
  timestamp: string;
  requestId: string;
  version: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Configuration API Types
export interface OrganizationConfigRequest {
  name: string;
  website?: string;
  industry?: string;
  size?: string;
  timezone?: string;
  description?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  contact?: {
    email?: string;
    phone?: string;
  };
}

export interface BrandingConfigRequest {
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  logoUrl?: string;
  faviconUrl?: string;
  fontFamily?: string;
  customCSS?: string;
  theme?: 'light' | 'dark' | 'auto';
}

export interface CustomFieldRequest {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'date' | 'email' | 'url';
  label: string;
  description?: string;
  required: boolean;
  options?: string[];
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  order?: number;
  isActive?: boolean;
}

// Integration API Types
export interface IntegrationRequest {
  type: string;
  name: string;
  description?: string;
  config: Record<string, any>;
  isActive?: boolean;
  tags?: string[];
}

export interface WebhookRequest {
  name: string;
  url: string;
  events: string[];
  secret?: string;
  headers?: Record<string, string>;
  isActive?: boolean;
  retryPolicy?: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
  };
}

export interface ChannelIntegrationRequest {
  channelType: string;
  name: string;
  config: Record<string, any>;
  isActive?: boolean;
  priority?: number;
}

// Progress API Types
export interface StepProgressRequest {
  stepId: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  progress?: number;
  data?: Record<string, any>;
  notes?: string;
}

export interface MilestoneRequest {
  name: string;
  description?: string;
  requiredSteps: string[];
  reward?: {
    type: 'badge' | 'points' | 'feature' | 'discount';
    value: any;
    description: string;
  };
  isActive?: boolean;
}

export interface ReminderRequest {
  type: 'email' | 'push' | 'sms' | 'in_app';
  title: string;
  message: string;
  scheduledFor: Date;
  frequency?: 'once' | 'daily' | 'weekly';
  conditions?: Record<string, any>;
}

// Analytics API Types
export interface AnalyticsQuery {
  period?: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  startDate?: Date;
  endDate?: Date;
  groupBy?: string[];
  filters?: Record<string, any>;
  metrics?: string[];
}

export interface DashboardRequest {
  name: string;
  description?: string;
  layout: {
    columns: number;
    rows: number;
    gridSize: 'small' | 'medium' | 'large';
  };
  widgets: DashboardWidgetRequest[];
  filters?: DashboardFilterRequest[];
  isPublic?: boolean;
  tags?: string[];
}

export interface DashboardWidgetRequest {
  type: 'metric' | 'chart' | 'table' | 'gauge' | 'progress' | 'text';
  title: string;
  description?: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  config: Record<string, any>;
  dataSource: {
    type: 'metric' | 'query' | 'external';
    source: string;
    query?: string;
    parameters?: Record<string, any>;
  };
  refreshInterval?: number;
}

export interface DashboardFilterRequest {
  name: string;
  type: 'date' | 'select' | 'multiselect' | 'text' | 'number';
  field: string;
  defaultValue?: any;
  options?: Array<{ label: string; value: any }>;
  isRequired?: boolean;
}

// Template API Types
export interface TemplateRequest {
  name: string;
  description: string;
  industry: string;
  category: 'complete' | 'workflow' | 'faq' | 'email' | 'dashboard' | 'survey';
  tags?: string[];
  configuration: Record<string, any>;
  metadata?: {
    companySize?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
    complexity?: 'simple' | 'moderate' | 'complex';
    estimatedSetupTime?: number;
    prerequisites?: string[];
    supportedFeatures?: string[];
    integrations?: string[];
    languages?: string[];
  };
  isPublic?: boolean;
}

export interface TemplateReviewRequest {
  rating: number;
  comment: string;
  pros?: string[];
  cons?: string[];
}

export interface TemplateApplyRequest {
  templateId: string;
  customizations?: Record<string, any>;
  overrideExisting?: boolean;
}

// Data Import API Types
export interface ImportJobRequest {
  type: 'customers' | 'tickets' | 'agents' | 'knowledge_base';
  fileName: string;
  mappings?: ImportMappingRequest[];
  options?: {
    skipDuplicates?: boolean;
    updateExisting?: boolean;
    validateOnly?: boolean;
  };
}

export interface ImportMappingRequest {
  sourceField: string;
  targetField: string;
  required: boolean;
  transform?: string;
  defaultValue?: any;
}

// Survey API Types
export interface SurveyRequest {
  name: string;
  description?: string;
  type: 'nps' | 'csat' | 'ces' | 'custom';
  questions: SurveyQuestionRequest[];
  triggers?: SurveyTriggerRequest[];
  settings?: {
    theme?: 'light' | 'dark';
    branding?: {
      logo?: string;
      colors?: {
        primary: string;
        secondary: string;
      };
    };
    notifications?: {
      email: boolean;
      webhook?: string;
    };
    anonymization?: boolean;
    responseLimit?: number;
  };
  isActive?: boolean;
}

export interface SurveyQuestionRequest {
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

export interface SurveyTriggerRequest {
  type: 'time' | 'event' | 'manual';
  condition: string;
  delay?: number;
  frequency?: 'once' | 'daily' | 'weekly' | 'monthly';
}

// Bulk Operation Types
export interface BulkOperationRequest<T = any> {
  operation: 'create' | 'update' | 'delete' | 'enable' | 'disable';
  items: T[];
  options?: {
    continueOnError?: boolean;
    validateOnly?: boolean;
    batchSize?: number;
  };
}

export interface BulkOperationResponse<T = any> {
  totalItems: number;
  successCount: number;
  errorCount: number;
  results: Array<{
    item: T;
    status: 'success' | 'error' | 'skipped';
    message?: string;
    errors?: ApiError[];
  }>;
}

// Search and Filter Types
export interface SearchRequest {
  query: string;
  filters?: Record<string, any>;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  }[];
  pagination?: {
    page: number;
    pageSize: number;
  };
  facets?: string[];
}

export interface SearchResponse<T = any> {
  items: T[];
  total: number;
  facets?: Record<string, Array<{ value: any; count: number }>>;
  suggestions?: string[];
  pagination: PaginationMeta;
}

// Health Check Types
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  services: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime?: number;
    message?: string;
    lastCheck: string;
  }>;
  metrics?: {
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
    activeConnections: number;
  };
}

// Export Types
export interface ExportRequest {
  format: 'json' | 'csv' | 'xlsx' | 'pdf';
  filters?: Record<string, any>;
  fields?: string[];
  options?: {
    includeHeaders?: boolean;
    dateFormat?: string;
    timezone?: string;
    compression?: 'none' | 'gzip' | 'zip';
  };
}

export interface ExportResponse {
  exportId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  expiresAt?: Date;
  fileSize?: number;
  recordCount?: number;
  createdAt: Date;
}

// Validation Types
export interface ValidationRequest {
  data: Record<string, any>;
  rules?: Record<string, any>;
  context?: Record<string, any>;
}

export interface ValidationResponse {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    code: string;
    value?: any;
  }>;
  warnings: Array<{
    field: string;
    message: string;
    suggestion?: string;
  }>;
}

// Rate Limiting Types
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

// API Key Types
export interface ApiKeyRequest {
  name: string;
  description?: string;
  permissions: string[];
  expiresAt?: Date;
  ipWhitelist?: string[];
  rateLimit?: {
    requests: number;
    window: number; // seconds
  };
}

export interface ApiKeyResponse {
  id: string;
  name: string;
  key: string; // Only returned on creation
  permissions: string[];
  isActive: boolean;
  expiresAt?: Date;
  lastUsed?: Date;
  createdAt: Date;
  usage: {
    totalRequests: number;
    lastMonth: number;
    lastWeek: number;
    lastDay: number;
  };
}