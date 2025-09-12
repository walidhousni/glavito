export interface SegmentListItem {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  customerCount: number;
  isActive: boolean;
  isDynamic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SegmentMetrics {
  segmentId: string;
  customerCount: number;
  averageValue: number; // estimated avg deal value (USD)
  monthlyGrowth: number; // percentage -30..+30
}

export interface CreateSegmentDto {
  name: string;
  description?: string;
  criteria?: Record<string, any>;
  isActive?: boolean;
  isDynamic?: boolean;
}

export interface UpdateSegmentDto {
  name?: string;
  description?: string;
  criteria?: Record<string, any>;
  isActive?: boolean;
}

export interface SegmentListResponse {
  segments: SegmentListItem[];
}

export interface SegmentMetricsResponse {
  metrics: SegmentMetrics[];
}

// Advanced criteria DSL for dynamic segmentation
export type SegmentField =
  | 'customer.email'
  | 'customer.phone'
  | 'customer.firstName'
  | 'customer.lastName'
  | 'customer.company'
  | 'customer.tags'
  | 'customer.healthScore'
  | 'customer.churnRisk'
  | 'ticket.count'
  | 'ticket.last30d.count'
  | 'conversation.last30d.count'
  | 'deal.totalValue'
  | 'deal.count';

export type SegmentOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'in'
  | 'not_in'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'exists'
  | 'not_exists';

export interface SegmentCondition {
  field: SegmentField;
  operator: SegmentOperator;
  value?: any;
  valueTo?: any; // for between
}

export interface SegmentCriteriaGroup {
  logic: 'AND' | 'OR';
  conditions: Array<SegmentCondition | SegmentCriteriaGroup>;
}

export interface SegmentPreviewResult {
  sampleCount: number;
  totalMatched: number;
  sampleCustomerIds: string[];
}


