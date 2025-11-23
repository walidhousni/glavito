import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { PrismaService } from '@glavito/shared-database';
import { AdvancedChurnPreventionService } from '../ai/advanced-churn-prevention.service';
import { AISalesOptimizationService } from '../ai/ai-sales-optimization.service';
import { IntelligentCustomerJourneyService } from '../ai/intelligent-customer-journey.service';

export interface CustomerHealthScore {
  score: number;
  factors: {
    ticketVolume: number;
    responseTime: number;
    satisfaction: number;
    engagement: number;
    churnRisk: number;
  };
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

export interface CustomerLifetimeValue {
  totalValue: number;
  predictedValue: number;
  averageOrderValue: number;
  purchaseFrequency: number;
  customerLifespan: number;
  profitMargin: number;
}

export interface CustomerSegment {
  id: string;
  name: string;
  description: string;
  criteria: Record<string, unknown>;
  customerCount: number;
  averageValue: number;
}

export interface CustomerJourney {
  touchpoints: Array<{
    id: string;
    type: 'email' | 'whatsapp' | 'instagram' | 'web' | 'phone';
    timestamp: Date;
    channel: string;
    interaction: string;
    outcome: string;
    sentiment?: string;
  }>;
  stages: Array<{
    stage: 'awareness' | 'consideration' | 'purchase' | 'retention' | 'advocacy';
    entryDate: Date;
    duration: number;
    touchpointCount: number;
  }>;
  conversionEvents: Array<{
    event: string;
    timestamp: Date;
    value: number;
    attribution: string[];
  }>;
}

type ChannelLite = { name: string; type: string };
type ConversationLite = { id: string; createdAt: Date; channel: ChannelLite; status?: string };
type TicketLite = { id: string; createdAt: Date; status: string; channel: ChannelLite; aiAnalysis?: { sentiment?: { label?: string } | string } | null };

@Injectable()
export class CustomerAnalyticsService {
  private readonly logger = new Logger(CustomerAnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly churnPreventionService?: AdvancedChurnPreventionService,
    @Optional() private readonly salesOptimizationService?: AISalesOptimizationService,
    @Optional() private readonly journeyService?: IntelligentCustomerJourneyService
  ) {}

  async getSegmentsOverview(tenantId: string): Promise<{ totalCustomers: number; segments: Array<{ id: string; name: string; customerCount: number; averageValue: number; }> }> {
    const [totalCustomers, segments, payments] = await Promise.all([
      this.prisma.customer.count({ where: { tenantId } }),
      this.prisma.customerSegment.findMany({
        where: { tenantId },
        include: { _count: { select: { memberships: true } } },
        orderBy: { name: 'asc' },
      }),
      this.prisma.paymentIntent.findMany({
        where: { tenantId, status: { in: ['succeeded', 'processing', 'requires_capture'] } },
        select: { customerId: true, amount: true },
      }),
    ]);

    const spentByCustomer = payments.reduce((map, p) => {
      const current = map.get(p.customerId || '') || 0;
      map.set(p.customerId || '', current + (p.amount || 0));
      return map;
    }, new Map<string, number>());

    // Compute simple average value per segment from members' total spend (best-effort)
    const segmentsWithAvg = await Promise.all(segments.map(async (seg) => {
      const memberIds = await this.prisma.customerSegmentMembership.findMany({
        where: { segmentId: seg.id },
        select: { customerId: true },
      });
      const totalCents = memberIds.reduce((sum, m) => sum + (spentByCustomer.get(m.customerId) || 0), 0);
      const count = seg._count.memberships || memberIds.length || 0;
      return {
        id: seg.id,
        name: seg.name,
        customerCount: count,
        averageValue: count > 0 ? Math.round((totalCents / 100) / count) : 0,
      };
    }));

    return { totalCustomers, segments: segmentsWithAvg };
  }

  async getAnalyticsDashboard(tenantId: string, timeframe: '7d' | '30d' | '90d' | '1y' = '30d') {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const days = timeframe === '7d' ? 7 : timeframe === '90d' ? 90 : timeframe === '1y' ? 365 : 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [totalCustomers, newCustomersThisMonth, activeCustomers, payments] = await Promise.all([
      this.prisma.customer.count({ where: { tenantId } }),
      this.prisma.customer.count({ where: { tenantId, createdAt: { gte: startOfMonth } } }),
      this.prisma.conversation.groupBy({
        by: ['customerId'],
        where: { tenantId, createdAt: { gte: since } },
        _count: { customerId: true },
      }).then((rows) => rows.length),
      this.prisma.paymentIntent.aggregate({
        where: { tenantId, status: { in: ['succeeded','processing','requires_capture'] } },
        _sum: { amount: true },
      }),
    ]);

    const averageLifetimeValue = totalCustomers > 0 ? Math.round(((payments._sum.amount || 0) / 100) / totalCustomers) : 0;

    // crude churn proxy using customers with high/critical churnRisk
    const [high, critical] = await Promise.all([
      this.prisma.customer.count({ where: { tenantId, churnRisk: { in: ['high'] } } }).catch(() => 0),
      this.prisma.customer.count({ where: { tenantId, churnRisk: { in: ['critical'] } } }).catch(() => 0),
    ]);
    const churnRate = totalCustomers > 0 ? Number(((high + critical) / totalCustomers * 100).toFixed(1)) : 0;

    // ---------------- Engagement Metrics (derived) ----------------
    let avgSessionDuration = 0; // minutes
    let pagesPerSession = 0; // proxy: messages per conversation
    let bounceRate = 0; // % convs with <= 2 messages
    let returnVisitorRate = 0; // % recent customers with any prior interaction
    let emailOpenRate = 0; // % opens per sent
    let clickThroughRate = 0; // % clicks per sent

    try {
      // Messages grouped by conversation (last 30 days)
      type GroupRow = { conversationId: string; _count: { _all: number }; _min: { createdAt: Date | null }; _max: { createdAt: Date | null } };
      const groups: GroupRow[] = await (this.prisma as unknown as { message: { groupBy: (args: { by: string[]; where: Record<string, unknown>; _count: Record<string, unknown>; _min: Record<string, unknown>; _max: Record<string, unknown> }) => Promise<GroupRow[]> } }).message?.groupBy?.({
        by: ['conversationId'],
        where: { conversation: { tenantId, createdAt: { gte: since } } },
        _count: { _all: true },
        _min: { createdAt: true },
        _max: { createdAt: true },
      }).catch(() => []);

      if (Array.isArray(groups) && groups.length) {
        const totalMsgs = groups.reduce((s, g) => s + (g._count?._all || 0), 0);
        pagesPerSession = Math.round((totalMsgs / groups.length) * 10) / 10;
        const durations = groups.map((g) => {
          const start = g._min?.createdAt ? new Date(g._min.createdAt).getTime() : 0;
          const end = g._max?.createdAt ? new Date(g._max.createdAt).getTime() : 0;
          return Math.max(0, end - start);
        });
        avgSessionDuration = durations.length ? Math.round((durations.reduce((s, d) => s + d, 0) / durations.length) / (60 * 1000)) : 0;
        const bounces = groups.filter((g) => (g._count?._all || 0) <= 2).length;
        bounceRate = Math.round((bounces / groups.length) * 1000) / 10;
      }

      // Return visitor rate (customers with conv in last30 that also had earlier conv)
      type CustRow = { customerId: string };
      const recentCustomerRows: CustRow[] = await (this.prisma as unknown as { conversation: { groupBy: (args: { by: string[]; where: Record<string, unknown>; _count: Record<string, unknown> }) => Promise<CustRow[]> } }).conversation?.groupBy?.({
        by: ['customerId'],
        where: { tenantId, createdAt: { gte: since } },
        _count: { customerId: true },
      }).then((rows: Array<CustRow & { _count?: { customerId?: number } }>) => rows.map((r) => ({ customerId: r.customerId }))).catch((): CustRow[] => []);
      const recentCustomerIds = Array.from(new Set(recentCustomerRows.map((r) => r.customerId).filter(Boolean)));
      if (recentCustomerIds.length) {
        const prevRows: CustRow[] = await (this.prisma as unknown as { conversation: { findMany: (args: { where: Record<string, unknown>; select: { customerId: boolean }; distinct: string[] }) => Promise<CustRow[]> } }).conversation?.findMany?.({
          where: { tenantId, customerId: { in: recentCustomerIds }, createdAt: { lt: since } },
          select: { customerId: true },
          distinct: ['customerId'],
        }).catch(() => []);
        const prevCount = Array.isArray(prevRows) ? prevRows.length : 0;
        returnVisitorRate = Math.round(((prevCount / recentCustomerIds.length) * 1000)) / 10;
      }

      // Email open and click rates (last 30 days)
      const [sentCount, openedCount, clickedCount] = await Promise.all([
        this.prisma.emailDelivery.count({ where: { tenantId, createdAt: { gte: since } } }).catch(() => 0),
        this.prisma.emailEvent.count({ where: { tenantId, type: 'open', createdAt: { gte: since } } }).catch(() => 0),
        this.prisma.emailEvent.count({ where: { tenantId, type: 'click', createdAt: { gte: since } } }).catch(() => 0),
      ]);
      if (sentCount > 0) {
        emailOpenRate = Math.round(((openedCount / sentCount) * 1000)) / 10;
        clickThroughRate = Math.round(((clickedCount / sentCount) * 1000)) / 10;
      }
    } catch {
      // keep defaults
    }

    // ---------------- Conversion Funnel (last 30d) ----------------
    let funnel: Array<{ stage: string; count: number; percentage: number }> = [];
    try {
      const [awarenessConvs, interestLeads, considerationDeals, purchases] = await Promise.all<number>([
        this.prisma.conversation.count({ where: { tenantId, createdAt: { gte: since } } }).catch(() => 0),
        this.prisma.lead.count({ where: { tenantId, createdAt: { gte: since } } }).catch(() => 0),
        this.prisma.deal.count({ where: { tenantId, createdAt: { gte: since } } }).catch(() => 0),
        this.prisma.paymentIntent.count({ where: { tenantId, status: { in: ['succeeded'] }, createdAt: { gte: since } } }).catch(() => 0),
      ]);
      const awareness = Math.max(awarenessConvs, interestLeads, considerationDeals, purchases, 1);
      funnel = [
        { stage: 'Awareness', count: awarenessConvs, percentage: Math.round((awarenessConvs / awareness) * 100) },
        { stage: 'Interest', count: interestLeads, percentage: Math.round((interestLeads / awareness) * 100) },
        { stage: 'Consideration', count: considerationDeals, percentage: Math.round((considerationDeals / awareness) * 100) },
        { stage: 'Purchase', count: purchases, percentage: Math.round((purchases / awareness) * 100) },
        // Retention approximated from repeat purchasers in last 180d
      ];
    } catch {
      funnel = [];
    }

    // ---------------- Cohort Analysis (aligned to timeframe) ----------------
    const cohorts: Array<{ cohort: string; retention: number[]; color: string }> = [];
    try {
      type Window = { start: Date; end: Date; label: string };
      const windows: Window[] = [];
      if (timeframe === '1y') {
        const monthLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const start = new Date(d.getFullYear(), d.getMonth(), 1);
          const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
          windows.push({ start, end, label: monthLabels[start.getMonth()] });
        }
      } else if (timeframe === '90d') {
        const monthLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        for (let i = 2; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const start = new Date(d.getFullYear(), d.getMonth(), 1);
          const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
          windows.push({ start, end, label: monthLabels[start.getMonth()] });
        }
      } else if (timeframe === '30d') {
        // last 4 weeks
        for (let i = 3; i >= 0; i--) {
          const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7);
          const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 7);
          windows.push({ start, end, label: `W${4 - i}` });
        }
      } else {
        // 7d -> daily
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
          const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
          const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
          windows.push({ start, end, label: `${start.getMonth() + 1}/${start.getDate()}` });
        }
      }

      for (let cIdx = 0; cIdx < windows.length; cIdx++) {
        const cohortWin = windows[cIdx];
        const baseCustomers = await this.prisma.customer.findMany({
          where: { tenantId, createdAt: { gte: cohortWin.start, lt: cohortWin.end } },
          select: { id: true },
        });
        const baseCount = baseCustomers.length;
        if (!baseCount) {
          // ensure consistent retention vector length = min(6, windows.length)
          const len = Math.min(6, windows.length);
          cohorts.push({ cohort: cohortWin.label, retention: new Array(len).fill(0), color: 'bg-blue-500' });
          continue;
        }
        const baseIds = baseCustomers.map((c) => c.id);
        const retention: number[] = [];
        const maxPeriods = Math.min(6, windows.length - cIdx);
        for (let r = 0; r < maxPeriods; r++) {
          const w = windows[cIdx + r];
          const activeRows = await this.prisma.conversation.groupBy({
            by: ['customerId'],
            where: { tenantId, customerId: { in: baseIds }, createdAt: { gte: w.start, lt: w.end } },
            _count: { customerId: true },
          }).catch(() => [] as Array<{ customerId: string; _count: { customerId: number } }>);
          const activeCount = Array.isArray(activeRows) ? activeRows.length : 0;
          retention.push(Math.round((activeCount / baseCount) * 100));
        }
        cohorts.push({ cohort: cohortWin.label, retention, color: ['bg-blue-500','bg-green-500','bg-yellow-500','bg-orange-500','bg-purple-500','bg-pink-500'][cIdx % 6] });
      }
    } catch {
      // keep empty
    }

    return {
      overview: {
        totalCustomers,
        activeCustomers,
        newCustomersThisMonth,
        churnRate,
        averageLifetimeValue,
        customerSatisfactionScore: 0,
        // Engagement metrics added
        avgSessionDuration,
        pagesPerSession,
        bounceRate,
        returnVisitorRate,
        emailOpenRate,
        clickThroughRate,
      },
      trends: {
        funnel,
        cohorts,
      },
    };
  }

  async getBehavioralAnalytics(tenantId: string, timeframe: '7d' | '30d' | '90d' | '1y' = '30d', segmentId?: string) {
    const days = timeframe === '7d' ? 7 : timeframe === '90d' ? 90 : timeframe === '1y' ? 365 : 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    let customerIds: string[] | undefined = undefined;
    if (segmentId) {
      const members = await this.prisma.customerSegmentMembership.findMany({ where: { segmentId }, select: { customerId: true } });
      customerIds = members.map(m => m.customerId);
    }

    const whereBase: Record<string, unknown> = { tenantId, createdAt: { gte: since } };
    const whereConv = customerIds && customerIds.length ? { ...whereBase, customerId: { in: customerIds } } : whereBase;

    const conversations = await this.prisma.conversation.findMany({ where: whereConv, include: { channel: true } });

    // Channel preferences
    const channelCounts = new Map<string, number>();
    conversations.forEach((c: { channel?: { type?: string }, createdAt: Date }) => {
      const type = c.channel?.type || 'unknown';
      channelCounts.set(type, (channelCounts.get(type) || 0) + 1);
    });
    const total = Array.from(channelCounts.values()).reduce((s, v) => s + v, 0) || 1;
    const channelPreference = Array.from(channelCounts.entries()).map(([channel, count]) => ({ channel, percentage: Math.round(count / total * 100) }));

    // Peak hours
    const byHour: number[] = new Array(24).fill(0);
    conversations.forEach((c: { createdAt: Date }) => { const h = new Date(c.createdAt).getHours(); byHour[h] += 1; });
    const peakHours = byHour.map((interactions, hour) => ({ hour, interactions })).filter(h => h.interactions > 0).sort((a,b)=>b.interactions-a.interactions).slice(0, 6);

    return {
      interactionPatterns: {
        preferredChannels: channelPreference,
        peakHours,
        responseTimePreferences: { immediate: 0, within1Hour: 0, within24Hours: 0, flexible: 0 },
      },
      engagementMetrics: {
        averageSessionDuration: 0,
        pagesPerSession: 0,
        bounceRate: 0,
        returnVisitorRate: 0,
      },
      conversionFunnels: { awareness: 0, consideration: 0, purchase: 0, retention: 0, advocacy: 0 },
      cohortAnalysis: [],
    };
  }

  async getPredictiveInsights(tenantId: string) {
    try {
      // Calculate time range (last 90 days)
      const to = new Date();
      const from = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const timeRange = { from, to };

      // Get insights from predictive analytics services
      const [churnInsights, salesInsights, journeyAnalytics] = await Promise.all([
        this.churnPreventionService?.getChurnPreventionInsights(tenantId, timeRange).catch((err) => {
          this.logger.warn('Failed to get churn prevention insights:', err);
          return null;
        }),
        this.salesOptimizationService?.getSalesOptimizationInsights(tenantId, timeRange).catch((err) => {
          this.logger.warn('Failed to get sales optimization insights:', err);
          return null;
        }),
        this.journeyService?.getJourneyAnalytics(tenantId, timeRange).catch((err) => {
          this.logger.warn('Failed to get journey analytics:', err);
          return null;
        }),
    ]);

      // Map churn prediction data
      const churnPrediction = churnInsights
        ? {
            highRisk: churnInsights.riskDistribution.high + churnInsights.riskDistribution.critical,
            mediumRisk: churnInsights.riskDistribution.medium,
            lowRisk: churnInsights.riskDistribution.low,
            predictedRate: churnInsights.totalAtRisk > 0
              ? Number(((churnInsights.totalAtRisk / (churnInsights.totalAtRisk + churnInsights.riskDistribution.low)) * 100).toFixed(1))
              : 0,
          }
        : {
            // Fallback to simple calculation if services are not available
            highRisk: 0,
            mediumRisk: 0,
            lowRisk: 0,
            predictedRate: 0,
          };

      // Calculate lifetime value forecast from sales insights
      const totalCustomers = await this.prisma.customer.count({ where: { tenantId } }).catch(() => 0);
      const avgDealValue = salesInsights?.overallPerformance?.avgDealSize || 0;
      const winRate = salesInsights?.overallPerformance?.winRate || 0;
      
      // Estimate next quarter and next year revenue
      const dealsPerQuarter = Math.round(totalCustomers * 0.1); // Assume 10% of customers make deals per quarter
      const dealsPerYear = dealsPerQuarter * 4;
      
      const nextQuarter = Math.round(dealsPerQuarter * avgDealValue * winRate);
      const nextYear = Math.round(dealsPerYear * avgDealValue * winRate);
      const currentYear = nextQuarter * 4; // Rough estimate
      const growth = currentYear > 0 ? Number((((nextYear - currentYear) / currentYear) * 100).toFixed(1)) : 0;

    const lifetimeValueForecast = {
        nextQuarter,
        nextYear,
        growth: Math.max(0, growth),
      };

      // Map upsell opportunities from sales optimization insights
      // Try to get customer segments for better upsell opportunities
      let upsellOpportunities: Array<{ segment: string; potential: number; probability: number; customers: number }> = [];
      
      if (salesInsights?.improvementOpportunities && salesInsights.improvementOpportunities.length > 0) {
        // Map improvement opportunities to upsell opportunities
        upsellOpportunities = salesInsights.improvementOpportunities.slice(0, 5).map((opp: any) => {
          // Estimate customer count based on opportunity area
          const estimatedCustomers = Math.round(totalCustomers * 0.1); // Rough estimate
          const potential = opp.potentialValue || opp.improvement || 0;
          // Calculate probability based on improvement percentage
          const improvementPercent = opp.currentValue > 0 
            ? ((opp.potentialValue - opp.currentValue) / opp.currentValue) * 100 
            : 50;
          const probability = Math.min(100, Math.max(50, Math.round(improvementPercent)));
          
          return {
            segment: opp.area || 'Upsell Opportunity',
            potential: Math.round(potential),
            probability,
            customers: estimatedCustomers,
          };
        });
      }
      
      // If no opportunities from sales insights, try to create from customer segments
      if (upsellOpportunities.length === 0) {
        try {
          const segments = await this.prisma.customerSegment.findMany({
            where: { tenantId },
            take: 3,
          });
          
          if (segments.length > 0) {
            upsellOpportunities = await Promise.all(
              segments.map(async (segment) => {
                const customerCount = await this.prisma.customerSegmentMember.count({
                  where: { segmentId: segment.id },
                }).catch(() => 0);
                
                // Estimate potential based on segment average value
                const avgValue = segment.averageValue || 0;
                const potential = Math.round(customerCount * avgValue * 0.2); // 20% upsell potential
                
                return {
                  segment: segment.name,
                  potential,
                  probability: 65, // Default probability
                  customers: customerCount,
                };
              })
            );
          }
        } catch (err) {
          this.logger.warn('Failed to get customer segments for upsell opportunities:', err);
        }
      }

      return {
        churnPrediction,
        lifetimeValueForecast,
        demandForecasting: {
          expectedTicketVolume: [],
          seasonalTrends: { q1: 1, q2: 1, q3: 1, q4: 1 },
        },
        upsellOpportunities,
      };
    } catch (error) {
      this.logger.error('Failed to get predictive insights:', error);
      // Return fallback data
      const totalCustomers = await this.prisma.customer.count({ where: { tenantId } }).catch(() => 0);
      return {
        churnPrediction: {
          highRisk: 0,
          mediumRisk: 0,
          lowRisk: totalCustomers,
          predictedRate: 0,
        },
        lifetimeValueForecast: {
      nextQuarter: 0,
      nextYear: 0,
          growth: 0,
        },
        demandForecasting: {
          expectedTicketVolume: [],
          seasonalTrends: { q1: 1, q2: 1, q3: 1, q4: 1 },
        },
        upsellOpportunities: [],
      };
    }
  }

  async getTrends(tenantId: string, timeframe: '7d' | '30d' | '90d' | '1y' = '30d') {
    const now = new Date();
    type Window = { start: Date; end: Date; label: string };
    const windows: Window[] = [];
    if (timeframe === '1y') {
      const monthLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const start = new Date(d.getFullYear(), d.getMonth(), 1);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        windows.push({ start, end, label: monthLabels[start.getMonth()] });
      }
    } else if (timeframe === '90d') {
      const monthLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      for (let i = 2; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const start = new Date(d.getFullYear(), d.getMonth(), 1);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        windows.push({ start, end, label: monthLabels[start.getMonth()] });
      }
    } else if ( timeframe === '30d') {
      for (let i = 3; i >= 0; i--) {
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7);
        const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 7);
        windows.push({ start, end, label: `W${4 - i}` });
      }
    } else {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
        windows.push({ start, end, label: `${start.getMonth() + 1}/${start.getDate()}` });
      }
    }

    const csatTrend: Array<{ label: string; value: number }> = [];
    const clvTrend: Array<{ label: string; value: number }> = [];

    for (const w of windows) {
      // CSAT: average survey rating 1..5 -> 0..100
      try {
        const agg = await (this.prisma as unknown as { customerSatisfactionSurvey?: { aggregate: (args: { where: Record<string, unknown>; _avg: { rating: boolean } }) => Promise<{ _avg: { rating: number | null } }> } }).customerSatisfactionSurvey?.aggregate?.({
          where: { tenantId, createdAt: { gte: w.start, lt: w.end } },
          _avg: { rating: true },
        }).catch((): { _avg: { rating: number | null } } => ({ _avg: { rating: null } }));
        const rating = Number(agg?._avg?.rating || 0);
        const score = rating > 0 ? Math.round(((rating - 1) / 4) * 100) : 0;
        csatTrend.push({ label: w.label, value: score });
      } catch { csatTrend.push({ label: w.label, value: 0 }); }

      // CLV: total revenue in window (sum paymentIntent.amount) in currency units
      try {
        const payAgg = await this.prisma.paymentIntent.aggregate({
          where: { tenantId, createdAt: { gte: w.start, lt: w.end }, status: { in: ['succeeded','processing','requires_capture'] } },
          _sum: { amount: true },
        });
        const amount = (payAgg._sum.amount || 0) / 100;
        clvTrend.push({ label: w.label, value: Math.round(amount) });
      } catch { clvTrend.push({ label: w.label, value: 0 }); }
    }

    return { csatTrend, clvTrend };
  }

  async getCustomer360Profile(customerId: string, tenantId: string) {
    try {
      const [
        customer,
        healthScore,
        lifetimeValue,
        journey,
        segments,
        relationships,
        interactions,
        tickets,
        conversations
      ] = await Promise.all([
        this.getCustomerProfile(customerId, tenantId),
        this.calculateHealthScore(customerId, tenantId),
        this.calculateLifetimeValue(customerId, tenantId),
        this.getCustomerJourney(customerId, tenantId),
        this.getCustomerSegments(customerId, tenantId),
        this.getCustomerRelationships(customerId, tenantId),
        this.getRecentInteractions(customerId, tenantId),
        this.getCustomerTickets(customerId, tenantId),
        this.getCustomerConversations(customerId, tenantId)
      ]);

      return {
        customer,
        healthScore,
        lifetimeValue,
        journey,
        segments,
        relationships,
        interactions,
        tickets,
        conversations,
        insights: await this.generateCustomerInsights(customerId, tenantId)
      };
    } catch (error) {
      this.logger.error(`Failed to get Customer 360 profile for ${customerId}:`, error);
      throw error;
    }
  }
  
  async getCustomerInsights(customerId: string, tenantId: string) {
    return this.generateCustomerInsights(customerId, tenantId);
  }

  async calculateHealthScore(customerId: string, tenantId: string): Promise<CustomerHealthScore> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      // Get customer metrics
      const [ticketMetrics, satisfactionMetrics, engagementMetrics] = await Promise.all([
        this.prisma.ticket.aggregate({
          where: {
            customerId,
            tenantId,
            createdAt: { gte: thirtyDaysAgo }
          },
          _count: { id: true },
          _avg: {
            firstResponseTime: true,
            resolutionTime: true
          }
        }),
      (this.prisma as unknown as { customerSatisfactionSurvey: { aggregate: (args: { where: Record<string, unknown>; _avg: { rating: boolean } }) => Promise<{ _avg: { rating: number | null } }> } }).customerSatisfactionSurvey.aggregate({
          where: {
            customerId,
            tenantId,
            createdAt: { gte: thirtyDaysAgo }
          },
          _avg: { rating: true }
        }),
        this.prisma.conversation.aggregate({
          where: {
            customerId,
            tenantId,
            createdAt: { gte: thirtyDaysAgo }
          },
          _count: { id: true }
        })
      ]);

      // Calculate individual factor scores (0-100)
      const ticketVolume = Math.max(0, 100 - (ticketMetrics._count.id * 10)); // Fewer tickets = better
      // Derive response time score from average first response and resolution times (minutes)
      const avgFirstResponse = ticketMetrics._avg.firstResponseTime ?? undefined;
      const avgResolution = ticketMetrics._avg.resolutionTime ?? undefined;
      const scaleToScore = (val: number | undefined, good: number, bad: number) => {
        if (val === undefined || val === null) return undefined as unknown as number;
        if (val <= good) return 100;
        if (val >= bad) return 0;
        return Math.round(100 - ((val - good) / (bad - good)) * 100);
      };
      const firstResponseScore = scaleToScore(avgFirstResponse, 15, 240); // 15m ideal, 4h poor
      const resolutionScore = scaleToScore(avgResolution, 240, 1440); // 4h ideal, 24h poor
      const responseTime = Math.round(
        ((firstResponseScore ?? 85) * 0.6) +
        ((resolutionScore ?? 85) * 0.4)
      );
      const satisfaction = (satisfactionMetrics._avg.rating || 3) * 20; // Convert 1-5 to 0-100
      const engagement = Math.min(100, engagementMetrics._count.id * 5); // More conversations = better engagement
      
      // Calculate churn risk based on patterns
      const churnRisk = await this.calculateChurnRisk(customerId, tenantId);

      // Weighted overall score
      const score = Math.round(
        (ticketVolume * 0.2) +
        (responseTime * 0.2) +
        (satisfaction * 0.3) +
        (engagement * 0.2) +
        ((100 - churnRisk) * 0.1)
      );

      // Determine risk level
      let riskLevel: 'low' | 'medium' | 'high' | 'critical';
      if (score >= 80) riskLevel = 'low';
      else if (score >= 60) riskLevel = 'medium';
      else if (score >= 40) riskLevel = 'high';
      else riskLevel = 'critical';

      // Generate recommendations
      const recommendations = this.generateHealthRecommendations({
        ticketVolume,
        satisfaction,
        engagement,
        churnRisk
      });

      return {
        score,
        factors: {
          ticketVolume,
          responseTime,
          satisfaction,
          engagement,
          churnRisk
        },
        riskLevel,
        recommendations
      };
    } catch (error) {
      this.logger.error(`Failed to calculate health score for customer ${customerId}:`, error);
      throw error;
    }
  }

  async calculateLifetimeValue(customerId: string, tenantId: string): Promise<CustomerLifetimeValue> {
    try {
      // Use payment intents as revenue proxy
      const customer = await this.prisma.customer.findFirst({ where: { id: customerId, tenantId } });
      if (!customer) throw new Error('Customer not found');

      const [aggAll, recentCount] = await Promise.all([
        this.prisma.paymentIntent.aggregate({
          where: { customerId, tenantId, status: { in: ['succeeded', 'processing', 'requires_capture'] } },
          _sum: { amount: true },
          _count: { id: true }
        }),
        this.prisma.paymentIntent.count({
          where: { customerId, tenantId, createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }, status: { in: ['succeeded', 'processing', 'requires_capture'] } }
        })
      ]);

      const totalValue = (aggAll._sum.amount || 0) / 100; // cents -> currency
      const orderCount = aggAll._count.id || 0;
      const averageOrderValue = orderCount > 0 ? totalValue / orderCount : 0;
      const firstDate = customer.createdAt;
      const customerLifespan = Math.max(1, Math.ceil((Date.now() - firstDate.getTime()) / (30 * 24 * 60 * 60 * 1000)));
      const purchaseFrequency = orderCount / customerLifespan;
      const recentTrend = recentCount > Math.max(1, orderCount / Math.max(1, customerLifespan / 3)) ? 1.1 : 0.9;
      const predictedMonthlyValue = averageOrderValue * purchaseFrequency * recentTrend;
      const predictedLifespan = 24;
      const predictedValue = predictedMonthlyValue * predictedLifespan;
      const profitMargin = 0.3;

      return {
        totalValue,
        predictedValue,
        averageOrderValue,
        purchaseFrequency,
        customerLifespan,
        profitMargin
      };
    } catch (error) {
      this.logger.error(`Failed to calculate lifetime value for customer ${customerId}:`, error);
      throw error;
    }
  }

  async getCustomerJourney(customerId: string, tenantId: string): Promise<CustomerJourney> {
    try {
      // Get all customer touchpoints
      const [conversations, tickets, orders, surveys] = await Promise.all([
        this.prisma.conversation.findMany({
          where: { customerId, tenantId },
          include: { channel: true, messages: true },
          orderBy: { createdAt: 'asc' }
        }),
        this.prisma.ticket.findMany({
          where: { customerId, tenantId },
          include: { channel: true, aiAnalysis: true },
          orderBy: { createdAt: 'asc' }
        }),
        // Treat succeeded payments as purchases; include processing/requires_capture as attempts
        this.prisma.paymentIntent.findMany({
          where: { customerId, tenantId, status: { in: ['succeeded', 'processing', 'requires_capture'] } },
          orderBy: { createdAt: 'asc' },
          select: { id: true, createdAt: true, amount: true, status: true }
        }),
        (this.prisma as any).customerSatisfactionSurvey?.findMany?.({
          where: { tenantId, customerId },
          orderBy: { createdAt: 'asc' },
          select: { id: true, createdAt: true, respondedAt: true, channel: true, status: true, rating: true }
        }).catch(() => [] as Array<{ id: string; createdAt: Date; respondedAt?: Date | null; channel?: string | null; status?: string | null; rating?: number | null }>)
      ]);

      // Build touchpoints timeline
      type Touchpoint = { id: string; type: 'email' | 'whatsapp' | 'instagram' | 'web' | 'phone'; timestamp: Date; channel: string; interaction: string; outcome: string; sentiment?: string };
      const mapChannelType = (t: string): Touchpoint['type'] => {
        switch ((t || '').toLowerCase()) {
          case 'email': return 'email';
          case 'whatsapp': return 'whatsapp';
          case 'instagram': return 'instagram';
          case 'phone': return 'phone';
          default: return 'web';
        }
      };
      const touchpoints: Touchpoint[] = [];
      
      // Add conversation touchpoints
      (conversations as ConversationLite[]).forEach((conv) => {
        touchpoints.push({
          id: conv.id,
          type: mapChannelType(conv.channel.type),
          timestamp: conv.createdAt,
          channel: conv.channel.name,
          interaction: 'conversation',
          outcome: conv.status || 'ongoing'
        });
      });

      // Add ticket touchpoints
      (tickets as TicketLite[]).forEach((ticket) => {
        touchpoints.push({
          id: ticket.id,
          type: mapChannelType(ticket.channel.type),
          timestamp: ticket.createdAt,
          channel: ticket.channel.name,
          interaction: 'support_ticket',
          outcome: ticket.status,
          sentiment: (() => {
            const s = ticket.aiAnalysis?.sentiment as unknown;
            if (!s) return undefined;
            if (typeof s === 'string') return s;
            if (typeof s === 'object' && s && 'label' in (s as Record<string, unknown>)) return String((s as Record<string, unknown>).label);
            return undefined;
          })()
          
        });
      });

      // Add SLA breach touchpoints (if any) for tickets
      try {
        const ticketIds = (tickets as TicketLite[]).map((t) => t.id);
        if (ticketIds.length) {
          const slaItems = await (this.prisma as any).sLAInstance?.findMany?.({
            where: { ticketId: { in: ticketIds } },
            select: { ticketId: true, status: true, resolutionDue: true, lastEscalatedAt: true }
          }).catch(() => [] as Array<{ ticketId: string; status: string; resolutionDue: Date | null; lastEscalatedAt: Date | null }>);
          for (const s of slaItems) {
            if (!s) continue;
            if (String(s.status || '').toLowerCase() === 'breached') {
              const timestamp = s.lastEscalatedAt || s.resolutionDue || new Date();
              touchpoints.push({
                id: `${s.ticketId}:sla_breach`,
                type: 'web',
                timestamp,
                channel: 'SLA',
                interaction: 'sla_breach',
                outcome: 'breached'
              } as unknown as Touchpoint);
            }
          }
        }
      } catch {
        // ignore SLA enrich failures
      }

      // Sort touchpoints by timestamp
      touchpoints.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      // Add survey touchpoints (after sorting base items to keep order stable)
      try {
        const surveyRows = (surveys || []) as Array<{ id: string; createdAt: Date; respondedAt?: Date | null; channel?: string | null; status?: string | null; rating?: number | null }>;
        for (const s of surveyRows) {
          const ch = (s.channel || 'web').toString().toLowerCase();
          const channelLabel = ch === 'email' || ch === 'whatsapp' || ch === 'sms' ? ch : 'web';
          // sent
          touchpoints.push({
            id: `${s.id}:survey_sent`,
            type: channelLabel as any,
            timestamp: s.createdAt,
            channel: (channelLabel as string).toUpperCase(),
            interaction: 'survey_sent',
            outcome: String(s.status || 'sent')
          } as any);
          // responded
          if (s.respondedAt) {
            touchpoints.push({
              id: `${s.id}:survey_response`,
              type: channelLabel as any,
              timestamp: s.respondedAt,
              channel: (channelLabel as string).toUpperCase(),
              interaction: 'survey_response',
              outcome: s.rating != null ? `rating_${Math.round(Number(s.rating))}` : 'responded'
            } as any);
          }
        }
        // Re-sort including surveys
        touchpoints.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      } catch {
        // ignore survey enrich failures
      }

      // Identify customer journey stages (use orders for purchase signal)
      const stages = this.identifyJourneyStages(
        touchpoints,
        (orders as Array<{ createdAt: Date }>).map((o) => ({ createdAt: o.createdAt }))
      );

      // Enrich touchpoints with stage information
      touchpoints.forEach((tp) => {
        const stage = this.determineStageForTouchpoint(tp.timestamp, stages);
        (tp as any).metadata = { ...(tp as any).metadata, stage };
      });

      // Identify conversion events from successful orders
      const conversionEvents: Array<{ event: string; timestamp: Date; value: number; attribution: string[] }> = (orders || [])
        .filter((o: { status: string }) => o.status === 'succeeded')
        .map((o: { id: string; createdAt: Date; amount: number }) => ({
          event: 'purchase',
          timestamp: o.createdAt,
          value: Math.round((Number(o.amount || 0) / 100) * 100) / 100,
          // Simple last-touch attribution using latest prior touchpoint channel
          attribution: (() => {
            const prior = [...touchpoints].filter(tp => tp.timestamp <= o.createdAt).slice(-3);
            const channels = Array.from(new Set(prior.map((p) => p.type))).slice(-3);
            return channels.length ? channels : ['unknown'];
          })()
        }));

      return {
        touchpoints,
        stages,
        conversionEvents
      };
    } catch (error) {
      this.logger.error(`Failed to get customer journey for ${customerId}:`, error);
      throw error;
    }
  }

  async getCustomerSegments(customerId: string, tenantId: string): Promise<CustomerSegment[]> {
    try {
      const customer = await this.prisma.customer.findFirst({ where: { id: customerId, tenantId } });
      if (!customer) return [];

      const segments: CustomerSegment[] = [];

      // Calculate customer metrics via aggregates
      const [spentAgg, ticketCount, conversationCount] = await Promise.all([
        this.prisma.paymentIntent.aggregate({ where: { customerId, tenantId, status: { in: ['succeeded', 'processing', 'requires_capture'] } }, _sum: { amount: true } }),
        this.prisma.ticket.count({ where: { customerId, tenantId } }),
        this.prisma.conversation.count({ where: { customerId, tenantId } }),
      ]);
      const totalSpent = (spentAgg._sum.amount || 0) / 100;
      const daysSinceFirstOrder = Math.floor((Date.now() - customer.createdAt.getTime()) / (24 * 60 * 60 * 1000));

      // VIP Customer Segment
      if (totalSpent > 10000 || customer.tags?.includes('vip')) {
        segments.push({
          id: 'vip',
          name: 'VIP Customer',
          description: 'High-value customers requiring premium support',
          criteria: { totalSpent: '>10000', tags: 'vip' },
          customerCount: await this.getSegmentCount('vip', tenantId),
          averageValue: 15000
        });
      }

      // High Support Volume Segment
      if (ticketCount > 10) {
        segments.push({
          id: 'high-support',
          name: 'High Support Volume',
          description: 'Customers requiring frequent support attention',
          criteria: { ticketCount: '>10' },
          customerCount: await this.getSegmentCount('high-support', tenantId),
          averageValue: 5000
        });
      }

      // New Customer Segment
      if (daysSinceFirstOrder < 30) {
        segments.push({
          id: 'new-customer',
          name: 'New Customer',
          description: 'Recently acquired customers in onboarding phase',
          criteria: { daysSinceFirstOrder: '<30' },
          customerCount: await this.getSegmentCount('new-customer', tenantId),
          averageValue: 2000
        });
      }

      // Engaged Customer Segment
      if (conversationCount > 5) {
        segments.push({
          id: 'engaged',
          name: 'Highly Engaged',
          description: 'Customers with frequent positive interactions',
          criteria: { conversationCount: '>5' },
          customerCount: await this.getSegmentCount('engaged', tenantId),
          averageValue: 7500
        });
      }

      return segments;
    } catch (error) {
      this.logger.error(`Failed to get customer segments for ${customerId}:`, error);
      return [];
    }
  }

  async getCustomerRelationships(customerId: string, tenantId: string) {
    try {
      await this.prisma.customer.findFirst({ where: { id: customerId, tenantId } });
      return {
        company: null,
        colleagues: [],
        referrals: [],
        accountHierarchy: await this.buildAccountHierarchy(customerId, tenantId)
      };
    } catch (error) {
      this.logger.error(`Failed to get customer relationships for ${customerId}:`, error);
      return null;
    }
  }

  // Private helper methods
  private async calculateChurnRisk(customerId: string, tenantId: string): Promise<number> {
    // Data windows
    const now = new Date();
    const last30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const last90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const last180 = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

    // 1) Recency: days since last interaction (conversation or ticket)
    const [lastConv, lastTicket] = await Promise.all([
      this.prisma.conversation.findFirst({ where: { customerId, tenantId }, select: { createdAt: true, updatedAt: true }, orderBy: { createdAt: 'desc' } }),
      this.prisma.ticket.findFirst({ where: { customerId, tenantId }, select: { createdAt: true, updatedAt: true }, orderBy: { createdAt: 'desc' } }),
    ]);
    const lastTouched = [lastConv?.updatedAt || lastConv?.createdAt, lastTicket?.updatedAt || lastTicket?.createdAt]
      .filter(Boolean)
      .map((d) => (d as Date).getTime());
    const lastTouchMs = lastTouched.length ? Math.max(...lastTouched) : undefined;
    const daysSinceLast = lastTouchMs ? Math.max(0, Math.floor((now.getTime() - lastTouchMs) / (1000 * 60 * 60 * 24))) : 365;
    const recencyRisk = Math.min(100, Math.round((daysSinceLast / 90) * 100)); // 0 days => 0 risk; 90+ => ~100

    // 2) Open tickets pressure
    const openTickets = await this.prisma.ticket.count({
      where: { customerId, tenantId, status: { in: ['open', 'waiting', 'in_progress', 'pending'] } },
    });
    const openTicketsRisk = Math.min(100, openTickets * 12); // 0=>0, 5=>60, 8+=>~96

    // 3) Satisfaction (last 180d avg rating 1..5)
    const csatAgg = await (this.prisma as unknown as { customerSatisfactionSurvey?: { aggregate: (args: { where: Record<string, unknown>; _avg: { rating: boolean } }) => Promise<{ _avg: { rating: number | null } }> } }).customerSatisfactionSurvey?.aggregate?.({
      where: { customerId, tenantId, createdAt: { gte: last180 } },
      _avg: { rating: true },
    }).catch((): { _avg: { rating: number | null } } => ({ _avg: { rating: null } }));
    const rating = Number(csatAgg?._avg?.rating || 0);
    const satisfactionRisk = rating > 0 ? Math.max(0, Math.min(100, Math.round(100 - ((rating - 1) / 4) * 100))) : 55; // 5★->0 risk, 1★->100, unknown ~55

    // 4) Engagement (conversations last 30d)
    const conv30 = await this.prisma.conversation.count({ where: { customerId, tenantId, createdAt: { gte: last30 } } });
    const engagementRisk = Math.max(10, Math.min(60, 60 - Math.min(conv30, 6) * 8)); // more conv => lower risk, cap 10..60

    // 5) Revenue activity (payments in last 90d)
    const pay90 = await this.prisma.paymentIntent.count({
      where: { customerId, tenantId, createdAt: { gte: last90 }, status: { in: ['succeeded', 'processing', 'requires_capture'] } },
    }).catch(() => 0);
    const paymentRisk = pay90 > 0 ? 10 : 30; // recent payments reduce risk

    // Weighted composite risk (0-100)
    const risk =
      recencyRisk * 0.35 +
      openTicketsRisk * 0.2 +
      satisfactionRisk * 0.25 +
      engagementRisk * 0.15 +
      paymentRisk * 0.05;

    return Math.max(0, Math.min(100, Math.round(risk)));
  }

  private generateHealthRecommendations(factors: { satisfaction: number; churnRisk: number; ticketVolume: number; engagement: number }): string[] {
    const recommendations = [];

    if (factors.satisfaction < 60) {
      recommendations.push('Schedule customer satisfaction survey');
      recommendations.push('Assign dedicated account manager');
    }

    if (factors.churnRisk > 70) {
      recommendations.push('Implement retention campaign');
      recommendations.push('Offer loyalty incentives');
    }

    if (factors.ticketVolume < 50) {
      recommendations.push('Proactive outreach to prevent issues');
      recommendations.push('Provide additional training resources');
    }

    if (factors.engagement < 40) {
      recommendations.push('Increase engagement through personalized content');
      recommendations.push('Schedule regular check-in calls');
    }

    return recommendations;
  }

  private identifyJourneyStages(
    touchpoints: Array<{ timestamp: Date; interaction: string; type?: string }>,
    orders: Array<{ createdAt: Date }>
  ) {
    type StageKey = 'awareness' | 'consideration' | 'purchase' | 'retention' | 'advocacy'
    const stageKeys: StageKey[] = ['awareness', 'consideration', 'purchase', 'retention', 'advocacy']

    const firstPurchaseAt: Date | undefined = orders && orders.length ? new Date(orders[0].createdAt) : undefined

    // Map a touchpoint to a stage using simple heuristics and purchase boundary
    function mapToStage(tp: { timestamp: Date; interaction: string; type?: string }): StageKey {
      const kind = String(tp.type || '').toLowerCase()
      const isPrePurchase = !firstPurchaseAt || tp.timestamp < firstPurchaseAt
      if (kind === 'email' || kind === 'web' || kind === 'marketing' || kind === 'social' || kind === 'instagram' || kind === 'whatsapp') {
        return isPrePurchase ? 'awareness' : 'retention'
      }
      if (kind === 'phone' || tp.interaction === 'conversation' || kind === 'call' || kind === 'meeting') {
        return isPrePurchase ? 'consideration' : 'retention'
      }
      if (tp.interaction === 'support_ticket' || kind === 'support') {
        return 'retention'
      }
      return isPrePurchase ? 'awareness' : 'retention'
    }

    const stageBuckets = new Map<StageKey, { first?: Date; last?: Date; count: number }>()
    for (const key of stageKeys) stageBuckets.set(key, { count: 0 })

    for (const tp of touchpoints) {
      const stage = mapToStage(tp)
      const bucket = stageBuckets.get(stage)!
      bucket.count += 1
      if (!bucket.first || tp.timestamp < bucket.first) bucket.first = tp.timestamp
      if (!bucket.last || tp.timestamp > bucket.last) bucket.last = tp.timestamp
    }

    // Purchase stage is taken from first succeeded order if present
    if (firstPurchaseAt) {
      const purchaseBucket = stageBuckets.get('purchase')!
      purchaseBucket.count = (orders || []).length
      purchaseBucket.first = firstPurchaseAt
      purchaseBucket.last = firstPurchaseAt
    }

    const result = stageKeys
      .map<{
        stage: StageKey; entryDate: Date; duration: number; touchpointCount: number
      }>((key) => {
        const b = stageBuckets.get(key)!
        const entry = b.first || (touchpoints[0]?.timestamp || new Date())
        const duration = b.first && b.last ? Math.max(0, b.last.getTime() - b.first.getTime()) : 0
        return { stage: key, entryDate: entry, duration, touchpointCount: b.count }
      })
      // Keep stable order but only include stages that have either activity or are purchase when there is an order
      .filter((row) => row.touchpointCount > 0 || row.stage === 'purchase')

    return result
  }

  // Attribution helper omitted (unused)

  private async getSegmentCount(segmentId: string, tenantId: string): Promise<number> {
    try {
      const segment = await this.prisma.customerSegment.findFirst({ where: { id: segmentId, tenantId }, select: { id: true } });
      if (!segment) return 0;
      return await this.prisma.customerSegmentMembership.count({ where: { segmentId } });
    } catch {
      return 0;
    }
  }

  private async buildAccountHierarchy(customerId: string, tenantId: string) {
    try {
      const customer = await this.prisma.customer.findFirst({ where: { id: customerId, tenantId }, select: { id: true, firstName: true, lastName: true, email: true, company: true, createdAt: true } });
      if (!customer) return { parent: null, children: [], level: 0 };

      const company = customer.company?.trim();
      if (!company) return { parent: null, children: [], level: 0 };

      const companyCustomers = await this.prisma.customer.findMany({
        where: { tenantId, company: { equals: company } },
        select: { id: true, firstName: true, lastName: true, email: true, createdAt: true },
        orderBy: { createdAt: 'asc' }
      });

      if (!companyCustomers.length) return { parent: null, children: [], level: 0 };

      const parent = companyCustomers[0];
      const children = companyCustomers.slice(1).map((c) => ({ id: c.id, name: `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.email || c.id, email: c.email }));
      const level = customer.id === parent.id ? 0 : 1;

      return {
        parent: { id: parent.id, name: `${parent.firstName || ''} ${parent.lastName || ''}`.trim() || parent.email || parent.id, email: parent.email },
        children,
        level,
      };
    } catch {
      return { parent: null, children: [], level: 0 };
    }
  }

  private async getCustomerProfile(customerId: string, tenantId: string) {
    return this.prisma.customer.findFirst({ where: { id: customerId, tenantId } });
  }

  private async getRecentInteractions(customerId: string, tenantId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    return this.prisma.conversation.findMany({
      where: {
        customerId,
        tenantId,
        createdAt: { gte: thirtyDaysAgo }
      },
      include: {
        channel: true,
        messages: { take: 1, orderBy: { createdAt: 'desc' } }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
  }

  private async getCustomerTickets(customerId: string, tenantId: string) {
    return this.prisma.ticket.findMany({
      where: { customerId, tenantId },
      include: {
        assignedAgent: true,
        channel: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
  }

  private async getCustomerConversations(customerId: string, tenantId: string) {
    return this.prisma.conversation.findMany({
      where: { customerId, tenantId },
      include: {
        channel: true,
        messages: { take: 1, orderBy: { createdAt: 'desc' } }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
  }

  private async generateCustomerInsights(customerId: string, tenantId: string) {
    // Simple heuristic insights with sentiment, behavior, explanation, confidence
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [conv30, ticket30, resolved30, recentMessages] = await Promise.all([
      this.prisma.conversation.count({ where: { customerId, tenantId, createdAt: { gte: thirtyDaysAgo } } }).catch(() => 0),
      this.prisma.ticket.count({ where: { customerId, tenantId, createdAt: { gte: thirtyDaysAgo } } }).catch(() => 0),
      this.prisma.ticket.count({ where: { customerId, tenantId, status: { in: ['resolved','closed'] }, updatedAt: { gte: thirtyDaysAgo } } }).catch(() => 0),
      this.prisma.message.findMany({ where: { conversation: { customerId, tenantId, createdAt: { gte: thirtyDaysAgo } } }, select: { content: true }, orderBy: { createdAt: 'desc' }, take: 100 }).catch(() => []),
    ]);

    const keyInsights: string[] = [];
    if (conv30 > 5) keyInsights.push('Customer shows high engagement in the last 30 days');
    if (ticket30 > 3) keyInsights.push('Recent increase in support ticket volume');
    if (resolved30 >= ticket30 && ticket30 > 0) keyInsights.push('High resolution throughput recently');
    if (keyInsights.length === 0) keyInsights.push('Stable engagement and support volume');

    const riskFactors: string[] = [];
    if (ticket30 > 8) riskFactors.push('Elevated support demand');
    if (conv30 === 0) riskFactors.push('No recent interactions');

    const opportunities: string[] = ['Upsell premium features', 'Cross-sell complementary products'];
    const nextBestActions: string[] = ['Schedule quarterly business review', 'Send personalized product recommendations'];

    // Naive sentiment heuristic from recent messages
    const text = (recentMessages as Array<{ content: string }>).map(m => m.content).join('\n').toLowerCase();
    const negatives = ['angry','upset','frustrated','bad','terrible','cancel','refund','complain','issue','problem','slow'];
    const positives = ['great','good','thanks','amazing','love','awesome','perfect','fast','resolved','helpful'];
    const negHits = negatives.reduce((acc, w) => acc + (text.split(w).length - 1), 0);
    const posHits = positives.reduce((acc, w) => acc + (text.split(w).length - 1), 0);
    const rawScore = posHits - negHits; // could be negative
    const sentimentScore = Math.max(0, Math.min(1, 0.5 + Math.tanh(rawScore / 5) * 0.5));
    const sentimentOverall = sentimentScore > 0.6 ? 'positive' : sentimentScore < 0.4 ? 'negative' : 'neutral';

    // Simple trend proxy: compare first half vs second half of messages
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (recentMessages.length > 6) {
      const half = Math.floor(recentMessages.length / 2);
      const first = (recentMessages.slice(0, half) as Array<{ content: string }>).map(m => String(m.content || '').toLowerCase()).join(' ');
      const second = (recentMessages.slice(half) as Array<{ content: string }>).map(m => String(m.content || '').toLowerCase()).join(' ');
      const fScore = positives.reduce((a,w)=>a+(first.split(w).length-1),0) - negatives.reduce((a,w)=>a+(first.split(w).length-1),0);
      const sScore = positives.reduce((a,w)=>a+(second.split(w).length-1),0) - negatives.reduce((a,w)=>a+(second.split(w).length-1),0);
      if (sScore > fScore + 1) trend = 'improving';
      else if (sScore < fScore - 1) trend = 'declining';
    }

    // Behavioral analysis (very simple): counts and channel preference from conversations
    const behavioralAnalysis = {
      recentActivity: [
        { type: 'conversation', count: conv30 },
        { type: 'ticket', count: ticket30 },
      ],
      channelPreference: await this.prisma.conversation.groupBy({
        by: ['channelId'],
        where: { customerId, tenantId, createdAt: { gte: thirtyDaysAgo } },
        _count: { channelId: true },
      }).then(async (rows: Array<{ channelId: string; _count: { channelId: number } }>) => {
        const total = rows.reduce((s, r) => s + (r._count.channelId || 0), 0) || 1;
        const channels = await this.prisma.channel.findMany({ where: { id: { in: rows.map(r => r.channelId) } }, select: { id: true, type: true } });
        const idToType = new Map(channels.map(c => [c.id, c.type] as const));
        return rows.map(r => ({ channel: idToType.get(r.channelId) || 'unknown', percentage: Math.round(((r._count.channelId || 0) / total) * 100) }));
      }).catch((): Array<{ channel: string; percentage: number }> => []),
    };

    const explanation = 'Insights derived from recent ticket and conversation patterns with lightweight sentiment heuristics.';
    // Confidence: more data => higher confidence
    const totalSignals = (recentMessages?.length || 0) + conv30 + ticket30;
    const confidence = Math.max(0.3, Math.min(0.95, 0.4 + Math.log10(1 + totalSignals) / 2));

    return {
      keyInsights,
      riskFactors,
      opportunities,
      nextBestActions,
      sentimentAnalysis: { overall: sentimentOverall, score: Number(sentimentScore.toFixed(2)), trend },
      behavioralAnalysis,
      explanation,
      confidence: Number(confidence.toFixed(2)),
    };
  }

  private determineStageForTouchpoint(
    timestamp: Date,
    stages: Array<{ stage: string; entryDate: Date; duration: number; touchpointCount: number }>
  ): string {
    // Find the stage that this touchpoint belongs to based on timestamp
    for (let i = stages.length - 1; i >= 0; i--) {
      const stage = stages[i];
      if (timestamp >= stage.entryDate) {
        return stage.stage;
      }
    }
    // If no stage found, default to the first stage or 'awareness'
    return stages.length > 0 ? stages[0].stage : 'awareness';
  }
}