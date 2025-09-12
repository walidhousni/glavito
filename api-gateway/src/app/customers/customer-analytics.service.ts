import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@glavito/shared-database';

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
    private readonly prisma: PrismaService
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

  async getAnalyticsDashboard(tenantId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const last30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalCustomers, newCustomersThisMonth, activeCustomers, payments] = await Promise.all([
      this.prisma.customer.count({ where: { tenantId } }),
      this.prisma.customer.count({ where: { tenantId, createdAt: { gte: startOfMonth } } }),
      this.prisma.conversation.groupBy({
        by: ['customerId'],
        where: { tenantId, createdAt: { gte: last30 } },
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

    return {
      overview: {
        totalCustomers,
        activeCustomers,
        newCustomersThisMonth,
        churnRate,
        averageLifetimeValue,
        customerSatisfactionScore: 0, // optional; compute when CSAT model is ready
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

    const whereBase: any = { tenantId, createdAt: { gte: since } };
    const whereConv = customerIds && customerIds.length ? { ...whereBase, customerId: { in: customerIds } } : whereBase;

    const conversations = await this.prisma.conversation.findMany({ where: whereConv, include: { channel: true } });

    // Channel preferences
    const channelCounts = new Map<string, number>();
    conversations.forEach((c) => {
      const type = (c.channel as any)?.type || 'unknown';
      channelCounts.set(type, (channelCounts.get(type) || 0) + 1);
    });
    const total = Array.from(channelCounts.values()).reduce((s, v) => s + v, 0) || 1;
    const channelPreference = Array.from(channelCounts.entries()).map(([channel, count]) => ({ channel, percentage: Math.round(count / total * 100) }));

    // Peak hours
    const byHour = new Array(24).fill(0);
    conversations.forEach((c) => { const h = new Date(c.createdAt).getHours(); byHour[h] += 1; });
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
    const last90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const [conv, tickets, customers] = await Promise.all([
      this.prisma.conversation.count({ where: { tenantId, createdAt: { gte: last90 } } }),
      this.prisma.ticket.count({ where: { tenantId, createdAt: { gte: last90 } } }),
      this.prisma.customer.count({ where: { tenantId } }),
    ]);

    const churnPrediction = {
      highRiskCustomers: Math.round(customers * 0.08),
      mediumRiskCustomers: Math.round(customers * 0.12),
      lowRiskCustomers: Math.max(0, customers - Math.round(customers * 0.2)),
      predictedChurnRate: Number(((tickets / Math.max(1, conv + tickets)) * 10).toFixed(1)),
      preventableChurn: Math.round(customers * 0.05),
    };

    const lifetimeValueForecast = {
      nextQuarter: 0,
      nextYear: 0,
      topCustomersPotential: 0,
      growthOpportunities: 0,
    };

    return { churnPrediction, lifetimeValueForecast, demandForecasting: { expectedTicketVolume: [], seasonalTrends: { q1: 1, q2: 1, q3: 1, q4: 1 } }, upsellOpportunities: [] };
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
        (this.prisma as any).customerSatisfactionSurvey.aggregate({
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
      const [conversations, tickets] = await Promise.all([
        this.prisma.conversation.findMany({
          where: { customerId, tenantId },
          include: { channel: true, messages: true },
          orderBy: { createdAt: 'asc' }
        }),
        this.prisma.ticket.findMany({
          where: { customerId, tenantId },
          include: { channel: true, aiAnalysis: true },
          orderBy: { createdAt: 'asc' }
        })
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
          sentiment: ticket.aiAnalysis?.sentiment ? String((ticket.aiAnalysis.sentiment as any).label || ticket.aiAnalysis.sentiment) : undefined
        });
      });

      // Sort touchpoints by timestamp
      touchpoints.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      // Identify customer journey stages
      const stages = this.identifyJourneyStages(touchpoints, []);

      // Identify conversion events
      const conversionEvents: Array<{ event: string; timestamp: Date; value: number; attribution: string[] }> = [];

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
    const csatAgg: any = await (this.prisma as any).customerSatisfactionSurvey?.aggregate?.({
      where: { customerId, tenantId, createdAt: { gte: last180 } },
      _avg: { rating: true },
    }).catch(() => ({ _avg: { rating: null } }));
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
    touchpoints: Array<{ timestamp: Date; interaction: string }>,
    orders: Array<{ createdAt: Date }>
  ) {
    const stages: Array<{ stage: 'awareness' | 'consideration' | 'purchase' | 'retention' | 'advocacy'; entryDate: Date; duration: number; touchpointCount: number }> = [];
    let currentStage = 'awareness';
    let stageStartDate = touchpoints[0]?.timestamp || new Date();

    // Simple stage identification logic
    touchpoints.forEach((touchpoint, index) => {
      if (touchpoint.interaction === 'purchase' && currentStage !== 'purchase') {
        // Close previous stage
        if (currentStage) {
          stages.push({
            stage: currentStage as 'awareness' | 'consideration' | 'purchase' | 'retention' | 'advocacy',
            entryDate: stageStartDate,
            duration: touchpoint.timestamp.getTime() - stageStartDate.getTime(),
            touchpointCount: index
          });
        }
        
        currentStage = 'purchase';
        stageStartDate = touchpoint.timestamp;
      }
    });

    // Add final stage
    if (Array.isArray(orders) && orders.length > 0) {
      stages.push({
        stage: 'retention',
        entryDate: orders[orders.length - 1].createdAt,
        duration: Date.now() - orders[orders.length - 1].createdAt.getTime(),
        touchpointCount: touchpoints.length - stages.reduce((sum, s) => sum + s.touchpointCount, 0)
      });
    }

    return stages;
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
}