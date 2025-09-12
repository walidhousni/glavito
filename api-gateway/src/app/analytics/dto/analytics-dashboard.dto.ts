export interface AnalyticsDashboardDto {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  layout: DashboardLayoutDto;
  widgets: DashboardWidgetDto[];
  filters: DashboardFilterDto[];
  isDefault: boolean;
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardLayoutDto {
  columns: number;
  rows: number;
  gridSize: 'small' | 'medium' | 'large';
  theme: 'light' | 'dark' | 'auto';
}

export interface DashboardWidgetDto {
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
  config: WidgetConfigDto;
  dataSource: DataSourceDto;
  refreshInterval: number;
  isVisible: boolean;
}

export interface WidgetConfigDto {
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

export interface DataSourceDto {
  type: 'metric' | 'query' | 'external';
  source: string;
  query?: string;
  parameters?: Record<string, any>;
  transformations?: DataTransformationDto[];
}

export interface DataTransformationDto {
  type: 'filter' | 'group' | 'sort' | 'calculate' | 'format';
  config: Record<string, any>;
}

export interface DashboardFilterDto {
  id: string;
  name: string;
  type: 'date' | 'select' | 'multiselect' | 'text' | 'number';
  field: string;
  defaultValue?: any;
  options?: FilterOptionDto[];
  isRequired: boolean;
}

export interface FilterOptionDto {
  label: string;
  value: any;
}