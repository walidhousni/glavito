import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
  HttpException,
  HttpStatus
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { CurrentTenant } from '@glavito/shared-auth'
// eslint-disable-next-line @nx/enforce-module-boundaries
import { CurrentUser } from '@glavito/shared-auth'
import { Roles } from '../auth/decorators/roles.decorator'
import { AnalyticsService } from '@glavito/shared-analytics'
import { AnalyticsService as GatewayAnalyticsService } from './analytics.service'
import { AnalyticsReportingService } from './analytics-reporting.service'
import {
  GetRealTimeMetricsDto,
  GetKPIMetricsDto,
  GetDemandForecastDto,
  GetCapacityPredictionDto,
  GetChurnPredictionDto,
  CreateCustomReportDto,
  ExecuteCustomReportDto,
  CreateDashboardDto,
  UpdateDashboardDto
} from './dto/analytics.dto'

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name)

  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly reporting: AnalyticsReportingService,
    private readonly gatewayAnalytics: GatewayAnalyticsService,
  ) {}

  @Get('real-time-metrics')
  @Roles('admin', 'manager', 'agent')
  @ApiOperation({ summary: 'Get real-time analytics metrics' })
  @ApiResponse({ status: 200, description: 'Real-time metrics retrieved successfully' })
  async getRealTimeMetrics(
    @CurrentTenant() tenantId: string,
    @Query() query: GetRealTimeMetricsDto
  ) {
    try {
      this.logger.log(`Getting real-time metrics for tenant: ${tenantId}`)

      const metrics = await this.analyticsService.getRealTimeMetrics(tenantId, query.timeframe)

      // Flatten to UI-friendly shape while preserving raw structure
      const ui = {
        // Common top-level fields expected by the frontend dashboard
        activeTickets: metrics?.metrics?.openTickets ?? 0,
        activeAgents: metrics?.metrics?.activeAgents ?? 0,
        averageResponseTime: metrics?.metrics?.averageResponseTime ?? 0,
        customerSatisfactionScore: metrics?.metrics?.satisfactionScore ?? 0,
        // Optional fields used in charts – default to sane fallbacks
        queueLength: 0,
        channelDistribution: [],
        priorityDistribution: [],
        slaBreachRate: 0,
        // Keep original payload for future extensibility
        _raw: metrics,
      }

      return { success: true, data: ui }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.logger.error(`Failed to get real-time metrics: ${errorMessage}`)
      // Return a safe, zeroed payload to avoid breaking the UI
      const fallback = {
        activeTickets: 0,
        activeAgents: 0,
        averageResponseTime: 0,
        customerSatisfactionScore: 0,
        queueLength: 0,
        channelDistribution: [],
        priorityDistribution: [],
        slaBreachRate: 0,
        _raw: null,
      }
      return { success: false, data: fallback }
    }
  }

  @Get('kpi-metrics')
  @Roles('admin', 'manager', 'agent')
  @ApiOperation({ summary: 'Get KPI metrics' })
  @ApiResponse({ status: 200, description: 'KPI metrics retrieved successfully' })
  async getKPIMetrics(
    @CurrentTenant() tenantId: string,
    @Query() query: GetKPIMetricsDto
  ) {
    try {
      this.logger.log(`Getting KPI metrics for tenant: ${tenantId}`)
      
      const kpiIds = query.kpiIds ? query.kpiIds.split(',') : [
        'total_tickets',
        'resolution_rate',
        'customer_satisfaction',
        'first_response_time',
        'sla_compliance'
      ]

      const metrics = await this.analyticsService.getCustomKPIs(tenantId, kpiIds)
      return { success: true, data: metrics }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.logger.error(`Failed to get KPI metrics: ${errorMessage}`)
      // Return safe fallback instead of 500 to avoid breaking the UI
      return { success: false, data: [] }
    }
  }

  @Get('demand-forecast')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get demand forecast' })
  @ApiResponse({ status: 200, description: 'Demand forecast retrieved successfully' })
  async getDemandForecast(
    @CurrentTenant() tenantId: string,
    @Query() query: GetDemandForecastDto
  ) {
    try {
      this.logger.log(`Getting demand forecast for tenant: ${tenantId}`)
      
      const forecastDuration = query.duration || 30
      const forecast = await this.analyticsService.getDemandForecast(tenantId, forecastDuration)
      return { success: true, data: forecast }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.logger.error(`Failed to get demand forecast: ${errorMessage}`)
      // Return safe fallback to avoid breaking the UI
      const fallback = {
        forecastPeriod: query.duration || 30,
        predictions: [],
        seasonalPatterns: [],
        recommendations: []
      }
      return { success: false, data: fallback }
    }
  }

  @Get('capacity-prediction')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get capacity prediction' })
  @ApiResponse({ status: 200, description: 'Capacity prediction retrieved successfully' })
  async getCapacityPrediction(
    @CurrentTenant() tenantId: string,
    @Query() query: GetCapacityPredictionDto
  ) {
    try {
      this.logger.log(`Getting capacity prediction for tenant: ${tenantId}`)

      const timeframe = query.startDate && query.endDate ? 'custom' : 'month'
      const prediction = await this.analyticsService.getCapacityPlanning(tenantId, timeframe)

      // Map to UI-friendly shape expected by the frontend dashboard
      // currentCapacity (number), predictedDemand (number), utilizationRate (0-100)
      const demand = await this.analyticsService.getDemandForecast(tenantId, 30)
      const predictedDemand = Array.isArray(demand?.predictions) && demand.predictions.length
        ? demand.predictions.reduce((sum: number, p: { predictedTickets?: number }) => sum + (p.predictedTickets || 0), 0) / demand.predictions.length
        : 0

      const availableHours: number = prediction?.currentCapacity?.availableHours ?? 0
      const totalAgents = availableHours > 0 ? availableHours / 8 : 0
      const currentCapacityNumeric = totalAgents * 20
      const utilizationRatePct = currentCapacityNumeric > 0
        ? Math.min(100, Math.max(0, (predictedDemand / currentCapacityNumeric) * 100))
        : 0

      const ui = {
        currentCapacity: Math.round(currentCapacityNumeric),
        predictedDemand: Math.round(predictedDemand),
        utilizationRate: parseFloat(utilizationRatePct.toFixed(2)),
        // keep full payload
        _raw: prediction
      }

      return { success: true, data: ui }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.logger.error(`Failed to get capacity prediction: ${errorMessage}`)
      // Return safe fallback instead of 500 to avoid breaking the UI
      return { success: false, data: { currentCapacity: 0, predictedDemand: 0, utilizationRate: 0, _raw: null } }
    }
  }

  @Get('churn-prediction')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get churn prediction' })
  @ApiResponse({ status: 501, description: 'Churn prediction not implemented' })
  async getChurnPrediction(
    @CurrentTenant() tenantId: string,
    @Query() query: GetChurnPredictionDto
  ) {
    try {
      this.logger.log(`Getting churn prediction for tenant: ${tenantId}`)

      const predictions = await this.analyticsService.getChurnPrediction(tenantId, query.customerId)
      return { success: true, data: predictions }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.logger.error(`Failed to get churn prediction: ${errorMessage}`)
      // Return safe fallback instead of 500
      return { success: false, data: [] }
    }
  }

  @Get('customer-satisfaction')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get customer satisfaction metrics' })
  @ApiResponse({ status: 200, description: 'Customer satisfaction metrics retrieved successfully' })
  async getCustomerSatisfactionMetrics(
    @CurrentTenant() tenantId: string,
    @Query() query: GetRealTimeMetricsDto
  ) {
    try {
      this.logger.log(`Getting customer satisfaction metrics for tenant: ${tenantId}`)
      
      const dateRange = {
        startDate: new Date(query.startDate || Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(query.endDate || Date.now())
      }

      const metrics = await this.analyticsService.getCustomerSatisfactionMetrics(tenantId, dateRange)
      return { success: true, data: metrics }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.logger.error(`Failed to get customer satisfaction metrics: ${errorMessage}`)
      // Safe fallback
      return { success: false, data: { averageRating: 0, totalResponses: 0, distribution: [] } }
    }
  }

  @Get('agent-performance')
  @Roles('admin', 'manager', 'agent')
  @ApiOperation({ summary: 'Get agent performance metrics' })
  @ApiResponse({ status: 200, description: 'Agent performance metrics retrieved successfully' })
  async getAgentPerformance(
    @CurrentTenant() tenantId: string,
    @Query('agentId') agentId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: { id?: string; role?: string }
  ) {
    try {
      this.logger.log(`Getting agent performance metrics for tenant: ${tenantId}`)
      
      const dateRange = {
        startDate: new Date(startDate || Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(endDate || Date.now())
      }

      // If caller is an agent and no agentId specified, default to self
      const effectiveAgentId = (!agentId && user?.role === 'agent') ? (user.id || undefined) : agentId

      const performance = await this.analyticsService.getAgentPerformanceAnalytics(tenantId, effectiveAgentId, dateRange)
      return { success: true, data: performance }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.logger.error(`Failed to get agent performance metrics: ${errorMessage}`)
      // Safe fallback
      return { success: false, data: { agents: [], summary: { averageHandleTime: 0, ticketsResolved: 0, qualityScore: 0 } } }
    }
  }

  @Get('channel-analytics')
  @Roles('admin', 'manager', 'agent')
  @ApiOperation({ summary: 'Get channel analytics' })
  @ApiResponse({ status: 200, description: 'Channel analytics retrieved successfully' })
  async getChannelAnalytics(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('channelId') _channelId?: string
  ) {
    try {
      this.logger.log(`Getting channel analytics for tenant: ${tenantId}`)
      
      const dateRange = {
        startDate: new Date(startDate || Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(endDate || Date.now())
      }

      const analytics = await this.analyticsService.getChannelEffectiveness(tenantId, dateRange)
      return { success: true, data: analytics }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.logger.error(`Failed to get channel analytics: ${errorMessage}`)
      return { success: false, data: { channels: [], summary: { volume: 0, csat: 0 } } }
    }
  }

  @Get('revenue-attribution')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get revenue attribution analytics' })
  @ApiResponse({ status: 200, description: 'Revenue attribution analytics retrieved successfully' })
  async getRevenueAttribution(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      this.logger.log(`Getting revenue attribution analytics for tenant: ${tenantId}`)
      
      const dateRange = {
        startDate: new Date(startDate || Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(endDate || Date.now())
      }

      const attribution = await this.analyticsService.getRevenueAttribution(tenantId, dateRange)
      return { success: true, data: attribution }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.logger.error(`Failed to get revenue attribution analytics: ${errorMessage}`)
      return { success: false, data: { touchpoints: [], totalAttributedRevenue: 0 } }
    }
  }

  @Get('cost-analytics')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get cost analytics' })
  @ApiResponse({ status: 200, description: 'Cost analytics retrieved successfully' })
  async getCostAnalytics(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      this.logger.log(`Getting cost analytics for tenant: ${tenantId}`)
      
      const dateRange = {
        startDate: new Date(startDate || Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(endDate || Date.now())
      }

      const analytics = await this.analyticsService.getCostAnalysis(tenantId, dateRange)
      return { success: true, data: analytics }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.logger.error(`Failed to get cost analytics: ${errorMessage}`)
      return { success: false, data: { breakdown: [], totalCost: 0 } }
    }
  }

  @Get('roi-analytics')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get ROI analytics' })
  @ApiResponse({ status: 200, description: 'ROI analytics retrieved successfully' })
  async getROIAnalytics(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      this.logger.log(`Getting ROI analytics for tenant: ${tenantId}`)
      
      const dateRange = {
        startDate: new Date(startDate || Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(endDate || Date.now())
      }

      const analytics = await this.analyticsService.getBusinessImpactAnalytics(tenantId, dateRange)
      return { success: true, data: analytics }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.logger.error(`Failed to get ROI analytics: ${errorMessage}`)
      return { success: false, data: { roi: 0, revenue: 0, cost: 0 } }
    }
  }

  // ---------------------
  // Templates & Exports
  // ---------------------
  @Get('report-templates')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'List report templates' })
  async listTemplates(@CurrentTenant() tenantId: string) {
    const items = await this.reporting.listTemplates(tenantId)
    return { success: true, data: items }
  }

  @Post('report-templates')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create report template' })
  async createTemplate(
    @CurrentTenant() tenantId: string,
    @Body() body: { name: string; category?: string; definition: Record<string, unknown> }
  ) {
    const created = await this.reporting.createTemplate(tenantId, body)
    return { success: true, data: created }
  }

  @Post('exports')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Request analytics export' })
  async requestExport(
    @CurrentTenant() tenantId: string,
    @Body() body: { type: 'dashboard' | 'metric' | 'survey'; sourceId?: string; templateId?: string; format: 'pdf' | 'csv' | 'excel' | 'json'; parameters?: Record<string, unknown> }
  ) {
    const job = await this.reporting.requestExport(tenantId, body)
    return { success: true, data: job }
  }

  @Get('exports')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'List export jobs' })
  async listExports(@CurrentTenant() tenantId: string) {
    const jobs = await this.reporting.listExports(tenantId)
    return { success: true, data: jobs }
  }

  @Post('custom-reports')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create custom report' })
  @ApiResponse({ status: 201, description: 'Custom report created successfully' })
  async createCustomReport(
    @CurrentTenant() tenantId: string,
    @Body() createReportDto: CreateCustomReportDto
  ) {
    try {
      this.logger.log(`Creating custom report for tenant: ${tenantId}`)
      
      const reportDefinition = {
        name: createReportDto.name,
        description: createReportDto.description,
        category: createReportDto.category,
        dataSource: createReportDto.dataSource[0] || 'default',
        filters: createReportDto.filters,
        groupBy: createReportDto.dimensions?.map(d => d.field) || [],
        metrics: createReportDto.metrics?.map(m => m.name) || [],
        chartType: 'table' as const,
        visualization: {
          title: createReportDto.name,
          showLegend: true,
          showDataLabels: true
        },
        permissions: [{
          role: 'admin',
          actions: ['read', 'write', 'execute', 'schedule', 'share'] as ('read' | 'write' | 'execute' | 'schedule' | 'share')[]
        }],
        tags: [],
        createdBy: 'system'
      }

      const report = await this.analyticsService.createCustomReport(tenantId, reportDefinition)
      return { success: true, data: report }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.logger.error(`Failed to create custom report: ${errorMessage}`)
      throw new HttpException(
        'Failed to create custom report',
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  }

  @Get('custom-reports')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'List custom reports' })
  async listCustomReports(
    @CurrentTenant() tenantId: string
  ) {
    const items = await this.analyticsService.getCustomReports(tenantId as any)
    return { success: true, data: items }
  }

  @Post('custom-reports/:reportId/execute')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Execute custom report' })
  @ApiResponse({ status: 200, description: 'Custom report executed successfully' })
  async executeCustomReport(
    @CurrentTenant() tenantId: string,
    @Param('reportId') reportId: string,
    @Body() executeDto: ExecuteCustomReportDto
  ) {
    try {
      this.logger.log(`Executing custom report ${reportId} for tenant: ${tenantId}`)
      
      const result = await this.analyticsService.executeReport(tenantId, reportId, executeDto.parameters || {})
      return { success: true, data: result }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.logger.error(`Failed to execute custom report: ${errorMessage}`)
      throw new HttpException(
        'Failed to execute custom report',
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  }

  // Note: Dashboard functionality is not implemented in the service
  @Post('dashboards')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create dashboard' })
  async createDashboard(
    @CurrentTenant() tenantId: string,
    @Body() createDashboardDto: CreateDashboardDto
  ) {
    const created = await this.gatewayAnalytics.createDashboard(tenantId as any, 'system', {
      name: createDashboardDto.name,
      description: createDashboardDto.description,
      layout: (createDashboardDto.layout as any),
      widgets: (createDashboardDto.widgets as any),
      filters: (createDashboardDto.filters as any),
      isDefault: false,
      isPublic: createDashboardDto.isPublic,
      createdBy: 'system',
    } as any)
    return { success: true, data: created }
  }

  @Get('dashboards')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get all dashboards' })
  async getDashboards(@CurrentTenant() tenantId: string) {
    const items = await this.gatewayAnalytics.getDashboards(tenantId as any)
    return { success: true, data: items }
  }

  @Get('dashboards/:dashboardId')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get dashboard by ID' })
  async getDashboard(
    @CurrentTenant() tenantId: string,
    @Param('dashboardId') dashboardId: string
  ) {
    const d = await this.gatewayAnalytics.getDashboard(tenantId as any, dashboardId)
    return { success: true, data: d }
  }

  @Put('dashboards/:dashboardId')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Update dashboard' })
  async updateDashboard(
    @CurrentTenant() tenantId: string,
    @Param('dashboardId') dashboardId: string,
    @Body() updateDashboardDto: UpdateDashboardDto
  ) {
    const d = await this.gatewayAnalytics.updateDashboard(tenantId as any, dashboardId, updateDashboardDto as any)
    return { success: true, data: d }
  }

  // ---------------------
  // Schedules & Summary
  // ---------------------
  @Post('schedules')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create analytics report schedule' })
  async createSchedule(
    @CurrentTenant() tenantId: string,
    @Body() body: { name?: string; description?: string; type: 'dashboard' | 'metric' | 'survey' | 'custom'; source: string; schedule?: { frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly'; time: string; timezone: string; dayOfWeek?: number; dayOfMonth?: number }; recipients?: { type: 'email' | 'webhook' | 'slack' | 'teams'; address: string; name?: string }[]; format?: 'pdf' | 'excel' | 'csv' | 'json'; filters?: Record<string, unknown> }
  ) {
    const schedule = await this.gatewayAnalytics.createReportSchedule(tenantId as any, {
      name: body.name || 'Scheduled Report',
      description: body.description,
      type: body.type,
      source: body.source,
      schedule: body.schedule || { frequency: 'weekly', time: '09:00', timezone: 'UTC', dayOfWeek: 1 },
      recipients: (body.recipients || []) as any,
      format: body.format || 'pdf',
      filters: body.filters || {},
      isActive: true,
    } as any)
    return { success: true, data: schedule }
  }

  @Get('schedules')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'List scheduled analytics reports' })
  async listSchedules(@CurrentTenant() tenantId: string) {
    const items = await (this.analyticsService as any).getScheduledReports(tenantId as any)
    return { success: true, data: items }
  }

  @Get('executive-summary')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get executive summary text' })
  async getExecutiveSummary(@CurrentTenant() tenantId: string) {
    const bi = await this.analyticsService.getBusinessImpactAnalytics(tenantId as any, { startDate: new Date(Date.now() - 30*24*60*60*1000), endDate: new Date() })
    const revenue = bi?.revenue?.total ?? 0
    const roi = bi?.roi?.overall ?? 0
    const topChannel = (bi?.revenue?.attribution?.byChannel || bi?.revenue?.attribution?.byChannel || []).sort((a: any,b: any)=> (b.revenue||0)-(a.revenue||0))[0]
    const summary = `In the last 30 days, revenue was $${Number(revenue).toFixed(2)} with an overall ROI of ${(roi*100).toFixed(1)}%. Top channel: ${topChannel?.channel || 'n/a'} (${topChannel?.percentage ? (topChannel.percentage*100).toFixed(1)+'%' : '0%'} of revenue).`
    return { success: true, data: { summary } }
  }
}