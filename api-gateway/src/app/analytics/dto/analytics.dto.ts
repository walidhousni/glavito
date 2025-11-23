import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, IsDateString, IsEnum, IsNumber, IsArray, IsObject, IsBoolean } from 'class-validator'
import { Type } from 'class-transformer'

export class GetRealTimeMetricsDto {
  @ApiPropertyOptional({ description: 'Start date for metrics' })
  @IsOptional()
  @IsDateString()
  startDate?: string

  @ApiPropertyOptional({ description: 'End date for metrics' })
  @IsOptional()
  @IsDateString()
  endDate?: string

  @ApiPropertyOptional({ 
    description: 'Time granularity',
    enum: ['hour', 'day', 'week', 'month', 'quarter', 'year']
  })
  @IsOptional()
  @IsEnum(['hour', 'day', 'week', 'month', 'quarter', 'year'])
  granularity?: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year'

  @ApiPropertyOptional({ 
    description: 'Timeframe for metrics',
    enum: ['1h', '24h', '7d', '30d', '90d']
  })
  @IsOptional()
  @IsEnum(['1h', '24h', '7d', '30d', '90d'])
  timeframe?: '1h' | '24h' | '7d' | '30d' | '90d'
}

export class GetKPIMetricsDto extends GetRealTimeMetricsDto {
  @ApiPropertyOptional({ 
    description: 'Comma-separated list of KPI IDs',
    example: 'total_tickets,resolution_rate,customer_satisfaction'
  })
  @IsOptional()
  @IsString()
  kpiIds?: string
}

export class GetDemandForecastDto {
  @ApiPropertyOptional({ 
    description: 'Forecast period type',
    enum: ['day', 'week', 'month', 'quarter'],
    default: 'day'
  })
  @IsOptional()
  @IsEnum(['day', 'week', 'month', 'quarter'])
  period?: 'day' | 'week' | 'month' | 'quarter'

  @ApiPropertyOptional({ 
    description: 'Number of periods to forecast',
    default: 30
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  duration?: number
}

export class GetCapacityPredictionDto {
  @ApiPropertyOptional({ description: 'Start date for prediction' })
  @IsOptional()
  @IsDateString()
  startDate?: string

  @ApiPropertyOptional({ description: 'End date for prediction' })
  @IsOptional()
  @IsDateString()
  endDate?: string

  @ApiPropertyOptional({ 
    description: 'Time granularity',
    enum: ['hour', 'day', 'week', 'month', 'quarter', 'year']
  })
  @IsOptional()
  @IsEnum(['hour', 'day', 'week', 'month', 'quarter', 'year'])
  granularity?: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year'
}

export class GetChurnPredictionDto {
  @ApiPropertyOptional({ description: 'Specific customer ID to analyze' })
  @IsOptional()
  @IsString()
  customerId?: string
}

// Shared simple date-range DTO for read endpoints
export class GetDateRangeDto {
  @ApiPropertyOptional({ description: 'Start date (ISO8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string

  @ApiPropertyOptional({ description: 'End date (ISO8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string

  @ApiPropertyOptional({
    description: 'Time granularity',
    enum: ['hour', 'day', 'week', 'month', 'quarter', 'year']
  })
  @IsOptional()
  @IsEnum(['hour', 'day', 'week', 'month', 'quarter', 'year'])
  granularity?: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year'
}

export class GetRevenueAttributionDto extends GetDateRangeDto {}
export class GetCostAnalyticsDto extends GetDateRangeDto {}
export class GetROIAnalyticsDto extends GetDateRangeDto {}
export class GetBusinessInsightsDto extends GetDateRangeDto {}

export class GetChannelAnalyticsDto extends GetDateRangeDto {
  @ApiPropertyOptional({ description: 'Channel ID to focus analytics on' })
  @IsOptional()
  @IsString()
  channelId?: string
}

// Custom Report DTOs
export class ReportMetricDto {
  @ApiProperty({ description: 'Metric name' })
  @IsString()
  name!: string

  @ApiProperty({ 
    description: 'Aggregation type',
    enum: ['sum', 'avg', 'count', 'min', 'max', 'distinct']
  })
  @IsEnum(['sum', 'avg', 'count', 'min', 'max', 'distinct'])
  aggregation!: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'distinct'

  @ApiProperty({ description: 'Field to aggregate' })
  @IsString()
  field!: string

  @ApiPropertyOptional({ description: 'Display format' })
  @IsOptional()
  @IsString()
  format?: string
}

export class ReportDimensionDto {
  @ApiProperty({ description: 'Dimension name' })
  @IsString()
  name!: string

  @ApiProperty({ description: 'Field name' })
  @IsString()
  field!: string

  @ApiProperty({ 
    description: 'Data type',
    enum: ['string', 'number', 'date', 'boolean']
  })
  @IsEnum(['string', 'number', 'date', 'boolean'])
  type!: 'string' | 'number' | 'date' | 'boolean'
}

export class ReportFilterDto {
  @ApiProperty({ description: 'Field to filter' })
  @IsString()
  field!: string

  @ApiProperty({ 
    description: 'Filter operator',
    enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'in', 'between']
  })
  @IsEnum(['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'in', 'between'])
  operator!: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'between'

  @ApiProperty({ description: 'Filter value' })
  value!: unknown
}

export class ReportVisualizationDto {
  @ApiProperty({ 
    description: 'Visualization type',
    enum: ['table', 'chart', 'metric']
  })
  @IsEnum(['table', 'chart', 'metric'])
  type!: 'table' | 'chart' | 'metric'

  @ApiProperty({ description: 'Visualization configuration' })
  @IsObject()
  configuration!: Record<string, unknown>
}

export class ReportScheduleDto {
  @ApiProperty({ 
    description: 'Schedule frequency',
    enum: ['daily', 'weekly', 'monthly', 'quarterly']
  })
  @IsEnum(['daily', 'weekly', 'monthly', 'quarterly'])
  frequency!: 'daily' | 'weekly' | 'monthly' | 'quarterly'

  @ApiProperty({ description: 'Schedule time' })
  @IsString()
  time!: string

  @ApiProperty({ description: 'Timezone' })
  @IsString()
  timezone!: string

  @ApiProperty({ description: 'Whether schedule is enabled' })
  @IsBoolean()
  enabled!: boolean
}

export class ReportParameterDto {
  @ApiProperty({ description: 'Parameter name' })
  @IsString()
  name!: string

  @ApiProperty({ 
    description: 'Parameter type',
    enum: ['string', 'number', 'date', 'boolean', 'select']
  })
  @IsEnum(['string', 'number', 'date', 'boolean', 'select'])
  type!: 'string' | 'number' | 'date' | 'boolean' | 'select'

  @ApiPropertyOptional({ description: 'Default value' })
  @IsOptional()
  defaultValue?: unknown

  @ApiPropertyOptional({ description: 'Available options for select type' })
  @IsOptional()
  @IsArray()
  options?: unknown[]

  @ApiProperty({ description: 'Whether parameter is required' })
  @IsBoolean()
  required!: boolean
}

export class CreateCustomReportDto {
  @ApiProperty({ description: 'Report name' })
  @IsString()
  name!: string

  @ApiProperty({ description: 'Report description' })
  @IsString()
  description!: string

  @ApiProperty({ description: 'Report category' })
  @IsString()
  category!: string

  @ApiProperty({ description: 'Data sources', type: [String] })
  @IsArray()
  @IsString({ each: true })
  dataSource!: string[]

  @ApiProperty({ description: 'Report metrics', type: [ReportMetricDto] })
  @IsArray()
  @Type(() => ReportMetricDto)
  metrics!: ReportMetricDto[]

  @ApiProperty({ description: 'Report dimensions', type: [ReportDimensionDto] })
  @IsArray()
  @Type(() => ReportDimensionDto)
  dimensions!: ReportDimensionDto[]

  @ApiProperty({ description: 'Report filters', type: [ReportFilterDto] })
  @IsArray()
  @Type(() => ReportFilterDto)
  filters!: ReportFilterDto[]

  @ApiProperty({ description: 'Report visualizations', type: [ReportVisualizationDto] })
  @IsArray()
  @Type(() => ReportVisualizationDto)
  visualizations!: ReportVisualizationDto[]

  @ApiPropertyOptional({ description: 'Report schedule', type: ReportScheduleDto })
  @IsOptional()
  @Type(() => ReportScheduleDto)
  schedule?: ReportScheduleDto

  @ApiPropertyOptional({ description: 'Report recipients', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recipients?: string[]

  @ApiPropertyOptional({ description: 'Report parameters', type: [ReportParameterDto] })
  @IsOptional()
  @IsArray()
  @Type(() => ReportParameterDto)
  parameters?: ReportParameterDto[]
}

export class ExecuteCustomReportDto {
  @ApiPropertyOptional({ description: 'Report parameters' })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>
}

// Dashboard DTOs
export class WidgetPositionDto {
  @ApiProperty({ description: 'X coordinate' })
  @IsNumber()
  x!: number

  @ApiProperty({ description: 'Y coordinate' })
  @IsNumber()
  y!: number
}

export class WidgetSizeDto {
  @ApiProperty({ description: 'Widget width' })
  @IsNumber()
  width!: number

  @ApiProperty({ description: 'Widget height' })
  @IsNumber()
  height!: number
}

export class WidgetConfigurationDto {
  @ApiPropertyOptional({ 
    description: 'Chart type',
    enum: ['line', 'bar', 'pie', 'area', 'scatter', 'heatmap']
  })
  @IsOptional()
  @IsEnum(['line', 'bar', 'pie', 'area', 'scatter', 'heatmap'])
  chartType?: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'heatmap'

  @ApiPropertyOptional({ description: 'Chart colors', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  colors?: string[]

  @ApiPropertyOptional({ description: 'Show legend' })
  @IsOptional()
  @IsBoolean()
  showLegend?: boolean

  @ApiPropertyOptional({ description: 'Show grid' })
  @IsOptional()
  @IsBoolean()
  showGrid?: boolean

  @ApiPropertyOptional({ description: 'Enable animations' })
  @IsOptional()
  @IsBoolean()
  animations?: boolean
}

export class WidgetDataSourceDto {
  @ApiProperty({ 
    description: 'Data source type',
    enum: ['realtime', 'historical', 'custom']
  })
  @IsEnum(['realtime', 'historical', 'custom'])
  type!: 'realtime' | 'historical' | 'custom'

  @ApiProperty({ description: 'Data query' })
  @IsString()
  query!: string

  @ApiPropertyOptional({ description: 'Query parameters' })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, unknown>

  @ApiPropertyOptional({ description: 'Cache timeout in seconds' })
  @IsOptional()
  @IsNumber()
  cacheTimeout?: number
}

export class DashboardWidgetDto {
  @ApiProperty({ description: 'Widget ID' })
  @IsString()
  id!: string

  @ApiProperty({ 
    description: 'Widget type',
    enum: ['metric', 'chart', 'table', 'text', 'image']
  })
  @IsEnum(['metric', 'chart', 'table', 'text', 'image'])
  type!: 'metric' | 'chart' | 'table' | 'text' | 'image'

  @ApiProperty({ description: 'Widget title' })
  @IsString()
  title!: string

  @ApiProperty({ description: 'Widget position', type: WidgetPositionDto })
  @Type(() => WidgetPositionDto)
  position!: WidgetPositionDto

  @ApiProperty({ description: 'Widget size', type: WidgetSizeDto })
  @Type(() => WidgetSizeDto)
  size!: WidgetSizeDto

  @ApiProperty({ description: 'Widget configuration', type: WidgetConfigurationDto })
  @Type(() => WidgetConfigurationDto)
  configuration!: WidgetConfigurationDto

  @ApiProperty({ description: 'Widget data source', type: WidgetDataSourceDto })
  @Type(() => WidgetDataSourceDto)
  dataSource!: WidgetDataSourceDto

  @ApiPropertyOptional({ description: 'Refresh interval in seconds' })
  @IsOptional()
  @IsNumber()
  refreshInterval?: number
}

export class DashboardLayoutDto {
  @ApiProperty({ 
    description: 'Layout type',
    enum: ['grid', 'free']
  })
  @IsEnum(['grid', 'free'])
  type!: 'grid' | 'free'

  @ApiProperty({ description: 'Number of columns' })
  @IsNumber()
  columns!: number

  @ApiProperty({ description: 'Row height' })
  @IsNumber()
  rowHeight!: number

  @ApiProperty({ description: 'Margin [x, y]', type: [Number] })
  @IsArray()
  @IsNumber({}, { each: true })
  margin!: [number, number]

  @ApiProperty({ description: 'Padding [x, y]', type: [Number] })
  @IsArray()
  @IsNumber({}, { each: true })
  padding!: [number, number]
}

export class DashboardFilterDto {
  @ApiProperty({ description: 'Filter name' })
  @IsString()
  name!: string

  @ApiProperty({ 
    description: 'Filter type',
    enum: ['select', 'multiselect', 'date', 'daterange', 'text']
  })
  @IsEnum(['select', 'multiselect', 'date', 'daterange', 'text'])
  type!: 'select' | 'multiselect' | 'date' | 'daterange' | 'text'

  @ApiProperty({ description: 'Field to filter' })
  @IsString()
  field!: string

  @ApiPropertyOptional({ description: 'Filter options' })
  @IsOptional()
  @IsArray()
  options?: unknown[]

  @ApiPropertyOptional({ description: 'Default value' })
  @IsOptional()
  defaultValue?: unknown
}

export class DashboardPermissionDto {
  @ApiPropertyOptional({ description: 'User ID' })
  @IsOptional()
  @IsString()
  userId?: string

  @ApiPropertyOptional({ description: 'Role' })
  @IsOptional()
  @IsString()
  role?: string

  @ApiProperty({ 
    description: 'Permissions',
    enum: ['view', 'edit', 'share', 'delete'],
    isArray: true
  })
  @IsArray()
  @IsEnum(['view', 'edit', 'share', 'delete'], { each: true })
  permissions!: ('view' | 'edit' | 'share' | 'delete')[]
}

export class CreateDashboardDto {
  @ApiProperty({ description: 'Dashboard name' })
  @IsString()
  name!: string

  @ApiProperty({ description: 'Dashboard description' })
  @IsString()
  description!: string

  @ApiProperty({ description: 'Dashboard layout', type: DashboardLayoutDto })
  @Type(() => DashboardLayoutDto)
  layout!: DashboardLayoutDto

  @ApiProperty({ description: 'Dashboard widgets', type: [DashboardWidgetDto] })
  @IsArray()
  @Type(() => DashboardWidgetDto)
  widgets!: DashboardWidgetDto[]

  @ApiProperty({ description: 'Dashboard filters', type: [DashboardFilterDto] })
  @IsArray()
  @Type(() => DashboardFilterDto)
  filters!: DashboardFilterDto[]

  @ApiPropertyOptional({ description: 'Refresh interval in seconds' })
  @IsOptional()
  @IsNumber()
  refreshInterval?: number

  @ApiProperty({ description: 'Whether dashboard is public' })
  @IsBoolean()
  isPublic!: boolean

  @ApiProperty({ description: 'Dashboard permissions', type: [DashboardPermissionDto] })
  @IsArray()
  @Type(() => DashboardPermissionDto)
  permissions!: DashboardPermissionDto[]
}

export class UpdateDashboardDto {
  @ApiPropertyOptional({ description: 'Dashboard name' })
  @IsOptional()
  @IsString()
  name?: string

  @ApiPropertyOptional({ description: 'Dashboard description' })
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional({ description: 'Dashboard layout', type: DashboardLayoutDto })
  @IsOptional()
  @Type(() => DashboardLayoutDto)
  layout?: DashboardLayoutDto

  @ApiPropertyOptional({ description: 'Dashboard widgets', type: [DashboardWidgetDto] })
  @IsOptional()
  @IsArray()
  @Type(() => DashboardWidgetDto)
  widgets?: DashboardWidgetDto[]

  @ApiPropertyOptional({ description: 'Dashboard filters', type: [DashboardFilterDto] })
  @IsOptional()
  @IsArray()
  @Type(() => DashboardFilterDto)
  filters?: DashboardFilterDto[]

  @ApiPropertyOptional({ description: 'Refresh interval in seconds' })
  @IsOptional()
  @IsNumber()
  refreshInterval?: number

  @ApiPropertyOptional({ description: 'Whether dashboard is public' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean

  @ApiPropertyOptional({ description: 'Dashboard permissions', type: [DashboardPermissionDto] })
  @IsOptional()
  @IsArray()
  @Type(() => DashboardPermissionDto)
  permissions?: DashboardPermissionDto[]
}