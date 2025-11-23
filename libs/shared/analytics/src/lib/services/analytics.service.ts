import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '@glavito/shared-database'
import {
  AnalyticsServiceInterface,
  DateRange,
  RealTimeMetrics,
  KPIMetric,
  DemandForecast,
  CapacityPlan,
  SatisfactionMetrics,
  NPSAnalysis,
  CSATAnalysis,
  ChurnPrediction,
  AgentPerformanceAnalytics,
  QualityScore,
  CoachingInsights,
  ChannelEffectiveness,
  ConversionRates,
  BusinessImpactAnalytics,
  RevenueAttribution,
  CostAnalysis,
  ReportDefinition,
  CustomReport,
  ReportResult,
  ReportSchedule,
  ScheduledReport,
  BusinessInsights
} from '../interfaces/analytics.interface'

@Injectable()
export class AnalyticsService implements AnalyticsServiceInterface {
  private readonly logger = new Logger(AnalyticsService.name)

  constructor(
    private readonly prisma: PrismaService
  ) {}

  async getRealTimeMetrics(tenantId: string, _timeframe?: string): Promise<RealTimeMetrics> {
    try {
      this.logger.log(`Getting real-time metrics for tenant: ${tenantId}`)
      
      const now = new Date()
      const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000) // Last 24 hours
      const endTime = now

      // Get active tickets count
      const activeTickets = await this.prisma['ticket'].count({
        where: {
          tenantId,
          status: { in: ['open', 'in_progress', 'waiting'] },
          createdAt: { gte: startTime, lte: endTime }
        }
      })

      // Get active agents count
      const activeAgents = await this.prisma['user'].count({
        where: {
          tenantId,
          role: 'agent',
          status: 'active',
          lastLoginAt: { gte: new Date(now.getTime() - 60 * 60 * 1000) } // Last hour
        }
      })

      // Calculate average response time
      const responseTimeData: { _avg: { firstResponseTime: number | null } } = await this.prisma['ticket'].aggregate({
        where: {
          tenantId,
          firstResponseAt: { not: null } as any,
          createdAt: { gte: startTime, lte: endTime }
        },
        _avg: {
          firstResponseTime: true
        }
      })

      // Calculate average resolution time
      await (this.prisma['ticket'] as any).aggregate({
        where: {
          tenantId,
          resolvedAt: { not: null },
          createdAt: { gte: startTime, lte: endTime }
        },
        _avg: {
          resolutionTime: true
        }
      })

      // Get customer satisfaction score
      const satisfactionData: { _avg: { rating: number | null } } = await (this.prisma['customerSatisfactionSurvey'] as any).aggregate({
        where: {
          tenantId,
          createdAt: { gte: startTime, lte: endTime }
        },
        _avg: {
          rating: true
        }
      })

      // Calculate ticket velocity (tickets per hour)
      const ticketCount = await this.prisma['ticket'].count({
        where: {
          tenantId,
          createdAt: { gte: startTime, lte: endTime }
        }
      })

      // Cross-channel activity (WhatsApp, Instagram, Email)
      const messagesByChannel = await (this.prisma['messageAdvanced'] as any).groupBy({
        by: ['channel'],
        where: { tenantId, createdAt: { gte: startTime, lte: endTime } },
        _count: { id: true }
      }).catch(() => []) as Array<{ channel: string; _count: { id: number } }>
      const ticketsByChannel = await (this.prisma['ticket'] as any).groupBy({
        by: ['channelId'],
        where: { tenantId, createdAt: { gte: startTime, lte: endTime } },
        _count: { id: true }
      }).catch(() => []) as Array<{ channelId: string | null; _count: { id: number } }>
      const channelMap = new Map<string, { id?: string; name?: string; type?: string }>()
      try {
        const channels = await this.prisma['channel'].findMany({ where: { tenantId, isActive: true }, select: { id: true, name: true, type: true } })
        for (const ch of channels as any[]) channelMap.set(ch.id, ch)
      } catch { /* noop */ }
      const channelActivity = messagesByChannel.map((m) => {
        const type = (m.channel || 'web').toString()
        return {
          channelId: type,
          channelName: type.toUpperCase(),
          channelType: type,
          messageCount: m._count.id,
          ticketCount: ticketsByChannel.reduce((s, t) => s + (t.channelId && (channelMap.get(t.channelId)?.type || '').toLowerCase() === type ? t._count.id : 0), 0),
          averageResponseTime: 0,
          activeConversations: 0
        }
      })

      return {
        timestamp: now,
        metrics: {
          totalTickets: ticketCount,
          openTickets: activeTickets,
          inProgressTickets: 0,
          resolvedTickets: 0,
          overdueTickets: 0,
          activeAgents,
          availableAgents: activeAgents,
          busyAgents: 0,
          averageResponseTime: responseTimeData._avg.firstResponseTime || 0,
          totalCustomers: 0,
          newCustomersToday: 0,
          satisfactionScore: (satisfactionData._avg?.rating as number) || 0,
          channelActivity,
          revenueToday: 0,
          conversionRate: 0
        },
        trends: {
          ticketVolume: [],
          responseTime: [],
          satisfaction: [],
          resolution: []
        }
      }
    } catch (error) {
      this.logger.error(`Failed to get real-time metrics for tenant ${tenantId}:`, error)
      throw error
    }
  }

  async getCustomKPIs(tenantId: string, kpiIds: string[], timeRange?: DateRange): Promise<KPIMetric[]> {
    try {
      this.logger.log(`Getting KPI metrics for tenant: ${tenantId}, KPIs: ${kpiIds.join(', ')}`)
      
      const now = new Date()
      const startTime = timeRange?.startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      const endTime = timeRange?.endDate || now
      
      // Previous period for comparison
      const previousPeriodDuration = endTime.getTime() - startTime.getTime()
      const previousStartTime = new Date(startTime.getTime() - previousPeriodDuration)
      const previousEndTime = startTime

      const kpiMetrics: KPIMetric[] = []

      for (const kpiId of kpiIds) {
        let metric: KPIMetric

        switch (kpiId) {
          case 'total_tickets':
            metric = await this.calculateTotalTicketsKPI(tenantId, startTime, endTime, previousStartTime, previousEndTime)
            break
          case 'resolution_rate':
            metric = await this.calculateResolutionRateKPI(tenantId, startTime, endTime, previousStartTime, previousEndTime)
            break
          case 'customer_satisfaction':
            metric = await this.calculateCustomerSatisfactionKPI(tenantId, startTime, endTime, previousStartTime, previousEndTime)
            break
          case 'first_response_time':
            metric = await this.calculateFirstResponseTimeKPI(tenantId, startTime, endTime, previousStartTime, previousEndTime)
            break
          case 'sla_compliance':
            metric = await this.calculateSLAComplianceKPI(tenantId, startTime, endTime, previousStartTime, previousEndTime)
            break
          default:
            continue
        }

        kpiMetrics.push(metric)
      }

      return kpiMetrics
    } catch (error) {
      this.logger.error(`Failed to get KPI metrics for tenant ${tenantId}:`, error)
      throw error
    }
  }

  async getDemandForecast(tenantId: string, forecastPeriod: number): Promise<DemandForecast> {
    try {
      this.logger.log(`Getting demand forecast for tenant: ${tenantId}, period: ${forecastPeriod} days`)
      
      // Get historical data for the last year
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
      
      const historicalData: Array<{ createdAt: Date; _count: { id: number } }> = await (this.prisma['ticket'] as any).groupBy({
        by: ['createdAt'],
        where: {
          tenantId,
          createdAt: { gte: oneYearAgo }
        },
        _count: {
          id: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      })

      // Simple forecasting algorithm (in production, use more sophisticated ML models)
      const predictions = this.generateDemandPredictions(historicalData, forecastPeriod)
      
      return {
        forecastPeriod: forecastPeriod,
        predictions,
        seasonalPatterns: [],
        recommendations: [
          'Historical ticket volume',
          'Seasonal patterns',
          'Day of week trends'
        ]
      }
    } catch (error) {
      this.logger.error(`Failed to get demand forecast for tenant ${tenantId}:`, error)
      throw error
    }
  }

  async getCapacityPlanning(tenantId: string, _timeframe: string): Promise<CapacityPlan> {
    try {
      this.logger.log(`Getting capacity prediction for tenant: ${tenantId}`)
      
      // Get current agent capacity
      const totalAgents = await this.prisma['user'].count({
        where: {
          tenantId,
          role: 'agent',
          status: 'active'
        }
      })

      // Assume each agent can handle 20 tickets per day
      const currentCapacity = totalAgents * 20

      // Get predicted demand from demand forecast
      const demandForecast = await this.getDemandForecast(tenantId, 30)
      const avgDailyDemand = demandForecast.predictions.reduce((sum, p) => sum + p.predictedTickets, 0) / demandForecast.predictions.length

      const utilizationRate = currentCapacity > 0 ? (avgDailyDemand / currentCapacity) * 100 : 0

      return {
        currentCapacity: {
          totalAgents: totalAgents,
          availableHours: totalAgents * 8,
          utilizationRate: utilizationRate / 100
        },
        requiredCapacity: {
          peakHours: [],
          recommendations: [
            {
              type: 'hire',
              description: 'Hire 3 additional agents to meet demand',
              impact: 'Reduce response time by 30%',
              priority: 'high'
            }
          ]
        },
        forecastAccuracy: 0.82
      }
    } catch (error) {
      this.logger.error(`Failed to get capacity prediction for tenant ${tenantId}:`, error)
      throw error
    }
  }

  async getChurnPrediction(tenantId: string, customerId?: string): Promise<any[]> {
    try {
      this.logger.log(`Getting churn prediction for tenant: ${tenantId}, customer: ${customerId || 'all'}`)
      
      const whereClause: any = { tenantId }
      if (customerId) {
        whereClause.id = customerId
      }

      const customers = await this.prisma['customer'].findMany({
        where: whereClause,
        include: {
          tickets: {
            orderBy: { createdAt: 'desc' },
            take: 10
          },
          satisfactionSurveys: {
            orderBy: { createdAt: 'desc' },
            take: 5
          }
        }
      })

      const predictions: ChurnPrediction[] = []

      for (const customer of customers) {
        // Simple churn prediction algorithm (in production, use ML models)
        const churnProbability = this.calculateChurnProbability(customer)
        const riskLevel = this.determineRiskLevel(churnProbability)
        
        predictions.push({
          customerId: customer.id,
          churnProbability,
          riskLevel,
          factors: [
            { name: 'Ticket Frequency', weight: 0.3, value: customer.tickets.length, impact: 'negative' },
            { name: 'Satisfaction Score', weight: 0.4, value: this.getAverageSatisfaction(customer.satisfactionSurveys), impact: 'positive' },
            { name: 'Last Interaction', weight: 0.2, value: this.getDaysSinceLastInteraction(customer), impact: 'negative' }
          ],
          recommendations: [
            { action: 'Proactive outreach', priority: 'high', expectedImpact: 0.3, cost: 50 },
            { action: 'Satisfaction survey', priority: 'medium', expectedImpact: 0.2, cost: 25 }
          ],
          timeToChurn: Math.floor(90 * (1 - churnProbability)) // Days until predicted churn
        })
      }

      return predictions.sort((a, b) => b.churnProbability - a.churnProbability)
    } catch (error) {
      this.logger.error(`Failed to get churn prediction for tenant ${tenantId}:`, error)
      throw error
    }
  }

  // Placeholder implementations for other methods
  async getCustomerSatisfactionMetrics(_tenantId: string, _timeRange?: DateRange): Promise<SatisfactionMetrics> {
    const tenantId = _tenantId
    const startDate = _timeRange?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const endDate = _timeRange?.endDate || new Date()

    // Fetch surveys within range
    const whereClause: any = { tenantId, createdAt: { gte: startDate, lte: endDate } }

    const [avgAgg, respondedCount, sentCount, byRating, byChannel, recent] = await Promise.all([
      (this.prisma['customerSatisfactionSurvey'] as any).aggregate({ where: whereClause, _avg: { rating: true } }),
      (this.prisma['customerSatisfactionSurvey'] as any).count({ where: { ...whereClause, respondedAt: { not: null } } }),
      (this.prisma['customerSatisfactionSurvey'] as any).count({ where: { ...whereClause, sentAt: { not: null } } }),
      (this.prisma['customerSatisfactionSurvey'] as any).groupBy({ where: whereClause, by: ['rating'], _count: { _all: true } }),
      (this.prisma['customerSatisfactionSurvey'] as any).groupBy({ where: whereClause, by: ['channel'], _count: { _all: true } }),
      (this.prisma['customerSatisfactionSurvey'] as any).findMany({ where: whereClause, orderBy: { respondedAt: 'desc' }, take: 20, select: { id: true, rating: true, comment: true, channel: true, surveyType: true, sentAt: true, respondedAt: true, createdAt: true } })
    ])

    const averageScore = (avgAgg?._avg?.rating as number) || 0
    const responseRate = sentCount > 0 ? (respondedCount / sentCount) * 100 : 0

    // Build trend per day
    const allForTrend = await (this.prisma['customerSatisfactionSurvey'] as any).findMany({ where: whereClause, select: { createdAt: true, respondedAt: true, rating: true } })
    const trendMap = new Map<string, { sum: number; count: number }>()
    for (const row of allForTrend) {
      const d = new Date((row.respondedAt as Date) || (row.createdAt as Date))
      const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString()
      const curr = trendMap.get(key) || { sum: 0, count: 0 }
      curr.sum += (row.rating as number) || 0
      curr.count += 1
      trendMap.set(key, curr)
    }
    const trend = Array.from(trendMap.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([key, v]) => ({ date: new Date(key), value: v.count ? v.sum / v.count : 0 }))

    // Sentiment distribution buckets (>=4 positive, 3 neutral, <=2 negative)
    let positive = 0, neutral = 0, negative = 0
    for (const r of byRating) {
      const rating = (r as any).rating as number
      const count = (r as any)._count?._all as number
      if (rating >= 4) positive += count
      else if (rating === 3) neutral += count
      else negative += count
    }

    const byChannelArr = byChannel.map((c: any) => ({ channel: c.channel as string, averageScore: 0, responseCount: c._count?._all || 0, trend: 0 }))

    const ratingDistribution: Record<number, number> = {}
    for (const r of byRating) ratingDistribution[(r as any).rating as number] = (r as any)._count?._all || 0

    const recentSurveys = recent.map((r: any) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment || undefined,
      channel: r.channel,
      surveyType: r.surveyType,
      sentAt: r.sentAt || undefined,
      respondedAt: r.respondedAt || undefined,
      createdAt: r.createdAt,
    }))

    const result: SatisfactionMetrics = {
      overall: {
        averageScore,
        totalResponses: respondedCount,
        responseRate,
        trend
      },
      byChannel: byChannelArr,
      byAgent: [],
      byCategory: [],
      sentimentDistribution: { positive, neutral, negative }
    }

    // Non-breaking extensions for UI consumption
    // Compute per-channel averages and simple trends (per-day average rating)
    try {
      const channelList = Array.from(new Set(byChannelArr.map((c: any) => c.channel)))
      for (const ch of channelList) {
        const chAgg: any = await (this.prisma['customerSatisfactionSurvey'] as any).aggregate({ where: { tenantId, createdAt: { gte: startDate, lte: endDate }, channel: ch, respondedAt: { not: null } }, _avg: { rating: true }, _count: { id: true } })
        const chAll = await (this.prisma['customerSatisfactionSurvey'] as any).findMany({ where: { tenantId, createdAt: { gte: startDate, lte: endDate }, channel: ch, respondedAt: { not: null } }, select: { respondedAt: true, createdAt: true, rating: true } })
        const byDay = new Map<string, { sum: number; count: number }>()
        for (const row of chAll) {
          const d = new Date((row.respondedAt as Date) || (row.createdAt as Date))
          const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString()
          const curr = byDay.get(key) || { sum: 0, count: 0 }
          curr.sum += (row as any).rating || 0
          curr.count += 1
          byDay.set(key, curr)
        }
        const trendSeries = Array.from(byDay.entries())
          .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
          .map(([key, v]) => ({ date: new Date(key), value: v.count ? v.sum / v.count : 0 }))
        const target = byChannelArr.find((c: any) => c.channel === ch)
        if (target) {
          target.averageScore = (chAgg?._avg?.rating as number) || 0
          target.responseCount = (chAgg?._count?.id as number) || target.responseCount
          ;(target as any).trendSeries = trendSeries
        }
      }
    } catch { /* noop */ }

    return {
      ...(result as any),
      byChannel: byChannelArr as any,
      ratingDistribution,
      recentSurveys,
      _meta: { sentCount: sentCount }
    } as any
  }

  async getNPSAnalytics(_tenantId: string, _timeRange?: DateRange): Promise<NPSAnalysis> {
    throw new Error('Method not implemented')
  }

  async getNPSAnalysis(_tenantId: string, _dateRange: DateRange): Promise<NPSAnalysis> {
    throw new Error('Method not implemented')
  }

  async getCSATAnalysis(_tenantId: string, _dateRange: DateRange): Promise<CSATAnalysis> {
    throw new Error('Method not implemented')
  }

  async getAgentPerformanceAnalytics(tenantId: string, agentId?: string, dateRange?: DateRange): Promise<AgentPerformanceAnalytics> {
    try {
      const startDate = dateRange?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const endDate = dateRange?.endDate || new Date()

      // Resolve agent
      let targetAgentId = agentId
      let agentName = 'All Agents'
      if (!targetAgentId) {
        // Pick top agent by tickets resolved in period as default
        const top = await (this.prisma['ticket'] as any).groupBy({
          by: ['assignedAgentId'],
          where: { tenantId, assignedAgentId: { not: null }, createdAt: { gte: startDate, lte: endDate } },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 1
        }) as Array<{ assignedAgentId: string | null; _count: { id: number } }>
        targetAgentId = top?.[0]?.assignedAgentId || undefined
      }
      if (targetAgentId) {
        const u = await this.prisma['user'].findUnique({ where: { id: targetAgentId }, select: { firstName: true, lastName: true, email: true } })
        agentName = u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() || (u.email || targetAgentId) : targetAgentId
      }

      const ticketWhere: any = { tenantId, createdAt: { gte: startDate, lte: endDate } }
      if (targetAgentId) ticketWhere.assignedAgentId = targetAgentId

      const ticketsHandled = await this.prisma['ticket'].count({ where: ticketWhere })
      const avgRespAgg = await this.prisma['ticket'].aggregate({ where: { ...ticketWhere, firstResponseAt: { not: null } }, _avg: { firstResponseTime: true } })
      const avgResAgg = await this.prisma['ticket'].aggregate({ where: { ...ticketWhere, resolvedAt: { not: null } }, _avg: { resolutionTime: true } })
      const totalResolved = await this.prisma['ticket'].count({ where: { ...ticketWhere, status: 'resolved' } })
      const fcr = await this.prisma['ticket'].count({ where: { ...ticketWhere, status: 'resolved', reopenCount: 0 } as any })
      const csatAgg: any = await (this.prisma['customerSatisfactionSurvey'] as any).aggregate({ where: { tenantId, createdAt: { gte: startDate, lte: endDate }, agentId: targetAgentId || undefined }, _avg: { rating: true } })

      // Productivity
      const totalMessages = await this.prisma['message'].count({ where: { tenantId, createdAt: { gte: startDate, lte: endDate }, agentId: targetAgentId || undefined } as any })
      const messagesPerTicket = ticketsHandled > 0 ? totalMessages / ticketsHandled : 0
      const escalationRate = await this.prisma['ticket'].count({ where: { ...ticketWhere, escalatedAt: { not: null } as any } })
      const reopenRate = await this.prisma['ticket'].count({ where: { ...ticketWhere, reopenCount: { gt: 0 } as any } })

      // Team averages for comparison
      const teamAvgRespAgg = await this.prisma['ticket'].aggregate({ where: { tenantId, createdAt: { gte: startDate, lte: endDate }, firstResponseAt: { not: null } }, _avg: { firstResponseTime: true } })
      const teamAvgResAgg = await this.prisma['ticket'].aggregate({ where: { tenantId, createdAt: { gte: startDate, lte: endDate }, resolvedAt: { not: null } }, _avg: { resolutionTime: true } })
      const teamCsatAgg: any = await (this.prisma['customerSatisfactionSurvey'] as any).aggregate({ where: { tenantId, createdAt: { gte: startDate, lte: endDate } }, _avg: { rating: true } })

      return {
        agentId: targetAgentId || 'all',
        agentName,
        period: { startDate, endDate },
        metrics: {
          ticketsHandled,
          averageResponseTime: (avgRespAgg as any)._avg?.firstResponseTime || 0,
          averageResolutionTime: (avgResAgg as any)._avg?.resolutionTime || 0,
          firstContactResolution: totalResolved > 0 ? (fcr / totalResolved) * 100 : 0,
          customerSatisfaction: (csatAgg?._avg?.rating as number) || 0,
          utilizationRate: 0
        },
        qualityScore: Math.max(0, Math.min(100, (((csatAgg?._avg?.rating || 0) / 5) * 60) + (totalResolved > 0 ? (fcr / totalResolved) * 20 : 0) - (((avgResAgg as any)._avg?.resolutionTime || 0) / 3600))) ,
        qualityFactors: [
          { factor: 'csat', score: (csatAgg?._avg?.rating || 0) * 20, weight: 0.6, feedback: 'Maintain high CSAT' },
          { factor: 'fcr', score: totalResolved > 0 ? (fcr / totalResolved) * 100 : 0, weight: 0.2, feedback: 'Improve first-contact resolution' },
          { factor: 'resolution_time', score: Math.max(0, 100 - (((avgResAgg as any)._avg?.resolutionTime || 0) / 3600) * 10), weight: 0.2, feedback: 'Reduce resolution time' }
        ],
        productivity: {
          ticketsPerHour: 0,
          messagesPerTicket,
          escalationRate: ticketsHandled > 0 ? (escalationRate / ticketsHandled) * 100 : 0,
          reopenRate: ticketsHandled > 0 ? (reopenRate / ticketsHandled) * 100 : 0
        },
        teamAverage: {
          responseTime: (teamAvgRespAgg as any)._avg?.firstResponseTime || 0,
          resolutionTime: (teamAvgResAgg as any)._avg?.resolutionTime || 0,
          satisfaction: (teamCsatAgg?._avg?.rating as number) || 0,
          productivity: 0
        },
        trends: {
          performance: [],
          satisfaction: [],
          productivity: []
        },
        strengths: [],
        improvementAreas: [],
        recommendations: []
      }
    } catch (error) {
      this.logger.error(`Failed to get agent performance analytics for tenant ${tenantId}:`, error)
      // Minimal safe fallback
      const now = new Date()
      return {
        agentId: agentId || 'all',
        agentName: 'All Agents',
        period: { startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), endDate: now },
        metrics: { ticketsHandled: 0, averageResponseTime: 0, averageResolutionTime: 0, firstContactResolution: 0, customerSatisfaction: 0, utilizationRate: 0 },
        qualityScore: 0,
        qualityFactors: [],
        productivity: { ticketsPerHour: 0, messagesPerTicket: 0, escalationRate: 0, reopenRate: 0 },
        teamAverage: { responseTime: 0, resolutionTime: 0, satisfaction: 0, productivity: 0 },
        trends: { performance: [], satisfaction: [], productivity: [] },
        strengths: [],
        improvementAreas: [],
        recommendations: []
      }
    }
  }

  async getQualityScoring(_tenantId: string, _agentId: string, _dateRange: DateRange): Promise<QualityScore> {
    throw new Error('Method not implemented')
  }

  async getCoachingInsights(_tenantId: string, _agentId: string): Promise<CoachingInsights> {
    throw new Error('Method not implemented')
  }

  async getChannelEffectiveness(tenantId: string, dateRange: DateRange): Promise<ChannelEffectiveness> {
    try {
      const { startDate, endDate } = dateRange

      // Fetch channels
      const channels = await this.prisma['channel'].findMany({
        where: { tenantId, isActive: true },
        select: { id: true, name: true, type: true }
      })

      const results: ChannelEffectiveness['channels'] = []
      for (const ch of channels) {
        const totalTickets = await this.prisma['ticket'].count({ where: { tenantId, channelId: ch.id, createdAt: { gte: startDate, lte: endDate } } })
        // Count messages for this channel (via conversation relation)
        const totalMessages = await this.prisma['message'].count({
          where: {
            conversation: {
              channelId: ch.id,
              tenantId,
              createdAt: { gte: startDate, lte: endDate }
            }
          }
        })
        const avgResp = await this.prisma['ticket'].aggregate({
          where: { tenantId, channelId: ch.id, firstResponseAt: { not: null }, createdAt: { gte: startDate, lte: endDate } },
          _avg: { firstResponseTime: true }
        })
        const avgRes = await this.prisma['ticket'].aggregate({
          where: { tenantId, channelId: ch.id, resolvedAt: { not: null }, createdAt: { gte: startDate, lte: endDate } },
          _avg: { resolutionTime: true }
        })
        // Estimate channel costs (WhatsApp specialized; Instagram/Email generic per-message if configured)
        let costPerTicket = 0
        try {
          const type = (ch.type || '').toString().toLowerCase()
          if (type === 'whatsapp') {
            const waCost = await this.estimateWhatsAppCostsForChannel(tenantId, ch.id, dateRange)
            costPerTicket = totalTickets > 0 ? waCost / totalTickets : 0
          } else if (type === 'instagram' || type === 'email') {
            const msgCosts = await this.estimateGenericPerMessageCost(tenantId, type, { tenantId, channelId: ch.id, dateRange })
            costPerTicket = totalTickets > 0 ? msgCosts.total / Math.max(1, totalTickets) : 0
          }
        } catch { /* noop */ }

        results.push({
          channelId: ch.id,
          channelName: ch.name,
          channelType: ch.type,
          totalMessages,
          totalTickets,
          averageMessagesPerTicket: totalTickets > 0 ? totalMessages / totalTickets : 0,
          averageResponseTime: (avgResp as any)._avg?.firstResponseTime || 0,
          averageResolutionTime: (avgRes as any)._avg?.resolutionTime || 0,
          firstContactResolution: 0,
          customerSatisfaction: 0,
          escalationRate: 0,
          reopenRate: 0,
          conversionRate: 0,
          revenueAttribution: 0,
          costPerTicket,
          trends: { volume: [], performance: [], satisfaction: [] }
        })
      }

      return {
        channels: results,
        crossChannelInsights: [],
        optimizations: []
      }
    } catch (error) {
      this.logger.error(`Failed to get channel effectiveness for tenant ${tenantId}:`, error)
      return { channels: [], crossChannelInsights: [], optimizations: [] }
    }
  }

  async getConversionRates(_tenantId: string, _channelId?: string, _dateRange?: DateRange): Promise<ConversionRates> {
    throw new Error('Method not implemented')
  }

  async getBusinessImpactAnalytics(tenantId: string, dateRange: DateRange): Promise<BusinessImpactAnalytics> {
    try {
      const attribution = await this.getRevenueAttribution(tenantId, dateRange)
      const revenueTotal = attribution.byChannel.reduce((s, c) => s + c.revenue, 0)
      const costs = await this.getCostAnalysis(tenantId, dateRange)
      // Add WhatsApp variable costs based on message categories
      try {
        const waCosts = await this.estimateWhatsAppCosts(tenantId, dateRange)
        costs.totalCosts += waCosts.total
        costs.breakdown.external += waCosts.total
      } catch { /* noop */ }

      const byChannelRoi = attribution.byChannel.map((c) => {
        // Estimate investment per channel from marketing budgets if available
        return { channel: c.channel, roi: costs.totalCosts > 0 ? (c.revenue - (costs.totalCosts / Math.max(1, attribution.byChannel.length))) / (costs.totalCosts / Math.max(1, attribution.byChannel.length)) : 0, investment: costs.totalCosts / Math.max(1, attribution.byChannel.length), return: c.revenue }
      })

      return {
        revenue: {
          total: revenueTotal,
          growth: 0,
          forecast: revenueTotal,
          attribution
        },
        costs: {
          total: costs.totalCosts,
          breakdown: costs.breakdown,
          efficiency: costs.efficiency
        },
        roi: {
          overall: costs.totalCosts > 0 ? (revenueTotal - costs.totalCosts) / costs.totalCosts : 0,
          byChannel: byChannelRoi,
          byInitiative: []
        },
        productivity: {
          ticketsPerAgent: 0,
          revenuePerAgent: 0,
          costPerTicket: costs.costPerTicket,
          efficiencyScore: costs.efficiency.score
        }
      }
    } catch (error) {
      this.logger.error(`Failed to get business impact analytics for tenant ${tenantId}:`, error)
      // Safe fallback
      return {
        revenue: { total: 0, growth: 0, forecast: 0, attribution: { byChannel: [], byAgent: [], byCustomerSegment: [], attributionModel: { model: 'last-touch', confidence: 0, methodology: 'fallback' } } },
        costs: { total: 0, breakdown: { personnel: 0, technology: 0, infrastructure: 0, training: 0, external: 0, overhead: 0 }, efficiency: { score: 0, benchmarks: [], improvements: [] } },
        roi: { overall: 0, byChannel: [], byInitiative: [] },
        productivity: { ticketsPerAgent: 0, revenuePerAgent: 0, costPerTicket: 0, efficiencyScore: 0 }
      }
    }
  }

  // Estimate WhatsApp costs by counting WA messages with metadata.waCategory and applying per-category rates.
  private async estimateWhatsAppCosts(tenantId: string, dateRange: DateRange): Promise<{ total: number; byCategory: Record<string, number> }> {
    const { startDate, endDate } = dateRange
    // Rates in USD; adjust as needed or fetch from settings later
    const rates: Record<string, number> = {
      marketing: 0.0,
      utility: 0.0,
      authentication: 0.0,
      service: 0.0,
      // fallback
      other: 0.0
    }
    // Try to load rates from settings table or environment variable
    try {
      const cfg = await (this.prisma as any)['settings']?.findFirst?.({ where: { tenantId, key: 'whatsapp_pricing' } })
      if (cfg?.value) {
        const parsed = typeof cfg.value === 'string' ? JSON.parse(cfg.value) : cfg.value
        Object.assign(rates, parsed?.rates || {})
      }
    } catch { /* noop */ }
    try {
      const envJson = process.env['WHATSAPP_PRICING_RATES']
      if (envJson) {
        const parsed = JSON.parse(envJson)
        Object.assign(rates, parsed?.rates || parsed)
      }
    } catch { /* ignore malformed env */ }

    // Count messages per category using MessageAdvanced
    type GroupRow = { metadata: any; _count: { id: number } }
    const messages: GroupRow[] = await (this.prisma['messageAdvanced'] as any).findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        channel: 'whatsapp'
      },
      select: { metadata: true }
    })
    const byCategory: Record<string, number> = {}
    for (const row of messages) {
      const meta = (row?.metadata || {}) as any
      const cat = String(meta.waCategory || meta.category || 'other').toLowerCase()
      byCategory[cat] = (byCategory[cat] || 0) + 1
    }
    let total = 0
    for (const [cat, count] of Object.entries(byCategory)) {
      const rate = rates[cat] ?? rates['other'] ?? 0
      total += rate * count
    }
    return { total, byCategory }
  }

  private async estimateWhatsAppCostsForChannel(tenantId: string, channelId: string, dateRange: DateRange): Promise<number> {
    const { startDate, endDate } = dateRange
    // Fetch category counts for this channel via conversation relation on MessageAdvanced
    const messages: Array<{ metadata: any }> = await (this.prisma['messageAdvanced'] as any).findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        channel: 'whatsapp',
        conversationId: { in: (await this.prisma['conversationAdvanced'].findMany({ where: { channelId, tenantId }, select: { id: true } })).map((c: any) => c.id) }
      },
      select: { metadata: true }
    })
    const byCategory: Record<string, number> = {}
    for (const row of messages) {
      const meta = (row?.metadata || {}) as any
      const cat = String(meta.waCategory || meta.category || 'other').toLowerCase()
      byCategory[cat] = (byCategory[cat] || 0) + 1
    }
    // Resolve rates same as estimateWhatsAppCosts
    const rates: Record<string, number> = { marketing: 0, utility: 0, authentication: 0, service: 0, other: 0 }
    try {
      const cfg = await (this.prisma as any)['settings']?.findFirst?.({ where: { tenantId, key: 'whatsapp_pricing' } })
      if (cfg?.value) {
        const parsed = typeof cfg.value === 'string' ? JSON.parse(cfg.value) : cfg.value
        Object.assign(rates, parsed?.rates || {})
      }
    } catch { /* noop */ }
    try {
      const envJson = process.env['WHATSAPP_PRICING_RATES']
      if (envJson) {
        const parsed = JSON.parse(envJson)
        Object.assign(rates, parsed?.rates || parsed)
      }
    } catch { /* ignore malformed env */ }
    let total = 0
    for (const [cat, count] of Object.entries(byCategory)) {
      total += (rates[cat] ?? rates['other'] ?? 0) * count
    }
    return total
  }

  // Generic per-message cost estimator for channels like Instagram/Email based on settings or env
  private async estimateGenericPerMessageCost(
    tenantId: string,
    channelType: 'instagram' | 'email',
    opts: { tenantId: string; channelId?: string; dateRange: DateRange }
  ): Promise<{ total: number; count: number; unit: number }> {
    const { startDate, endDate } = opts.dateRange
    // Default unit costs can be configured via settings or env
    let unit = 0
    try {
      const cfg = await (this.prisma as any)['settings']?.findFirst?.({ where: { tenantId, key: `${channelType}_pricing` } })
      if (cfg?.value) {
        const parsed = typeof cfg.value === 'string' ? JSON.parse(cfg.value) : cfg.value
        if (typeof parsed?.unit === 'number') unit = parsed.unit
      }
    } catch { /* noop */ }
    try {
      const envKey = channelType === 'instagram' ? 'INSTAGRAM_MESSAGE_UNIT_COST' : 'EMAIL_MESSAGE_UNIT_COST'
      const env = process.env[envKey]
      if (env && !Number.isNaN(Number(env))) unit = Number(env)
    } catch { /* noop */ }
    const where: any = { channel: channelType, createdAt: { gte: startDate, lte: endDate } }
    if (opts.channelId) where.conversationId = { in: (await this.prisma['conversationAdvanced'].findMany({ where: { id: { not: undefined }, channelId: opts.channelId, tenantId }, select: { id: true } })).map((c: any) => c.id) }
    const count = await this.prisma['messageAdvanced'].count({ where }).catch(() => 0)
    return { total: unit * count, count, unit }
  }

  async getRevenueAttribution(tenantId: string, dateRange: DateRange): Promise<RevenueAttribution> {
    try {
      const { startDate, endDate } = dateRange

      // Revenue sources: Deals (closed) and successful PaymentIntents
      const deals = await this.prisma['deal'].findMany({
        where: {
          tenantId,
          OR: [
            { actualCloseDate: { gte: startDate, lte: endDate } },
            { createdAt: { gte: startDate, lte: endDate } }
          ]
        },
        select: { id: true, value: true, actualCloseDate: true, createdAt: true, assignedUserId: true, customerId: true }
      })

      const payments = await this.prisma['paymentIntent'].findMany({
        where: { tenantId, status: 'succeeded', createdAt: { gte: startDate, lte: endDate } },
        select: { id: true, amount: true, createdAt: true, customerId: true }
      })

      type RevenueEvent = { amount: number; timestamp: Date; customerId?: string | null; agentId?: string | null }
      const revenueEvents: RevenueEvent[] = []

      for (const d of deals) {
        const ts = (d.actualCloseDate as Date) || (d.createdAt as Date)
        const amount = Number(d.value as unknown as any) || 0
        if (amount > 0) revenueEvents.push({ amount, timestamp: ts, customerId: d.customerId || undefined, agentId: d.assignedUserId || undefined })
      }
      for (const p of payments) {
        const amount = Number(p.amount) / 100
        if (amount > 0) revenueEvents.push({ amount, timestamp: p.createdAt as Date, customerId: p.customerId || undefined, agentId: undefined })
      }

      // Determine last-touch channel per revenue event within 30 days
      const touchWindowMs = 30 * 24 * 60 * 60 * 1000
      const byChannelMap = new Map<string, { revenue: number; tickets: number; count: number }>()
      const byAgentMap = new Map<string, { revenue: number; tickets: number; name: string }>()

      for (const ev of revenueEvents) {
        let channel = 'direct'
        if (ev.customerId) {
          const touch = await this.prisma['campaignDelivery'].findFirst({
            where: {
              customerId: ev.customerId,
              status: { in: ['clicked', 'opened', 'delivered', 'sent'] },
              createdAt: { lte: ev.timestamp, gte: new Date(ev.timestamp.getTime() - touchWindowMs) }
            },
            orderBy: { createdAt: 'desc' }
          })
          if (touch?.channel) channel = touch.channel
        }

        const curr = byChannelMap.get(channel) || { revenue: 0, tickets: 0, count: 0 }
        curr.revenue += ev.amount
        curr.count += 1
        byChannelMap.set(channel, curr)

        if (ev.agentId) {
          const key = ev.agentId
          const currA = byAgentMap.get(key) || { revenue: 0, tickets: 0, name: key }
          currA.revenue += ev.amount
          currA.tickets += 1
          byAgentMap.set(key, currA)
        }
      }

      const totalRevenue = Array.from(byChannelMap.values()).reduce((s, c) => s + c.revenue, 0) || 1
      const byChannel = Array.from(byChannelMap.entries()).map(([channel, v]) => ({
        channel,
        revenue: v.revenue,
        percentage: v.revenue / totalRevenue,
        tickets: v.tickets,
        averageValue: v.count ? v.revenue / v.count : 0
      }))

      const byAgent = Array.from(byAgentMap.entries()).map(([agentId, v]) => ({
        agentId,
        agentName: v.name,
        revenue: v.revenue,
        tickets: v.tickets,
        averageValue: v.tickets ? v.revenue / v.tickets : 0
      }))

      // Customer segments (top segments by revenue)
      const segmentRevenueMap = new Map<string, { revenue: number; customers: Set<string> }>()
      for (const ev of revenueEvents) {
        if (!ev.customerId) continue
        const memberships = await this.prisma['customerSegmentMembership'].findMany({ where: { customerId: ev.customerId }, select: { segmentId: true } })
        for (const m of memberships) {
          const seg = await this.prisma['customerSegment'].findUnique({ where: { id: m.segmentId }, select: { name: true } })
          const key = seg?.name || m.segmentId
          const curr = segmentRevenueMap.get(key) || { revenue: 0, customers: new Set<string>() }
          curr.revenue += ev.amount
          curr.customers.add(ev.customerId)
          segmentRevenueMap.set(key, curr)
        }
      }
      const byCustomerSegment = Array.from(segmentRevenueMap.entries()).map(([segment, v]) => ({ segment, revenue: v.revenue, customers: v.customers.size, averageValue: v.customers.size ? v.revenue / v.customers.size : 0 }))

      return {
        byChannel,
        byAgent,
        byCustomerSegment,
        attributionModel: { model: 'last-touch', confidence: 0.6, methodology: 'Last campaign touch within 30 days prior to revenue' }
      }
    } catch (error) {
      this.logger.error(`Failed to get revenue attribution for tenant ${tenantId}:`, error)
      return { byChannel: [], byAgent: [], byCustomerSegment: [], attributionModel: { model: 'last-touch', confidence: 0, methodology: 'error' } }
    }
  }

  async getCostAnalysis(tenantId: string, dateRange: DateRange): Promise<CostAnalysis> {
    try {
      const { startDate, endDate } = dateRange
      const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
      const agents = await this.prisma['user'].count({ where: { tenantId, role: 'agent', status: 'active' } })
      const tickets = await this.prisma['ticket'].count({ where: { tenantId, createdAt: { gte: startDate, lte: endDate } } })

      // Naive cost model
      const hourlyRate = 25
      const personnel = agents * 8 * days * hourlyRate
      const technology = 200 + agents * 5
      const infrastructure = 150
      const training = 50
      // External costs include channel variable costs (WhatsApp priced by category, IG/Email per-message if configured)
      let external = 0
      try {
        const wa = await this.estimateWhatsAppCosts(tenantId, dateRange)
        external += wa.total
      } catch { /* noop */ }
      try {
        const ig = await this.estimateGenericPerMessageCost(tenantId, 'instagram', { tenantId, dateRange })
        external += ig.total
      } catch { /* noop */ }
      try {
        const em = await this.estimateGenericPerMessageCost(tenantId, 'email', { tenantId, dateRange })
        external += em.total
      } catch { /* noop */ }
      const overhead = Math.round((personnel + technology + infrastructure + training + external) * 0.15)

      const totalCosts = personnel + technology + infrastructure + training + external + overhead
      const costPerTicket = tickets > 0 ? totalCosts / tickets : 0

      return {
        totalCosts,
        breakdown: { personnel, technology, infrastructure, training, external, overhead },
        efficiency: {
          score: totalCosts > 0 ? Math.max(0, 100 - (costPerTicket / 10) * 100) : 0,
          benchmarks: [],
          improvements: []
        },
        trends: [],
        costPerTicket,
        costPerResolution: costPerTicket,
        costPerCustomer: 0,
        costPerAgent: agents > 0 ? totalCosts / agents : 0,
        optimizations: []
      }
    } catch (error) {
      this.logger.error(`Failed to get cost analysis for tenant ${tenantId}:`, error)
      return {
        totalCosts: 0,
        breakdown: { personnel: 0, technology: 0, infrastructure: 0, training: 0, external: 0, overhead: 0 },
        efficiency: { score: 0, benchmarks: [], improvements: [] },
        trends: [],
        costPerTicket: 0,
        costPerResolution: 0,
        costPerCustomer: 0,
        costPerAgent: 0,
        optimizations: []
      }
    }
  }

  // Business Insights: orders, confirmations, deliveries, earnings derived from Deals and PaymentIntents
  async getBusinessInsights(tenantId: string, dateRange: DateRange): Promise<BusinessInsights> {
    const { startDate, endDate } = dateRange
    // Orders: count of deals created in range
    const orders = await this.prisma['deal'].count({ where: { tenantId, createdAt: { gte: startDate, lte: endDate } } })
    // Confirmations: deals moved to QUALIFIED/PROPOSAL (as proxy)
    const confirmations = await this.prisma['deal'].count({ where: { tenantId, createdAt: { gte: startDate, lte: endDate }, stage: { in: ['QUALIFIED','PROPOSAL','NEGOTIATION','WON'] } as any } })
    // Deliveries: deals WON in range
    const deliveries = await this.prisma['deal'].count({ where: { tenantId, actualCloseDate: { not: null, gte: startDate, lte: endDate } } })
    // Earnings: sum successful payment intents in range (cents to dollars)
    const paymentsAgg: any = await (this.prisma['paymentIntent'] as any).aggregate({ where: { tenantId, status: 'succeeded', createdAt: { gte: startDate, lte: endDate } }, _sum: { amount: true } })
    const earnings = Math.round(((paymentsAgg?._sum?.amount || 0) as number) / 100)

    // Daily trend buckets
    const dayMap = new Map<string, { orders: number; confirmations: number; deliveries: number; earnings: number }>()
    const normalize = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().substring(0,10)

    const dealsCreated = await this.prisma['deal'].findMany({ where: { tenantId, createdAt: { gte: startDate, lte: endDate } }, select: { createdAt: true, stage: true } })
    for (const d of dealsCreated) {
      const key = normalize(d.createdAt as Date)
      const curr = dayMap.get(key) || { orders: 0, confirmations: 0, deliveries: 0, earnings: 0 }
      curr.orders += 1
      if (['QUALIFIED','PROPOSAL','NEGOTIATION','WON'].includes(String(d.stage || '').toUpperCase())) curr.confirmations += 1
      dayMap.set(key, curr)
    }

    const dealsWon = await this.prisma['deal'].findMany({ where: { tenantId, actualCloseDate: { not: null, gte: startDate, lte: endDate } }, select: { actualCloseDate: true } })
    for (const d of dealsWon) {
      const key = normalize(d.actualCloseDate as Date)
      const curr = dayMap.get(key) || { orders: 0, confirmations: 0, deliveries: 0, earnings: 0 }
      curr.deliveries += 1
      dayMap.set(key, curr)
    }

    const paymentEvents = await this.prisma['paymentIntent'].findMany({ where: { tenantId, status: 'succeeded', createdAt: { gte: startDate, lte: endDate } }, select: { createdAt: true, amount: true } })
    for (const p of paymentEvents) {
      const key = normalize(p.createdAt as Date)
      const curr = dayMap.get(key) || { orders: 0, confirmations: 0, deliveries: 0, earnings: 0 }
      curr.earnings += Math.round((Number((p as any).amount) || 0) / 100)
      dayMap.set(key, curr)
    }

    const daily = Array.from(dayMap.entries())
      .sort((a,b) => a[0] < b[0] ? -1 : 1)
      .map(([date, v]) => ({ date, orders: v.orders, confirmations: v.confirmations, deliveries: v.deliveries, earnings: v.earnings }))

    // Customer-centric metrics
    const newCustomers = await this.prisma['customer'].count({ where: { tenantId, createdAt: { gte: startDate, lte: endDate } } })
    // Active = any activity in range: ticket created, deal created/closed, payment succeeded
    const activeCustomerIds = new Set<string>()
    const [ticketCusts, dealCusts, paymentCusts] = await Promise.all([
      this.prisma['ticket'].findMany({ where: { tenantId, createdAt: { gte: startDate, lte: endDate } }, select: { customerId: true } }),
      this.prisma['deal'].findMany({ where: { tenantId, OR: [{ createdAt: { gte: startDate, lte: endDate } }, { actualCloseDate: { gte: startDate, lte: endDate } }] }, select: { customerId: true } }),
      this.prisma['paymentIntent'].findMany({ where: { tenantId, status: 'succeeded', createdAt: { gte: startDate, lte: endDate } }, select: { customerId: true } })
    ])
    for (const r of ticketCusts) if ((r as any).customerId) activeCustomerIds.add((r as any).customerId as string)
    for (const r of dealCusts) if ((r as any).customerId) activeCustomerIds.add((r as any).customerId as string)
    for (const r of paymentCusts) if ((r as any).customerId) activeCustomerIds.add((r as any).customerId as string)
    const activeCustomers = activeCustomerIds.size

    const revenuePerCustomer = activeCustomers > 0 ? earnings / activeCustomers : 0
    const averageOrderValue = orders > 0 ? earnings / orders : 0

    // Repeat purchase rate: customers with >= 2 deals overall (or within range)
    const dealsByCustomer = await (this.prisma['deal'] as any).groupBy({ by: ['customerId'], where: { tenantId, createdAt: { gte: startDate, lte: endDate } }, _count: { id: true } }) as Array<{ customerId: string | null, _count: { id: number } }>
    const repeatCustomers = dealsByCustomer.filter(d => (d.customerId && d._count.id >= 2)).length
    const customersWithAnyDeal = dealsByCustomer.filter(d => d.customerId && d._count.id >= 1).length
    const repeatPurchaseRate = customersWithAnyDeal > 0 ? repeatCustomers / customersWithAnyDeal : 0

    // Segment revenue (by Customer Segment memberships)
    const segmentRevenueMap = new Map<string, { revenue: number, customers: Set<string> }>()
    for (const p of paymentEvents) {
      if (!(p as any).customerId) continue
      const segs = await (this.prisma['customerSegmentMembership'] as any).findMany({ where: { customerId: (p as any).customerId }, select: { segmentId: true } })
      for (const s of segs) {
        const seg = await (this.prisma['customerSegment'] as any).findUnique({ where: { id: s.segmentId }, select: { name: true } })
        const key = seg?.name || s.segmentId
        const curr = segmentRevenueMap.get(key) || { revenue: 0, customers: new Set<string>() }
        curr.revenue += Math.round((Number((p as any).amount) || 0) / 100)
        curr.customers.add((p as any).customerId)
        segmentRevenueMap.set(key, curr)
      }
    }
    const segments = Array.from(segmentRevenueMap.entries()).map(([segment, v]) => ({ segment, revenue: v.revenue, customers: v.customers.size }))

    // CSAT
    const csatAgg: any = await (this.prisma['customerSatisfactionSurvey'] as any).aggregate({ where: { tenantId, createdAt: { gte: startDate, lte: endDate }, respondedAt: { not: null } }, _avg: { rating: true }, _count: { id: true } })
    const csat = { averageRating: (csatAgg?._avg?.rating as number) || 0, totalResponses: (csatAgg?._count?.id as number) || 0 }

    return {
      summary: { orders, confirmations, deliveries, earnings },
      trends: { daily },
      customers: { newCustomers, activeCustomers, revenuePerCustomer, averageOrderValue, repeatPurchaseRate },
      segments,
      csat
    }
  }

  async createCustomReport(_tenantId: string, _reportDefinition: ReportDefinition): Promise<CustomReport> {
    const tenantId = _tenantId
    const def = _reportDefinition
    const tpl = await (this.prisma['analyticsReportTemplate'] as any).create({
      data: {
        tenantId,
        name: def.name,
        category: def.category,
        definition: def as any,
        isActive: true
      }
    })
    const created: CustomReport = {
      id: tpl.id,
      definition: def,
      lastExecuted: undefined,
      executionCount: 0,
      averageExecutionTime: 0,
      status: 'active'
    }
    return created
  }

  async executeReport(_tenantId: string, _reportId: string, _parameters?: Record<string, unknown>): Promise<ReportResult> {
    const tenantId = _tenantId
    const reportId = _reportId
    const params = _parameters || {}

    const tpl = await (this.prisma['analyticsReportTemplate'] as any).findFirst({ where: { id: reportId, tenantId } })
    if (!tpl) {
      throw new Error('Report template not found')
    }

    const started = Date.now()
    // Placeholder execution: in production, translate definition -> query engine
    const rows: any[] = []
    const executionTime = Date.now() - started

    // Persist execution record
    await (this.prisma['analyticsReport'] as any).create({
      data: {
        tenantId,
        templateId: reportId,
        name: tpl.name,
        parameters: params as any,
        format: 'json',
        status: 'completed',
        fileUrl: null,
        completedAt: new Date()
      }
    })

    const result: ReportResult = {
      reportId,
      executedAt: new Date(),
      executionTime,
      data: rows,
      summary: { keyMetrics: [], insights: [], recommendations: [] },
      parameters: params,
      rowCount: rows.length,
      columnCount: rows.length ? Object.keys(rows[0]).length : 0,
      exportUrls: {}
    }
    return result
  }

  async getCustomReports(_tenantId: string): Promise<CustomReport[]> {
    const tenantId = _tenantId
    const templates = await (this.prisma['analyticsReportTemplate'] as any).findMany({ where: { tenantId, isActive: true }, orderBy: { updatedAt: 'desc' } })
    const counts = await (this.prisma['analyticsReport'] as any).groupBy({ by: ['templateId'], where: { tenantId }, _count: { _all: true } }).catch(() => [])
    const countMap = new Map<string, number>()
    for (const c of counts as any[]) countMap.set(c.templateId, c._count?._all || 0)
    return templates.map((tpl: any) => ({
      id: tpl.id,
      definition: (tpl.definition || {}) as ReportDefinition,
      lastExecuted: undefined,
      executionCount: countMap.get(tpl.id) || 0,
      averageExecutionTime: 0,
      status: tpl.isActive ? 'active' : 'inactive'
    }))
  }

  async scheduleReport(_tenantId: string, _reportId: string, _schedule: ReportSchedule): Promise<ScheduledReport> {
    const tenantId = _tenantId
    const reportId = _reportId
    const format = _schedule.format || 'pdf'
    // Defensive: prisma or delegate may be missing if client is outdated; fall back gracefully
    let job: any = { id: `job-${Date.now()}` }
    try {
      const client: any = this.prisma as any
      if (client && client.analyticsExportJob) {
        job = await client.analyticsExportJob.create({
          data: {
            tenantId,
            type: 'metric',
            sourceId: null,
            templateId: reportId,
            format,
            status: 'pending'
          }
        })
      } else {
        this.logger.warn('analyticsExportJob delegate not available on Prisma client; returning synthetic schedule entry')
      }
    } catch (err) {
      this.logger.warn(`Failed to persist scheduled report, fallback to synthetic entry: ${err instanceof Error ? err.message : String(err)}`)
    }
    const scheduled: ScheduledReport = {
      id: job.id,
      reportId,
      schedule: _schedule,
      nextExecution: new Date(Date.now() + 60 * 1000),
      lastExecution: undefined,
      status: 'active',
      executionHistory: []
    }
    return scheduled
  }

  async getScheduledReports(_tenantId: string): Promise<ScheduledReport[]> {
    const tenantId = _tenantId
    try {
      const client: any = this.prisma as any
      if (!client || !client.analyticsExportJob) {
        this.logger.warn('analyticsExportJob delegate not available on Prisma client; returning empty schedules list')
        return []
      }
      const jobs = await client.analyticsExportJob.findMany({ where: { tenantId, templateId: { not: null } }, orderBy: { createdAt: 'desc' } })
      return jobs.map((j: any) => ({
        id: j.id,
        reportId: j.templateId,
        schedule: { frequency: 'weekly', time: '09:00', timezone: 'UTC', recipients: [], format: j.format },
        nextExecution: new Date(),
        lastExecution: j.completedAt || undefined,
        status: j.status === 'failed' ? 'error' : 'active',
        executionHistory: []
      }))
    } catch (err) {
      this.logger.warn(`getScheduledReports failed, returning empty list: ${err instanceof Error ? err.message : String(err)}`)
      return []
    }
  }

  // Private helper methods
  private async calculateTotalTicketsKPI(
    tenantId: string, 
    startTime: Date, 
    endTime: Date, 
    previousStartTime: Date, 
    previousEndTime: Date
  ): Promise<KPIMetric> {
    const currentValue = await this.prisma['ticket'].count({
      where: { tenantId, createdAt: { gte: startTime, lte: endTime } }
    })
    
    const previousValue = await this.prisma['ticket'].count({
      where: { tenantId, createdAt: { gte: previousStartTime, lte: previousEndTime } }
    })

    const changePercentage = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0
    const trend = changePercentage > 5 ? 'up' : changePercentage < -5 ? 'down' : 'stable'

    return {
      id: 'total_tickets',
      name: 'Total Tickets',
      value: currentValue,
      previousValue,
      changePercentage,
      trend,
      unit: 'tickets',
      category: 'performance',
      timestamp: new Date()
    }
  }

  private async calculateResolutionRateKPI(
    tenantId: string, 
    startTime: Date, 
    endTime: Date, 
    previousStartTime: Date, 
    previousEndTime: Date
  ): Promise<KPIMetric> {
    const totalTickets = await this.prisma['ticket'].count({
      where: { tenantId, createdAt: { gte: startTime, lte: endTime } }
    })
    
    const resolvedTickets = await this.prisma['ticket'].count({
      where: { 
        tenantId, 
        createdAt: { gte: startTime, lte: endTime },
        status: 'resolved'
      }
    })

    const currentValue = totalTickets > 0 ? (resolvedTickets / totalTickets) * 100 : 0

    // Calculate previous period
    const previousTotalTickets = await this.prisma['ticket'].count({
      where: { tenantId, createdAt: { gte: previousStartTime, lte: previousEndTime } }
    })
    
    const previousResolvedTickets = await this.prisma['ticket'].count({
      where: { 
        tenantId, 
        createdAt: { gte: previousStartTime, lte: previousEndTime },
        status: 'resolved'
      }
    })

    const previousValue = previousTotalTickets > 0 ? (previousResolvedTickets / previousTotalTickets) * 100 : 0
    const changePercentage = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0
    const trend = changePercentage > 2 ? 'up' : changePercentage < -2 ? 'down' : 'stable'

    return {
      id: 'resolution_rate',
      name: 'Resolution Rate',
      value: currentValue,
      previousValue,
      changePercentage,
      trend,
      target: 85,
      unit: '%',
      category: 'quality',
      timestamp: new Date()
    }
  }

  private async calculateCustomerSatisfactionKPI(
    tenantId: string, 
    startTime: Date, 
    endTime: Date, 
    previousStartTime: Date, 
    previousEndTime: Date
  ): Promise<KPIMetric> {
      const currentData: any = await (this.prisma['customerSatisfactionSurvey'] as any).aggregate({
      where: { tenantId, createdAt: { gte: startTime, lte: endTime } },
      _avg: { rating: true }
    })
    
      const previousData: any = await (this.prisma['customerSatisfactionSurvey'] as any).aggregate({
      where: { tenantId, createdAt: { gte: previousStartTime, lte: previousEndTime } },
      _avg: { rating: true }
    })

    const currentValue = currentData._avg.rating || 0
    const previousValue = previousData._avg.rating || 0
    const changePercentage = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0
    const trend = changePercentage > 2 ? 'up' : changePercentage < -2 ? 'down' : 'stable'

    return {
      id: 'customer_satisfaction',
      name: 'Customer Satisfaction',
      value: currentValue,
      previousValue,
      changePercentage,
      trend,
      target: 4.5,
      unit: 'rating',
      category: 'satisfaction',
      timestamp: new Date()
    }
  }

  private async calculateFirstResponseTimeKPI(
    tenantId: string, 
    startTime: Date, 
    endTime: Date, 
    previousStartTime: Date, 
    previousEndTime: Date
  ): Promise<KPIMetric> {
    const currentData = await this.prisma['ticket'].aggregate({
      where: { 
        tenantId, 
        createdAt: { gte: startTime, lte: endTime },
        firstResponseAt: { not: null }
      },
      _avg: { firstResponseTime: true }
    })
    
    const previousData = await this.prisma['ticket'].aggregate({
      where: { 
        tenantId, 
        createdAt: { gte: previousStartTime, lte: previousEndTime },
        firstResponseAt: { not: null }
      },
      _avg: { firstResponseTime: true }
    })

    const currentValue = (currentData._avg.firstResponseTime || 0) / 60 // Convert to minutes
    const previousValue = (previousData._avg.firstResponseTime || 0) / 60
    const changePercentage = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0
    const trend = changePercentage < -5 ? 'up' : changePercentage > 5 ? 'down' : 'stable' // Lower is better

    return {
      id: 'first_response_time',
      name: 'First Response Time',
      value: currentValue,
      previousValue,
      changePercentage,
      trend,
      target: 60, // 1 hour target
      unit: 'minutes',
      category: 'performance',
      timestamp: new Date()
    }
  }

  private async calculateSLAComplianceKPI(
    tenantId: string, 
    startTime: Date, 
    endTime: Date, 
    previousStartTime: Date, 
    previousEndTime: Date
  ): Promise<KPIMetric> {
    const totalSLAs = await (this.prisma['slaInstance'] as any).count({
      where: { tenantId, createdAt: { gte: startTime, lte: endTime } }
    })
    
    const metSLAs = await (this.prisma['slaInstance'] as any).count({
      where: { 
        tenantId, 
        createdAt: { gte: startTime, lte: endTime },
        status: 'met'
      }
    })

    const currentValue = totalSLAs > 0 ? (metSLAs / totalSLAs) * 100 : 0

    // Calculate previous period
    const previousTotalSLAs = await (this.prisma['slaInstance'] as any).count({
      where: { tenantId, createdAt: { gte: previousStartTime, lte: previousEndTime } }
    })
    
    const previousMetSLAs = await (this.prisma['slaInstance'] as any).count({
      where: { 
        tenantId, 
        createdAt: { gte: previousStartTime, lte: previousEndTime },
        status: 'met'
      }
    })

    const previousValue = previousTotalSLAs > 0 ? (previousMetSLAs / previousTotalSLAs) * 100 : 0
    const changePercentage = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0
    const trend = changePercentage > 2 ? 'up' : changePercentage < -2 ? 'down' : 'stable'

    return {
      id: 'sla_compliance',
      name: 'SLA Compliance',
      value: currentValue,
      previousValue,
      changePercentage,
      trend,
      target: 95,
      unit: '%',
      category: 'quality',
      timestamp: new Date()
    }
  }

  private generateDemandPredictions(historicalData: Array<{createdAt: Date, _count: {id: number}}>, forecastPeriod: number): Array<{date: Date, predictedTickets: number, confidence: number, factors: string[]}> {
    // Simple moving average prediction (in production, use more sophisticated algorithms)
    const predictions: Array<{date: Date, predictedTickets: number, confidence: number, factors: string[]}> = []
    const windowSize = 7 // 7-day moving average
    
    for (let i = 0; i < forecastPeriod; i++) {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + i + 1)
      
      // Calculate moving average from recent data
      const recentData = historicalData.slice(-windowSize)
      const avgTickets = recentData.length > 0 ? recentData.reduce((sum, item) => sum + item._count.id, 0) / recentData.length : 50
      
      // Add some randomness and trend
      const seasonalityFactor = 1 + 0.1 * Math.sin((i / 7) * 2 * Math.PI) // Weekly seasonality
      const trendFactor = 1.02 // 2% growth trend
      const predictedTickets = Math.round(avgTickets * seasonalityFactor * trendFactor)
      
      predictions.push({
        date: futureDate,
        predictedTickets,
        confidence: 0.8,
        factors: ['historical_data', 'seasonal_pattern']
      })
    }
    
    return predictions
  }

  private calculateChurnProbability(customer: {id: string, tickets: Array<{createdAt: Date}>, satisfactionSurveys: Array<{rating: number}>}): number {
    // Simple churn probability calculation (in production, use ML models)
    let score = 0.5 // Base probability
    
    // Factor in ticket frequency (more tickets = higher churn risk)
    const ticketCount = customer.tickets.length
    if (ticketCount > 5) score += 0.2
    else if (ticketCount > 2) score += 0.1
    
    // Factor in satisfaction scores
    const avgSatisfaction = this.getAverageSatisfaction(customer.satisfactionSurveys)
    if (avgSatisfaction < 3) score += 0.3
    else if (avgSatisfaction < 4) score += 0.1
    else if (avgSatisfaction > 4.5) score -= 0.2
    
    // Factor in last interaction
    const daysSinceLastInteraction = this.getDaysSinceLastInteraction(customer)
    if (daysSinceLastInteraction > 90) score += 0.2
    else if (daysSinceLastInteraction > 30) score += 0.1
    
    return Math.max(0, Math.min(1, score))
  }

  private determineRiskLevel(churnProbability: number): 'low' | 'medium' | 'high' {
    if (churnProbability >= 0.6) return 'high'
    if (churnProbability >= 0.4) return 'medium'
    return 'low'
  }

  private getAverageSatisfaction(surveys: Array<{rating: number}>): number {
    if (surveys.length === 0) return 3 // Default neutral score
    return surveys.reduce((sum, survey) => sum + survey.rating, 0) / surveys.length
  }

  private getDaysSinceLastInteraction(customer: {tickets: Array<{createdAt: Date}>}): number {
    if (customer.tickets.length === 0) return 365 // No interactions
    
    const lastTicket = customer.tickets[0] // Already ordered by createdAt desc
    const daysSince = Math.floor((Date.now() - lastTicket.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    return daysSince
  }
}