export interface AnalyticsServiceInterface {
  // Real-time Analytics
  getRealTimeMetrics(tenantId: string, timeframe?: string): Promise<RealTimeMetrics>
  getCustomKPIs(tenantId: string, kpiIds: string[], timeRange?: DateRange): Promise<KPIMetric[]>
  
  // Predictive Analytics
  getDemandForecast(tenantId: string, forecastPeriod: number): Promise<DemandForecast>
  getCapacityPlanning(tenantId: string, timeframe: string): Promise<CapacityPlan>
  
  // Customer Analytics
  getCustomerSatisfactionMetrics(tenantId: string, dateRange: DateRange): Promise<SatisfactionMetrics>
  getNPSAnalysis(tenantId: string, dateRange: DateRange): Promise<NPSAnalysis>
  getCSATAnalysis(tenantId: string, dateRange: DateRange): Promise<CSATAnalysis>
  
  // Agent Performance
  getAgentPerformanceAnalytics(tenantId: string, agentId?: string, dateRange?: DateRange): Promise<AgentPerformanceAnalytics>
  getQualityScoring(tenantId: string, agentId: string, dateRange: DateRange): Promise<QualityScore>
  getCoachingInsights(tenantId: string, agentId: string): Promise<CoachingInsights>
  
  // Channel Analytics
  getChannelEffectiveness(tenantId: string, dateRange: DateRange): Promise<ChannelEffectiveness>
  getConversionRates(tenantId: string, channelId?: string, dateRange?: DateRange): Promise<ConversionRates>
  
  // Business Impact
  getBusinessImpactAnalytics(tenantId: string, dateRange: DateRange): Promise<BusinessImpactAnalytics>
  getRevenueAttribution(tenantId: string, dateRange: DateRange): Promise<RevenueAttribution>
  getCostAnalysis(tenantId: string, dateRange: DateRange): Promise<CostAnalysis>
  // Business Insights (orders, confirmations, deliveries, earnings)
  getBusinessInsights(tenantId: string, dateRange: DateRange): Promise<BusinessInsights>
  
  // Custom Reports
  createCustomReport(tenantId: string, reportDefinition: ReportDefinition): Promise<CustomReport>
  executeReport(tenantId: string, reportId: string, parameters?: Record<string, any>): Promise<ReportResult>
  scheduleReport(tenantId: string, reportId: string, schedule: ReportSchedule): Promise<ScheduledReport>
}

export interface RealTimeMetrics {
  timestamp: Date
  metrics: {
    // Ticket Metrics
    totalTickets: number
    openTickets: number
    inProgressTickets: number
    resolvedTickets: number
    overdueTickets: number
    
    // Agent Metrics
    activeAgents: number
    availableAgents: number
    busyAgents: number
    averageResponseTime: number
    
    // Customer Metrics
    totalCustomers: number
    newCustomersToday: number
    satisfactionScore: number
    
    // Channel Metrics
    channelActivity: ChannelActivity[]
    
    // Business Metrics
    revenueToday: number
    conversionRate: number
  }
  trends: {
    ticketVolume: TrendData[]
    responseTime: TrendData[]
    satisfaction: TrendData[]
    resolution: TrendData[]
  }
}

export interface KPIMetric {
  id: string
  name: string
  description?: string
  value: number
  previousValue?: number
  changePercentage?: number
  target?: number
  unit: string
  trend: 'up' | 'down' | 'stable'
  trendPercentage?: number
  category: 'performance' | 'quality' | 'efficiency' | 'satisfaction' | 'business'
  lastUpdated?: Date
  timestamp?: Date
  
  // Visualization settings
  chartType?: 'line' | 'bar' | 'gauge' | 'number' | 'pie'
  color?: string
  format?: 'number' | 'percentage' | 'currency' | 'duration'
}

export interface DemandForecast {
  forecastPeriod: number // days
  predictions: Array<{
    date: Date
    predictedTickets: number
    confidence: number
    factors: string[]
  }>
  seasonalPatterns: Array<{
    pattern: string
    impact: number
    description: string
  }>
  recommendations: string[]
}

export interface CapacityPlan {
  currentCapacity: {
    totalAgents: number
    availableHours: number
    utilizationRate: number
  }
  requiredCapacity: {
    peakHours: Array<{
      hour: number
      requiredAgents: number
      currentAgents: number
      gap: number
    }>
    recommendations: Array<{
      type: 'hire' | 'schedule' | 'redistribute'
      description: string
      impact: string
      priority: 'low' | 'medium' | 'high'
    }>
  }
  forecastAccuracy: number
}

export interface SatisfactionMetrics {
  overall: {
    averageScore: number
    totalResponses: number
    responseRate: number
    trend: TrendData[]
  }
  byChannel: Array<{
    channel: string
    averageScore: number
    responseCount: number
    trend: number
  }>
  byAgent: Array<{
    agentId: string
    agentName: string
    averageScore: number
    responseCount: number
    trend: number
  }>
  byCategory: Array<{
    category: string
    averageScore: number
    responseCount: number
    commonIssues: string[]
  }>
  sentimentDistribution: {
    positive: number
    neutral: number
    negative: number
  }
}

export interface NPSAnalysis {
  score: number // -100 to 100
  responseRate: number
  distribution: {
    promoters: number // 9-10
    passives: number // 7-8
    detractors: number // 0-6
  }
  trends: TrendData[]
  segmentAnalysis: Array<{
    segment: string
    score: number
    responseCount: number
  }>
  verbatimFeedback: Array<{
    score: number
    comment: string
    category: string
    sentiment: 'positive' | 'neutral' | 'negative'
    timestamp: Date
  }>
}

export interface CSATAnalysis {
  averageScore: number // 1-5
  responseRate: number
  distribution: {
    excellent: number // 5
    good: number // 4
    average: number // 3
    poor: number // 2
    terrible: number // 1
  }
  trends: TrendData[]
  correlations: Array<{
    factor: string
    correlation: number
    impact: string
  }>
}

export interface ChurnPrediction {
  customerId: string
  churnProbability: number
  riskLevel: 'low' | 'medium' | 'high'
  factors: Array<{
    name: string
    weight: number
    value: number
    impact: 'positive' | 'negative'
  }>
  recommendations: Array<{
    action: string
    priority: 'low' | 'medium' | 'high'
    expectedImpact: number
    cost: number
  }>
  timeToChurn: number // days
}

export interface AgentPerformanceAnalytics {
  agentId: string
  agentName: string
  period: DateRange
  
  // Core Metrics
  metrics: {
    ticketsHandled: number
    averageResponseTime: number
    averageResolutionTime: number
    firstContactResolution: number
    customerSatisfaction: number
    utilizationRate: number
  }
  
  // Quality Metrics
  qualityScore: number
  qualityFactors: Array<{
    factor: string
    score: number
    weight: number
    feedback: string
  }>
  
  // Productivity Metrics
  productivity: {
    ticketsPerHour: number
    messagesPerTicket: number
    escalationRate: number
    reopenRate: number
  }
  
  // Comparison
  teamAverage: {
    responseTime: number
    resolutionTime: number
    satisfaction: number
    productivity: number
  }
  
  // Trends
  trends: {
    performance: TrendData[]
    satisfaction: TrendData[]
    productivity: TrendData[]
  }
  
  // Coaching Insights
  strengths: string[]
  improvementAreas: string[]
  recommendations: string[]
}

export interface QualityScore {
  overallScore: number
  components: Array<{
    component: string
    score: number
    weight: number
    description: string
  }>
  recentEvaluations: Array<{
    date: Date
    score: number
    evaluator: string
    feedback: string
    categories: Record<string, number>
  }>
  improvementPlan: Array<{
    area: string
    currentScore: number
    targetScore: number
    actions: string[]
    timeline: string
  }>
}

export interface CoachingInsights {
  agentId: string
  period: DateRange
  
  // Performance Insights
  performanceInsights: Array<{
    insight: string
    category: 'strength' | 'opportunity' | 'concern'
    impact: 'high' | 'medium' | 'low'
    evidence: string[]
    recommendations: string[]
  }>
  
  // Skill Assessment
  skillAssessment: Array<{
    skill: string
    currentLevel: number
    targetLevel: number
    gap: number
    developmentActions: string[]
  }>
  
  // Learning Recommendations
  learningPath: Array<{
    topic: string
    priority: number
    estimatedTime: string
    resources: Array<{
      type: 'article' | 'video' | 'course' | 'practice'
      title: string
      url?: string
      duration?: string
    }>
  }>
  
  // Goal Setting
  suggestedGoals: Array<{
    goal: string
    metric: string
    currentValue: number
    targetValue: number
    timeframe: string
    difficulty: 'easy' | 'medium' | 'challenging'
  }>
}

export interface ChannelEffectiveness {
  channels: Array<{
    channelId: string
    channelName: string
    channelType: string
    
    // Volume Metrics
    totalMessages: number
    totalTickets: number
    averageMessagesPerTicket: number
    
    // Performance Metrics
    averageResponseTime: number
    averageResolutionTime: number
    firstContactResolution: number
    
    // Quality Metrics
    customerSatisfaction: number
    escalationRate: number
    reopenRate: number
    
    // Business Metrics
    conversionRate: number
    revenueAttribution: number
    costPerTicket: number
    
    // Trends
    trends: {
      volume: TrendData[]
      performance: TrendData[]
      satisfaction: TrendData[]
    }
  }>
  
  // Cross-channel Analysis
  crossChannelInsights: Array<{
    insight: string
    channels: string[]
    impact: string
    recommendation: string
  }>
  
  // Optimization Recommendations
  optimizations: Array<{
    channel: string
    opportunity: string
    potentialImpact: string
    effort: 'low' | 'medium' | 'high'
    priority: number
  }>
}

export interface ConversionRates {
  overall: {
    rate: number
    totalVisitors: number
    totalConversions: number
    trend: TrendData[]
  }
  
  byChannel: Array<{
    channel: string
    rate: number
    visitors: number
    conversions: number
    trend: number
  }>
  
  bySource: Array<{
    source: string
    rate: number
    visitors: number
    conversions: number
    value: number
  }>
  
  funnelAnalysis: Array<{
    stage: string
    visitors: number
    dropoffRate: number
    conversionRate: number
  }>
}

export interface BusinessImpactAnalytics {
  revenue: {
    total: number
    growth: number
    forecast: number
    attribution: RevenueAttribution
  }
  
  costs: {
    total: number
    breakdown: CostBreakdown
    efficiency: CostEfficiency
  }
  
  roi: {
    overall: number
    byChannel: Array<{
      channel: string
      roi: number
      investment: number
      return: number
    }>
    byInitiative: Array<{
      initiative: string
      roi: number
      investment: number
      return: number
    }>
  }
  
  productivity: {
    ticketsPerAgent: number
    revenuePerAgent: number
    costPerTicket: number
    efficiencyScore: number
  }
}

// Business Insights: high-level commerce-like KPIs derived from CRM Deals and Payments
export interface BusinessInsights {
  summary: {
    orders: number
    confirmations: number
    deliveries: number
    earnings: number
  }
  trends: {
    daily: Array<{
      date: string
      orders: number
      confirmations: number
      deliveries: number
      earnings: number
    }>
  }
  customers?: {
    newCustomers: number
    activeCustomers: number
    revenuePerCustomer: number
    averageOrderValue: number
    repeatPurchaseRate: number
  }
  segments?: Array<{
    segment: string
    revenue: number
    customers: number
  }>
  csat?: {
    averageRating: number
    totalResponses: number
  }
}

export interface RevenueAttribution {
  byChannel: Array<{
    channel: string
    revenue: number
    percentage: number
    tickets: number
    averageValue: number
  }>
  
  byAgent: Array<{
    agentId: string
    agentName: string
    revenue: number
    tickets: number
    averageValue: number
  }>
  
  byCustomerSegment: Array<{
    segment: string
    revenue: number
    customers: number
    averageValue: number
  }>
  
  attributionModel: {
    model: 'first-touch' | 'last-touch' | 'linear' | 'time-decay' | 'position-based'
    confidence: number
    methodology: string
  }
}

export interface CostAnalysis {
  totalCosts: number
  breakdown: CostBreakdown
  efficiency: CostEfficiency
  trends: TrendData[]
  
  // Cost per metrics
  costPerTicket: number
  costPerResolution: number
  costPerCustomer: number
  costPerAgent: number
  
  // Optimization opportunities
  optimizations: Array<{
    area: string
    currentCost: number
    potentialSaving: number
    effort: 'low' | 'medium' | 'high'
    impact: 'low' | 'medium' | 'high'
    recommendation: string
  }>
}

export interface CostBreakdown {
  personnel: number
  technology: number
  infrastructure: number
  training: number
  external: number
  overhead: number
}

export interface CostEfficiency {
  score: number // 0-100
  benchmarks: Array<{
    metric: string
    value: number
    industry: number
    percentile: number
  }>
  improvements: Array<{
    area: string
    potential: number
    actions: string[]
  }>
}

export interface ReportDefinition {
  id?: string
  name: string
  description: string
  category: string
  
  // Data Configuration
  dataSource: string
  filters: ReportFilter[]
  groupBy: string[]
  metrics: string[]
  
  // Visualization
  chartType: 'table' | 'line' | 'bar' | 'pie' | 'scatter' | 'heatmap'
  visualization: VisualizationConfig
  
  // Scheduling
  schedule?: ReportSchedule
  
  // Access Control
  permissions: ReportPermission[]
  
  // Metadata
  tags: string[]
  createdBy: string
  createdAt?: Date
  updatedAt?: Date
}

export interface ReportFilter {
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'between'
  value: any
  label?: string
}

export interface VisualizationConfig {
  title: string
  subtitle?: string
  xAxis?: {
    label: string
    type: 'category' | 'datetime' | 'numeric'
  }
  yAxis?: {
    label: string
    type: 'numeric' | 'percentage'
    format?: string
  }
  colors?: string[]
  showLegend: boolean
  showDataLabels: boolean
}

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  time: string // HH:mm format
  timezone: string
  recipients: string[]
  format: 'pdf' | 'excel' | 'csv' | 'json'
  
  // Advanced scheduling
  dayOfWeek?: number // 0-6 for weekly
  dayOfMonth?: number // 1-31 for monthly
  endDate?: Date
}

export interface ReportPermission {
  role: string
  actions: ('read' | 'write' | 'execute' | 'schedule' | 'share')[]
}

export interface CustomReport {
  id: string
  definition: ReportDefinition
  lastExecuted?: Date
  executionCount: number
  averageExecutionTime: number
  status: 'active' | 'inactive' | 'error'
}

export interface ReportResult {
  reportId: string
  executedAt: Date
  executionTime: number
  
  // Data
  data: any[]
  summary: ReportSummary
  
  // Metadata
  parameters: Record<string, any>
  rowCount: number
  columnCount: number
  
  // Export options
  exportUrls: {
    pdf?: string
    excel?: string
    csv?: string
    json?: string
  }
}

export interface ReportSummary {
  keyMetrics: Array<{
    name: string
    value: number
    format: string
    trend?: number
  }>
  insights: string[]
  recommendations: string[]
}

export interface ScheduledReport {
  id: string
  reportId: string
  schedule: ReportSchedule
  nextExecution: Date
  lastExecution?: Date
  status: 'active' | 'paused' | 'error'
  executionHistory: Array<{
    executedAt: Date
    status: 'success' | 'failed'
    duration: number
    error?: string
  }>
}

export interface DateRange {
  startDate: Date
  endDate: Date
}

export interface TrendData {
  date: Date
  value: number
  change?: number
  changePercentage?: number
}

export interface ChannelActivity {
  channelId: string
  channelName: string
  channelType: string
  messageCount: number
  ticketCount: number
  activeConversations: number
  averageResponseTime: number
}

// Predictive Analytics Interfaces
export interface PredictiveModel {
  id: string
  name: string
  type: 'classification' | 'regression' | 'clustering' | 'forecasting'
  status: 'training' | 'ready' | 'error' | 'updating'
  accuracy: number
  lastTrained: Date
  features: string[]
  
  // Model metadata
  algorithm: string
  hyperparameters: Record<string, any>
  trainingData: {
    size: number
    dateRange: DateRange
    features: string[]
  }
  
  // Performance metrics
  performance: {
    accuracy: number
    precision: number
    recall: number
    f1Score: number
    mse?: number // for regression
    mae?: number // for regression
  }
}

export interface PredictionResult {
  modelId: string
  prediction: any
  confidence: number
  factors: Array<{
    factor: string
    importance: number
    value: any
  }>
  explanation: string
  timestamp: Date
}

// Advanced Analytics Interfaces
export interface AnalyticsDashboard {
  id: string
  name: string
  description: string
  layout: DashboardLayout
  widgets: DashboardWidget[]
  filters: DashboardFilter[]
  permissions: DashboardPermission[]
  
  // Metadata
  createdBy: string
  createdAt: Date
  updatedAt: Date
  lastViewedAt?: Date
  viewCount: number
  
  // Sharing
  isPublic: boolean
  shareUrl?: string
}

export interface DashboardLayout {
  columns: number
  rows: number
  responsive: boolean
  theme: 'light' | 'dark' | 'auto'
}

export interface DashboardWidget {
  id: string
  type: 'metric' | 'chart' | 'table' | 'text' | 'image'
  title: string
  position: {
    x: number
    y: number
    width: number
    height: number
  }
  
  // Data configuration
  dataSource: string
  query: string
  refreshInterval: number // seconds
  
  // Visualization
  visualization: VisualizationConfig
  
  // Interactivity
  drillDown?: {
    enabled: boolean
    target: string
    parameters: Record<string, string>
  }
  
  // Conditional formatting
  conditionalFormatting?: Array<{
    condition: string
    format: {
      color?: string
      backgroundColor?: string
      icon?: string
    }
  }>
}

export interface DashboardFilter {
  id: string
  name: string
  type: 'date' | 'select' | 'multiselect' | 'text' | 'number'
  field: string
  defaultValue?: any
  options?: Array<{
    label: string
    value: any
  }>
  required: boolean
}

export interface DashboardPermission {
  role: string
  actions: ('view' | 'edit' | 'share' | 'export')[]
}

// Time Series Analytics
export interface TimeSeriesAnalytics {
  getTimeSeries(
    tenantId: string,
    metric: string,
    dateRange: DateRange,
    granularity: 'hour' | 'day' | 'week' | 'month'
  ): Promise<TimeSeriesData>
  
  detectAnomalies(
    tenantId: string,
    metric: string,
    dateRange: DateRange
  ): Promise<AnomalyDetection>
  
  forecastTimeSeries(
    tenantId: string,
    metric: string,
    forecastPeriod: number
  ): Promise<TimeSeriesForecast>
}

export interface TimeSeriesData {
  metric: string
  granularity: string
  dateRange: DateRange
  data: Array<{
    timestamp: Date
    value: number
    metadata?: Record<string, any>
  }>
  statistics: {
    min: number
    max: number
    average: number
    median: number
    standardDeviation: number
  }
}

export interface AnomalyDetection {
  anomalies: Array<{
    timestamp: Date
    value: number
    expectedValue: number
    severity: 'low' | 'medium' | 'high'
    type: 'spike' | 'drop' | 'trend_change'
    description: string
    possibleCauses: string[]
  }>
  
  patterns: Array<{
    pattern: string
    confidence: number
    description: string
    impact: string
  }>
}

export interface TimeSeriesForecast {
  metric: string
  forecastPeriod: number
  predictions: Array<{
    timestamp: Date
    predictedValue: number
    confidenceInterval: {
      lower: number
      upper: number
    }
    confidence: number
  }>
  
  modelInfo: {
    algorithm: string
    accuracy: number
    seasonality: boolean
    trend: 'increasing' | 'decreasing' | 'stable'
  }
  
  assumptions: string[]
  limitations: string[]
}