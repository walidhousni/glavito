// Re-export types from the shared analytics library
export interface TimeRange {
  startDate: Date
  endDate: Date
  granularity?: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year'
}

// Deprecated: prefer shared types from @glavito/shared-types
export interface RealTimeMetrics {
  timestamp: Date
  activeTickets: number
  activeAgents: number
  averageResponseTime: number
  averageResolutionTime: number
  customerSatisfactionScore: number
  ticketVelocity: number
  queueLength: number
  slaBreachRate: number
  channelDistribution: ChannelDistribution[]
  priorityDistribution: PriorityDistribution[]
}

export interface ChannelDistribution {
  channelId: string
  channelName: string
  count: number
  percentage: number
}

export interface PriorityDistribution {
  priority: string
  count: number
  percentage: number
}

// Deprecated: prefer shared types from @glavito/shared-types
export interface KPIMetric {
  id: string
  name: string
  value: number
  previousValue?: number
  changePercentage?: number
  trend: 'up' | 'down' | 'stable'
  target?: number
  unit: string
  category: string
  timestamp: Date
}

export interface ForecastPeriod {
  period: 'day' | 'week' | 'month' | 'quarter'
  duration: number
}

export interface DemandForecast {
  period: ForecastPeriod
  predictions: DemandPrediction[]
  confidence: number
  factors: ForecastFactor[]
  accuracy: number
}

export interface DemandPrediction {
  date: Date
  predictedTickets: number
  confidenceInterval: {
    lower: number
    upper: number
  }
  seasonalityFactor: number
  trendFactor: number
}

export interface ForecastFactor {
  name: string
  impact: number
  description: string
}

export interface CapacityPrediction {
  timeRange: TimeRange
  currentCapacity: number
  predictedDemand: number
  utilizationRate: number
  recommendedCapacity: number
  bottlenecks: CapacityBottleneck[]
  recommendations: CapacityRecommendation[]
}

export interface CapacityBottleneck {
  resource: string
  currentUtilization: number
  predictedUtilization: number
  impact: 'low' | 'medium' | 'high' | 'critical'
  recommendations: string[]
}

export interface CapacityRecommendation {
  type: 'hire' | 'train' | 'redistribute' | 'automate'
  description: string
  impact: number
  cost: number
  timeframe: string
}

export interface ChurnPrediction {
  customerId: string
  churnProbability: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  factors: ChurnFactor[]
  recommendations: ChurnRecommendation[]
  timeToChurn: number
}

export interface ChurnFactor {
  name: string
  weight: number
  value: number
  impact: 'positive' | 'negative'
}

export interface ChurnRecommendation {
  action: string
  priority: 'low' | 'medium' | 'high'
  expectedImpact: number
  cost: number
}

export interface CustomerSatisfactionMetrics {
  timeRange: TimeRange
  overallScore: number
  npsScore: number
  csatScore: number
  cesScore: number
  responseCount: number
  trendData: SatisfactionTrendData[]
  segmentBreakdown: SatisfactionSegmentBreakdown[]
  channelBreakdown: SatisfactionChannelBreakdown[]
}

export interface SatisfactionTrendData {
  date: Date
  score: number
  responseCount: number
}

export interface SatisfactionSegmentBreakdown {
  segment: string
  score: number
  responseCount: number
}

export interface SatisfactionChannelBreakdown {
  channelId: string
  channelName: string
  score: number
  responseCount: number
}

export interface AgentPerformanceMetrics {
  agentId: string
  agentName: string
  timeRange: TimeRange
  ticketsHandled: number
  averageResponseTime: number
  averageResolutionTime: number
  firstContactResolutionRate: number
  customerSatisfactionScore: number
  qualityScore: number
  utilizationRate: number
  escalationRate: number
  coachingOpportunities: CoachingOpportunity[]
  performanceTrend: PerformanceTrendData[]
}

export interface CoachingOpportunity {
  area: string
  currentScore: number
  targetScore: number
  priority: 'low' | 'medium' | 'high'
  recommendations: string[]
  resources: string[]
}

export interface PerformanceTrendData {
  date: Date
  metric: string
  value: number
}

export interface ChannelAnalytics {
  channelId: string
  channelName: string
  channelType: string
  timeRange: TimeRange
  totalInteractions: number
  conversionRate: number
  resolutionRate: number
  averageResponseTime: number
  customerSatisfactionScore: number
  costPerInteraction: number
  revenueAttribution: number
  trendData: ChannelTrendData[]
}

export interface ChannelTrendData {
  date: Date
  metric: string
  value: number
}

export interface RevenueAttributionAnalytics {
  timeRange: TimeRange
  totalAttributedRevenue: number
  revenueByChannel: RevenueByChannel[]
  revenueByAgent: RevenueByAgent[]
  revenueByCustomerSegment: RevenueBySegment[]
  revenueImpactAnalysis: RevenueImpactAnalysis[]
  attributionModel: AttributionModel
}

export interface RevenueByChannel {
  channelId: string
  channelName: string
  revenue: number
  percentage: number
}

export interface RevenueByAgent {
  agentId: string
  agentName: string
  revenue: number
  percentage: number
}

export interface RevenueBySegment {
  segment: string
  revenue: number
  percentage: number
}

export interface RevenueImpactAnalysis {
  initiative: string
  revenueImpact: number
  confidence: number
  timeframe: string
}

export interface AttributionModel {
  type: 'first_touch' | 'last_touch' | 'linear' | 'time_decay' | 'custom'
  description: string
  parameters: Record<string, any>
}

export interface CostAnalytics {
  timeRange: TimeRange
  totalCost: number
  costPerTicket: number
  costPerCustomer: number
  costByChannel: CostByChannel[]
  costByTeam: CostByTeam[]
  costTrends: CostTrendData[]
  costOptimizationOpportunities: CostOptimization[]
}

export interface CostByChannel {
  channelId: string
  channelName: string
  cost: number
  percentage: number
}

export interface CostByTeam {
  teamId: string
  teamName: string
  cost: number
  percentage: number
}

export interface CostTrendData {
  date: Date
  cost: number
  volume: number
}

export interface CostOptimization {
  area: string
  currentCost: number
  potentialSavings: number
  effort: 'low' | 'medium' | 'high'
  recommendations: string[]
}

export interface ROIAnalytics {
  timeRange: TimeRange
  overallROI: number
  roiByChannel: ROIByChannel[]
  roiByInitiative: ROIByInitiative[]
  investmentAnalysis: InvestmentAnalysis[]
  roiTrends: ROITrendData[]
  roiProjections: ROIProjection[]
}

export interface ROIByChannel {
  channelId: string
  channelName: string
  roi: number
  investment: number
  return: number
}

export interface ROIByInitiative {
  initiative: string
  roi: number
  investment: number
  return: number
  timeframe: string
}

export interface InvestmentAnalysis {
  category: string
  investment: number
  expectedReturn: number
  paybackPeriod: number
  riskLevel: 'low' | 'medium' | 'high'
}

export interface ROITrendData {
  date: Date
  roi: number
  investment: number
  return: number
}

export interface ROIProjection {
  date: Date
  projectedROI: number
  confidence: number
}

// Custom Reports and Dashboards
export interface CustomReport {
  id: string
  tenantId: string
  definition: CustomReportDefinition
  createdBy: string
  createdAt: Date
  updatedAt: Date
  lastExecutedAt?: Date
  executionCount: number
  isPublic: boolean
  tags: string[]
}

export interface CustomReportDefinition {
  name: string
  description: string
  category: string
  dataSource: string[]
  metrics: ReportMetric[]
  dimensions: ReportDimension[]
  filters: ReportFilter[]
  visualizations: ReportVisualization[]
  schedule?: ReportSchedule
  recipients?: string[]
  parameters?: ReportParameter[]
}

export interface ReportMetric {
  name: string
  aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'distinct'
  field: string
  format?: string
}

export interface ReportDimension {
  name: string
  field: string
  type: 'string' | 'number' | 'date' | 'boolean'
}

export interface ReportFilter {
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'between'
  value: any
}

export interface ReportVisualization {
  type: 'table' | 'chart' | 'metric'
  configuration: Record<string, any>
}

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  time: string
  timezone: string
  enabled: boolean
}

export interface ReportParameter {
  name: string
  type: 'string' | 'number' | 'date' | 'boolean' | 'select'
  defaultValue?: any
  options?: any[]
  required: boolean
}

export interface Dashboard {
  id: string
  tenantId: string
  definition: DashboardDefinition
  createdBy: string
  createdAt: Date
  updatedAt: Date
  lastViewedAt?: Date
  viewCount: number
  isDefault: boolean
}

export interface DashboardDefinition {
  name: string
  description: string
  layout: DashboardLayout
  widgets: DashboardWidget[]
  filters: DashboardFilter[]
  refreshInterval?: number
  isPublic: boolean
  permissions: DashboardPermission[]
}

export interface DashboardLayout {
  type: 'grid' | 'free'
  columns: number
  rowHeight: number
  margin: [number, number]
  padding: [number, number]
}

export interface DashboardWidget {
  id: string
  type: 'metric' | 'chart' | 'table' | 'text' | 'image'
  title: string
  position: WidgetPosition
  size: WidgetSize
  configuration: WidgetConfiguration
  dataSource: WidgetDataSource
  refreshInterval?: number
}

export interface WidgetPosition {
  x: number
  y: number
}

export interface WidgetSize {
  width: number
  height: number
}

export interface WidgetConfiguration {
  chartType?: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'heatmap'
  colors?: string[]
  showLegend?: boolean
  showGrid?: boolean
  animations?: boolean
  [key: string]: any
}

export interface WidgetDataSource {
  type: 'realtime' | 'historical' | 'custom'
  query: string
  parameters?: Record<string, any>
  cacheTimeout?: number
}

export interface DashboardFilter {
  name: string
  type: 'select' | 'multiselect' | 'date' | 'daterange' | 'text'
  field: string
  options?: any[]
  defaultValue?: any
}

export interface DashboardPermission {
  userId?: string
  role?: string
  permissions: ('view' | 'edit' | 'share' | 'delete')[]
}