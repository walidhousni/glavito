export interface AnalyticsEventDto {
  id: string;
  tenantId: string;
  eventName: string;
  userId?: string;
  sessionId?: string;
  properties: Record<string, any>;
  context: EventContextDto;
  timestamp: Date;
  processed: boolean;
  source: string;
}

export interface EventContextDto {
  ip?: string;
  userAgent?: string;
  referrer?: string;
  url?: string;
  platform?: string;
  device?: string;
  browser?: string;
  os?: string;
  screenResolution?: string;
  timezone?: string;
  locale?: string;
}

export interface EventBatchDto {
  events: AnalyticsEventDto[];
  batchId: string;
  timestamp: Date;
  source: string;
}

export interface EventDefinitionDto {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  category: string;
  properties: EventPropertyDto[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventPropertyDto {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  required: boolean;
  description?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: any[];
  };
}

export interface EventFilterDto {
  eventName?: string;
  userId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  properties?: Record<string, any>;
  source?: string;
  limit?: number;
  offset?: number;
}

export interface EventAggregationDto {
  eventName: string;
  metric: 'count' | 'unique' | 'sum' | 'avg' | 'min' | 'max';
  field?: string;
  groupBy?: string[];
  dateRange: {
    start: Date;
    end: Date;
  };
  granularity: 'hour' | 'day' | 'week' | 'month';
}

export interface EventSummaryDto {
  eventName: string;
  totalEvents: number;
  uniqueUsers: number;
  firstSeen: Date;
  lastSeen: Date;
  properties: Record<string, any>;
}