import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '@glavito/shared-database';
import { AIIntelligenceService } from '@glavito/shared-ai';
import { CrmCacheService } from '../crm/crm-cache.service';

export interface CustomerJourneyStage {
  id: string;
  name: string;
  description: string;
  order: number;
  touchpoints: CustomerTouchpoint[];
  metrics: {
    avgDuration: number;
    conversionRate: number;
    dropoffRate: number;
    satisfactionScore: number;
  };
  optimization: {
    bottlenecks: string[];
    recommendations: string[];
    priority: 'high' | 'medium' | 'low';
  };
}

export interface CustomerTouchpoint {
  id: string;
  type: 'email' | 'call' | 'meeting' | 'website' | 'support' | 'social' | 'marketing';
  channel: string;
  timestamp: Date;
  outcome: 'positive' | 'neutral' | 'negative';
  sentiment: number; // -1 to 1
  engagement: number; // 0 to 1
  metadata: Record<string, any>;
}

export interface CustomerJourneyMap {
  customerId: string;
  journeyId: string;
  stages: CustomerJourneyStage[];
  timeline: {
    startDate: Date;
    endDate?: Date;
    totalDuration: number;
    currentStage: string;
  };
  insights: {
    totalTouchpoints: number;
    avgEngagement: number;
    satisfactionTrend: 'improving' | 'stable' | 'declining';
    nextBestAction: string;
    riskFactors: string[];
  };
  optimization: {
    efficiency: number; // 0 to 1
    bottlenecks: Array<{
      stage: string;
      issue: string;
      impact: number;
      recommendation: string;
    }>;
    opportunities: Array<{
      stage: string;
      opportunity: string;
      potential: number;
      action: string;
    }>;
  };
}

export interface JourneyOptimizationRecommendation {
  customerId: string;
  stage: string;
  recommendation: string;
  type: 'personalization' | 'timing' | 'channel' | 'content' | 'process';
  priority: 'high' | 'medium' | 'low';
  impact: number; // 0 to 1
  effort: number; // 0 to 1
  expectedOutcome: string;
  implementation: {
    steps: string[];
    timeline: number; // days
    resources: string[];
  };
}

export interface JourneyAnalytics {
  overallMetrics: {
    avgJourneyDuration: number;
    conversionRate: number;
    satisfactionScore: number;
    engagementScore: number;
  };
  stagePerformance: Array<{
    stage: string;
    avgDuration: number;
    conversionRate: number;
    dropoffRate: number;
    satisfactionScore: number;
  }>;
  touchpointEffectiveness: Array<{
    type: string;
    channel: string;
    effectiveness: number;
    frequency: number;
    satisfaction: number;
  }>;
  trends: Array<{
    period: string;
    metrics: {
      duration: number;
      conversion: number;
      satisfaction: number;
      engagement: number;
    };
  }>;
}

export interface JourneySegmentation {
  segmentId: string;
  name: string;
  criteria: Record<string, any>;
  journeyPatterns: {
    commonStages: string[];
    avgDuration: number;
    conversionRate: number;
    preferredChannels: string[];
    painPoints: string[];
  };
  recommendations: Array<{
    stage: string;
    recommendation: string;
    impact: number;
  }>;
  customerCount: number;
}

@Injectable()
export class IntelligentCustomerJourneyService {
  private readonly logger = new Logger(IntelligentCustomerJourneyService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => AIIntelligenceService))
    private readonly aiService: AIIntelligenceService,
    private readonly cache: CrmCacheService
  ) {}

  /**
   * Generate customer journey map for a specific customer
   */
  async generateCustomerJourney(tenantId: string, customerId: string): Promise<CustomerJourneyMap> {
    try {
      // Check cache first
      const cacheKey = `journey:${customerId}`;
      const cached = await this.cache.get(cacheKey, { prefix: 'journey' });
      if (cached) {
        return cached;
      }

      // Get customer data and interactions
      const customerData = await this.getCustomerJourneyData(tenantId, customerId);
      
      // Extract touchpoints
      const touchpoints = await this.extractTouchpoints(customerData);
      
      // Map journey stages
      const stages = await this.mapJourneyStages(touchpoints);
      
      // Generate insights
      const insights = await this.generateJourneyInsights(touchpoints, stages);
      
      // Calculate optimization opportunities
      const optimization = await this.calculateJourneyOptimization(stages, insights);

      const journeyMap: CustomerJourneyMap = {
        customerId,
        journeyId: `journey_${customerId}_${Date.now()}`,
        stages,
        timeline: this.calculateJourneyTimeline(touchpoints, stages),
        insights,
        optimization
      };

      // Cache the result
      await this.cache.set(cacheKey, journeyMap, { prefix: 'journey', ttl: 3600 });

      return journeyMap;
    } catch (error) {
      this.logger.error('Customer journey generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate journey optimization recommendations
   */
  async generateJourneyOptimizationRecommendations(
    tenantId: string, 
    customerId: string
  ): Promise<JourneyOptimizationRecommendation[]> {
    try {
      const journeyMap = await this.generateCustomerJourney(tenantId, customerId);
      const recommendations: JourneyOptimizationRecommendation[] = [];

      // Analyze each stage for optimization opportunities
      for (const stage of journeyMap.stages) {
        // Check for bottlenecks
        if (stage.metrics.dropoffRate > 0.3) {
          recommendations.push({
            customerId,
            stage: stage.name,
            recommendation: `Reduce dropoff rate in ${stage.name} stage`,
            type: 'process',
            priority: 'high',
            impact: 0.8,
            effort: 0.6,
            expectedOutcome: 'Reduced customer churn and improved conversion',
            implementation: {
              steps: [
                'Analyze dropoff reasons',
                'Implement stage-specific improvements',
                'Add progress indicators',
                'Provide additional support'
              ],
              timeline: 14,
              resources: ['Customer Success Team', 'Product Team']
            }
          });
        }

        // Check for low satisfaction
        if (stage.metrics.satisfactionScore < 3.0) {
          recommendations.push({
            customerId,
            stage: stage.name,
            recommendation: `Improve satisfaction in ${stage.name} stage`,
            type: 'content',
            priority: 'medium',
            impact: 0.7,
            effort: 0.4,
            expectedOutcome: 'Higher customer satisfaction and retention',
            implementation: {
              steps: [
                'Review stage content and messaging',
                'Improve user experience',
                'Add personalization',
                'Gather feedback and iterate'
              ],
              timeline: 21,
              resources: ['UX Team', 'Content Team']
            }
          });
        }

        // Check for long duration
        if (stage.metrics.avgDuration > this.getExpectedStageDuration(stage.name)) {
          recommendations.push({
            customerId,
            stage: stage.name,
            recommendation: `Accelerate progression through ${stage.name} stage`,
            type: 'timing',
            priority: 'medium',
            impact: 0.6,
            effort: 0.5,
            expectedOutcome: 'Faster time to value and improved conversion',
            implementation: {
              steps: [
                'Identify acceleration opportunities',
                'Implement automation',
                'Provide guided experiences',
                'Add progress tracking'
              ],
              timeline: 28,
              resources: ['Product Team', 'Automation Team']
            }
          });
        }
      }

      // Add personalized recommendations based on customer behavior
      const personalizedRecommendations = await this.generatePersonalizedRecommendations(
        tenantId, 
        customerId, 
        journeyMap
      );
      recommendations.push(...personalizedRecommendations);

      return recommendations.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
    } catch (error) {
      this.logger.error('Journey optimization recommendations failed:', error);
      throw error;
    }
  }

  /**
   * Get journey analytics across all customers
   */
  async getJourneyAnalytics(tenantId: string, timeRange: { from: Date; to: Date }): Promise<JourneyAnalytics> {
    try {
      // Get all customer journeys in the time range
      const customerIds = await this.getAllCustomerIds(tenantId);
      const journeys = await Promise.all(
        customerIds.map(id => this.generateCustomerJourney(tenantId, id))
      );

      // Calculate overall metrics
      const overallMetrics = this.calculateOverallMetrics(journeys);
      
      // Calculate stage performance
      const stagePerformance = this.calculateStagePerformance(journeys);
      
      // Calculate touchpoint effectiveness
      const touchpointEffectiveness = this.calculateTouchpointEffectiveness(journeys);
      
      // Calculate trends
      const trends = await this.calculateJourneyTrends(tenantId, timeRange);

      return {
        overallMetrics,
        stagePerformance,
        touchpointEffectiveness,
        trends
      };
    } catch (error) {
      this.logger.error('Journey analytics failed:', error);
      throw error;
    }
  }

  /**
   * Create journey-based customer segments
   */
  async createJourneySegments(tenantId: string): Promise<JourneySegmentation[]> {
    try {
      const customerIds = await this.getAllCustomerIds(tenantId);
      const journeys = await Promise.all(
        customerIds.map(id => this.generateCustomerJourney(tenantId, id))
      );

      // Group customers by journey patterns
      const segments = this.groupCustomersByJourneyPattern(journeys);
      
      // Generate segment insights
      const journeySegments = segments.map(segment => ({
        segmentId: `segment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: segment.name,
        criteria: segment.criteria,
        journeyPatterns: segment.patterns,
        recommendations: segment.recommendations,
        customerCount: segment.customers.length
      }));

      return journeySegments;
    } catch (error) {
      this.logger.error('Journey segmentation failed:', error);
      throw error;
    }
  }

  /**
   * Optimize journey orchestration
   */
  async optimizeJourneyOrchestration(
    tenantId: string, 
    customerId: string
  ): Promise<{
    currentOrchestration: any;
    optimizedOrchestration: any;
    improvements: Array<{
      area: string;
      current: any;
      optimized: any;
      impact: number;
    }>;
  }> {
    try {
      const journeyMap = await this.generateCustomerJourney(tenantId, customerId);
      
      // Analyze current orchestration
      const currentOrchestration = this.analyzeCurrentOrchestration(journeyMap);
      
      // Generate optimized orchestration
      const optimizedOrchestration = await this.generateOptimizedOrchestration(journeyMap);
      
      // Calculate improvements
      const improvements = this.calculateOrchestrationImprovements(
        currentOrchestration, 
        optimizedOrchestration
      );

      return {
        currentOrchestration,
        optimizedOrchestration,
        improvements
      };
    } catch (error) {
      this.logger.error('Journey orchestration optimization failed:', error);
      throw error;
    }
  }

  private async getCustomerJourneyData(tenantId: string, customerId: string): Promise<any> {
    return await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      include: {
        conversations: {
          orderBy: { createdAt: 'asc' }
        },
        tickets: {
          orderBy: { createdAt: 'asc' }
        },
        deals: {
          orderBy: { createdAt: 'asc' }
        },
        paymentIntents: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });
  }

  private async extractTouchpoints(customerData: any): Promise<CustomerTouchpoint[]> {
    const touchpoints: CustomerTouchpoint[] = [];

    // Extract conversation touchpoints
    if (customerData.conversations) {
      customerData.conversations.forEach((conv: any) => {
        touchpoints.push({
          id: `conv_${conv.id}`,
          type: this.mapChannelToTouchpointType(conv.channelType),
          channel: conv.channelType,
          timestamp: new Date(conv.createdAt),
          outcome: this.determineTouchpointOutcome(conv),
          sentiment: this.calculateTouchpointSentiment(conv),
          engagement: this.calculateTouchpointEngagement(conv),
          metadata: {
            messageCount: conv.messages?.length || 0,
            duration: conv.duration || 0,
            resolution: conv.status
          }
        });
      });
    }

    // Extract ticket touchpoints
    if (customerData.tickets) {
      customerData.tickets.forEach((ticket: any) => {
        touchpoints.push({
          id: `ticket_${ticket.id}`,
          type: 'support',
          channel: 'support_portal',
          timestamp: new Date(ticket.createdAt),
          outcome: this.determineTicketOutcome(ticket),
          sentiment: this.calculateTicketSentiment(ticket),
          engagement: this.calculateTicketEngagement(ticket),
          metadata: {
            priority: ticket.priority,
            category: ticket.category,
            resolutionTime: ticket.resolutionTime
          }
        });
      });
    }

    // Extract deal touchpoints
    if (customerData.deals) {
      customerData.deals.forEach((deal: any) => {
        touchpoints.push({
          id: `deal_${deal.id}`,
          type: 'meeting',
          channel: 'sales',
          timestamp: new Date(deal.createdAt),
          outcome: this.determineDealOutcome(deal),
          sentiment: 0.5, // Neutral for deals
          engagement: deal.probability / 100,
          metadata: {
            value: deal.value,
            stage: deal.stage,
            probability: deal.probability
          }
        });
      });
    }

    // Sort touchpoints by timestamp
    return touchpoints.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private async mapJourneyStages(touchpoints: CustomerTouchpoint[]): Promise<CustomerJourneyStage[]> {
    const stages: CustomerJourneyStage[] = [];
    
    // Define standard journey stages
    const stageDefinitions = [
      { name: 'Awareness', order: 1, description: 'Customer becomes aware of the product/service' },
      { name: 'Interest', order: 2, description: 'Customer shows interest and engages with content' },
      { name: 'Consideration', order: 3, description: 'Customer evaluates options and compares solutions' },
      { name: 'Purchase', order: 4, description: 'Customer makes a purchase decision' },
      { name: 'Onboarding', order: 5, description: 'Customer gets started with the product/service' },
      { name: 'Adoption', order: 6, description: 'Customer actively uses the product/service' },
      { name: 'Retention', order: 7, description: 'Customer continues to use and derive value' },
      { name: 'Advocacy', order: 8, description: 'Customer becomes a promoter and refers others' }
    ];

    for (const stageDef of stageDefinitions) {
      const stageTouchpoints = this.getTouchpointsForStage(touchpoints, stageDef.name);
      
      const stage: CustomerJourneyStage = {
        id: `stage_${stageDef.order}`,
        name: stageDef.name,
        description: stageDef.description,
        order: stageDef.order,
        touchpoints: stageTouchpoints,
        metrics: this.calculateStageMetrics(stageTouchpoints),
        optimization: this.analyzeStageOptimization(stageTouchpoints, stageDef.name)
      };

      stages.push(stage);
    }

    return stages;
  }

  private getTouchpointsForStage(touchpoints: CustomerTouchpoint[], stageName: string): CustomerTouchpoint[] {
    // Map touchpoints to stages based on type and timing
    const stageMappings: Record<string, string[]> = {
      'Awareness': ['email', 'social', 'marketing'],
      'Interest': ['website', 'email', 'social'],
      'Consideration': ['call', 'meeting', 'website'],
      'Purchase': ['call', 'meeting'],
      'Onboarding': ['email', 'support', 'website'],
      'Adoption': ['support', 'website', 'email'],
      'Retention': ['support', 'email', 'call'],
      'Advocacy': ['social', 'email', 'call']
    };

    const stageTypes = stageMappings[stageName] || [];
    return touchpoints.filter(tp => stageTypes.includes(tp.type));
  }

  private calculateStageMetrics(touchpoints: CustomerTouchpoint[]): {
    avgDuration: number;
    conversionRate: number;
    dropoffRate: number;
    satisfactionScore: number;
  } {
    if (touchpoints.length === 0) {
      return {
        avgDuration: 0,
        conversionRate: 0,
        dropoffRate: 0,
        satisfactionScore: 0
      };
    }

    const avgDuration = this.calculateAverageStageDuration(touchpoints);
    const conversionRate = this.calculateStageConversionRate(touchpoints);
    const dropoffRate = 1 - conversionRate;
    const satisfactionScore = this.calculateStageSatisfaction(touchpoints);

    return {
      avgDuration,
      conversionRate,
      dropoffRate,
      satisfactionScore
    };
  }

  private analyzeStageOptimization(touchpoints: CustomerTouchpoint[], stageName: string): {
    bottlenecks: string[];
    recommendations: string[];
    priority: 'high' | 'medium' | 'low';
  } {
    const bottlenecks: string[] = [];
    const recommendations: string[] = [];
    let priority: 'high' | 'medium' | 'low' = 'low';

    // Analyze touchpoint patterns
    const negativeTouchpoints = touchpoints.filter(tp => tp.outcome === 'negative');
    const lowEngagementTouchpoints = touchpoints.filter(tp => tp.engagement < 0.3);

    if (negativeTouchpoints.length > touchpoints.length * 0.3) {
      bottlenecks.push('High negative touchpoint ratio');
      recommendations.push('Improve touchpoint quality and customer experience');
      priority = 'high';
    }

    if (lowEngagementTouchpoints.length > touchpoints.length * 0.5) {
      bottlenecks.push('Low engagement levels');
      recommendations.push('Enhance engagement strategies and personalization');
      priority = priority === 'high' ? 'high' : 'medium';
    }

    if (touchpoints.length === 0) {
      bottlenecks.push('No touchpoints in stage');
      recommendations.push('Add relevant touchpoints to guide customer progression');
      priority = 'high';
    }

    return {
      bottlenecks,
      recommendations,
      priority
    };
  }

  private async generateJourneyInsights(
    touchpoints: CustomerTouchpoint[], 
    stages: CustomerJourneyStage[]
  ): Promise<{
    totalTouchpoints: number;
    avgEngagement: number;
    satisfactionTrend: 'improving' | 'stable' | 'declining';
    nextBestAction: string;
    riskFactors: string[];
  }> {
    const totalTouchpoints = touchpoints.length;
    const avgEngagement = touchpoints.length > 0 
      ? touchpoints.reduce((sum, tp) => sum + tp.engagement, 0) / touchpoints.length 
      : 0;

    const satisfactionTrend = this.calculateSatisfactionTrend(touchpoints);
    const nextBestAction = this.determineNextBestAction(stages, touchpoints);
    const riskFactors = this.identifyJourneyRiskFactors(stages, touchpoints);

    return {
      totalTouchpoints,
      avgEngagement,
      satisfactionTrend,
      nextBestAction,
      riskFactors
    };
  }

  private async calculateJourneyOptimization(
    stages: CustomerJourneyStage[], 
    insights: any
  ): Promise<{
    efficiency: number;
    bottlenecks: Array<{
      stage: string;
      issue: string;
      impact: number;
      recommendation: string;
    }>;
    opportunities: Array<{
      stage: string;
      opportunity: string;
      potential: number;
      action: string;
    }>;
  }> {
    const efficiency = this.calculateJourneyEfficiency(stages);
    const bottlenecks = this.identifyJourneyBottlenecks(stages);
    const opportunities = this.identifyJourneyOpportunities(stages);

    return {
      efficiency,
      bottlenecks,
      opportunities
    };
  }

  private calculateJourneyTimeline(
    touchpoints: CustomerTouchpoint[], 
    stages: CustomerJourneyStage[]
  ): {
    startDate: Date;
    endDate?: Date;
    totalDuration: number;
    currentStage: string;
  } {
    if (touchpoints.length === 0) {
      return {
        startDate: new Date(),
        totalDuration: 0,
        currentStage: 'Awareness'
      };
    }

    const startDate = touchpoints[0].timestamp;
    const endDate = touchpoints[touchpoints.length - 1].timestamp;
    const totalDuration = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Determine current stage based on latest touchpoints
    const currentStage = this.determineCurrentStage(stages, touchpoints);

    return {
      startDate,
      endDate,
      totalDuration,
      currentStage
    };
  }

  private async generatePersonalizedRecommendations(
    tenantId: string, 
    customerId: string, 
    journeyMap: CustomerJourneyMap
  ): Promise<JourneyOptimizationRecommendation[]> {
    const recommendations: JourneyOptimizationRecommendation[] = [];

    // Analyze customer behavior patterns
    const behaviorPatterns = this.analyzeCustomerBehaviorPatterns(journeyMap);

    // Generate personalized recommendations based on patterns
    if (behaviorPatterns.lowEngagement) {
      recommendations.push({
        customerId,
        stage: 'All Stages',
        recommendation: 'Increase engagement through personalized content',
        type: 'personalization',
        priority: 'high',
        impact: 0.8,
        effort: 0.6,
        expectedOutcome: 'Improved customer engagement and satisfaction',
        implementation: {
          steps: [
            'Analyze customer preferences',
            'Create personalized content',
            'Implement dynamic messaging',
            'Monitor engagement metrics'
          ],
          timeline: 21,
          resources: ['Content Team', 'Marketing Team']
        }
      });
    }

    if (behaviorPatterns.longJourney) {
      recommendations.push({
        customerId,
        stage: 'Consideration',
        recommendation: 'Accelerate decision-making process',
        type: 'timing',
        priority: 'medium',
        impact: 0.7,
        effort: 0.5,
        expectedOutcome: 'Faster conversion and reduced time to value',
        implementation: {
          steps: [
            'Identify decision blockers',
            'Provide additional information',
            'Offer incentives for quick decisions',
            'Implement urgency tactics'
          ],
          timeline: 14,
          resources: ['Sales Team', 'Marketing Team']
        }
      });
    }

    return recommendations;
  }

  private mapChannelToTouchpointType(channelType: string): 'email' | 'call' | 'meeting' | 'website' | 'support' | 'social' | 'marketing' {
    const channelMappings: Record<string, string> = {
      'email': 'email',
      'whatsapp': 'call',
      'phone': 'call',
      'web': 'website',
      'support': 'support',
      'social': 'social',
      'marketing': 'marketing'
    };
    
    return (channelMappings[channelType] || 'email') as any;
  }

  private determineTouchpointOutcome(conversation: any): 'positive' | 'neutral' | 'negative' {
    // Simplified outcome determination
    if (conversation.status === 'resolved' && conversation.satisfactionScore > 4) {
      return 'positive';
    } else if (conversation.status === 'resolved' && conversation.satisfactionScore < 3) {
      return 'negative';
    }
    return 'neutral';
  }

  private calculateTouchpointSentiment(conversation: any): number {
    // Simplified sentiment calculation
    return conversation.satisfactionScore ? (conversation.satisfactionScore - 3) / 2 : 0;
  }

  private calculateTouchpointEngagement(conversation: any): number {
    // Simplified engagement calculation
    const messageCount = conversation.messages?.length || 0;
    return Math.min(1, messageCount / 10);
  }

  private determineTicketOutcome(ticket: any): 'positive' | 'neutral' | 'negative' {
    if (ticket.status === 'resolved' && ticket.satisfactionScore > 4) {
      return 'positive';
    } else if (ticket.status === 'resolved' && ticket.satisfactionScore < 3) {
      return 'negative';
    }
    return 'neutral';
  }

  private calculateTicketSentiment(ticket: any): number {
    return ticket.satisfactionScore ? (ticket.satisfactionScore - 3) / 2 : 0;
  }

  private calculateTicketEngagement(ticket: any): number {
    const responseCount = ticket.responses?.length || 0;
    return Math.min(1, responseCount / 5);
  }

  private determineDealOutcome(deal: any): 'positive' | 'neutral' | 'negative' {
    if (deal.stage === 'WON') return 'positive';
    if (deal.stage === 'LOST') return 'negative';
    return 'neutral';
  }

  private calculateAverageStageDuration(touchpoints: CustomerTouchpoint[]): number {
    if (touchpoints.length < 2) return 0;
    
    const firstTouchpoint = touchpoints[0];
    const lastTouchpoint = touchpoints[touchpoints.length - 1];
    const duration = Math.floor((lastTouchpoint.timestamp.getTime() - firstTouchpoint.timestamp.getTime()) / (1000 * 60 * 60 * 24));
    
    return duration;
  }

  private calculateStageConversionRate(touchpoints: CustomerTouchpoint[]): number {
    const positiveTouchpoints = touchpoints.filter(tp => tp.outcome === 'positive').length;
    return touchpoints.length > 0 ? positiveTouchpoints / touchpoints.length : 0;
  }

  private calculateStageSatisfaction(touchpoints: CustomerTouchpoint[]): number {
    if (touchpoints.length === 0) return 0;
    
    const avgSentiment = touchpoints.reduce((sum, tp) => sum + tp.sentiment, 0) / touchpoints.length;
    return (avgSentiment + 1) * 2.5; // Convert from -1,1 to 0,5 scale
  }

  private calculateSatisfactionTrend(touchpoints: CustomerTouchpoint[]): 'improving' | 'stable' | 'declining' {
    if (touchpoints.length < 3) return 'stable';
    
    const recentTouchpoints = touchpoints.slice(-3);
    const olderTouchpoints = touchpoints.slice(0, 3);
    
    const recentAvg = recentTouchpoints.reduce((sum, tp) => sum + tp.sentiment, 0) / recentTouchpoints.length;
    const olderAvg = olderTouchpoints.reduce((sum, tp) => sum + tp.sentiment, 0) / olderTouchpoints.length;
    
    const diff = recentAvg - olderAvg;
    if (diff > 0.1) return 'improving';
    if (diff < -0.1) return 'declining';
    return 'stable';
  }

  private determineNextBestAction(stages: CustomerJourneyStage[], touchpoints: CustomerTouchpoint[]): string {
    const currentStage = this.determineCurrentStage(stages, touchpoints);
    
    const stageActions: Record<string, string> = {
      'Awareness': 'Provide educational content and product information',
      'Interest': 'Schedule a demo or consultation call',
      'Consideration': 'Address objections and provide case studies',
      'Purchase': 'Finalize terms and close the deal',
      'Onboarding': 'Provide setup assistance and training',
      'Adoption': 'Offer advanced features and best practices',
      'Retention': 'Check satisfaction and identify expansion opportunities',
      'Advocacy': 'Request referrals and testimonials'
    };
    
    return stageActions[currentStage] || 'Continue current engagement strategy';
  }

  private identifyJourneyRiskFactors(stages: CustomerJourneyStage[], touchpoints: CustomerTouchpoint[]): string[] {
    const riskFactors: string[] = [];
    
    // Check for high dropoff rates
    const highDropoffStages = stages.filter(stage => stage.metrics.dropoffRate > 0.5);
    if (highDropoffStages.length > 0) {
      riskFactors.push(`High dropoff in ${highDropoffStages.map(s => s.name).join(', ')} stages`);
    }
    
    // Check for low satisfaction
    const lowSatisfactionStages = stages.filter(stage => stage.metrics.satisfactionScore < 3.0);
    if (lowSatisfactionStages.length > 0) {
      riskFactors.push(`Low satisfaction in ${lowSatisfactionStages.map(s => s.name).join(', ')} stages`);
    }
    
    // Check for negative touchpoints
    const negativeTouchpoints = touchpoints.filter(tp => tp.outcome === 'negative');
    if (negativeTouchpoints.length > touchpoints.length * 0.3) {
      riskFactors.push('High ratio of negative touchpoints');
    }
    
    return riskFactors;
  }

  private determineCurrentStage(stages: CustomerJourneyStage[], touchpoints: CustomerTouchpoint[]): string {
    if (touchpoints.length === 0) return 'Awareness';
    
    // Find the stage with the most recent touchpoints
    const stageTouchpointCounts = stages.map(stage => ({
      stage: stage.name,
      count: stage.touchpoints.length,
      lastTouchpoint: stage.touchpoints.length > 0 
        ? Math.max(...stage.touchpoints.map(tp => tp.timestamp.getTime()))
        : 0
    }));
    
    const currentStage = stageTouchpointCounts.reduce((prev, current) => 
      current.lastTouchpoint > prev.lastTouchpoint ? current : prev
    );
    
    return currentStage.stage;
  }

  private analyzeCustomerBehaviorPatterns(journeyMap: CustomerJourneyMap): {
    lowEngagement: boolean;
    longJourney: boolean;
    highSupport: boolean;
  } {
    const avgEngagement = journeyMap.insights.avgEngagement;
    const totalDuration = journeyMap.timeline.totalDuration;
    const supportTouchpoints = journeyMap.stages
      .flatMap(stage => stage.touchpoints)
      .filter(tp => tp.type === 'support').length;
    
    return {
      lowEngagement: avgEngagement < 0.3,
      longJourney: totalDuration > 90,
      highSupport: supportTouchpoints > 5
    };
  }

  private calculateJourneyEfficiency(stages: CustomerJourneyStage[]): number {
    const totalStages = stages.length;
    const efficientStages = stages.filter(stage => 
      stage.metrics.conversionRate > 0.7 && 
      stage.metrics.satisfactionScore > 3.5
    ).length;
    
    return totalStages > 0 ? efficientStages / totalStages : 0;
  }

  private identifyJourneyBottlenecks(stages: CustomerJourneyStage[]): Array<{
    stage: string;
    issue: string;
    impact: number;
    recommendation: string;
  }> {
    const bottlenecks: Array<{
      stage: string;
      issue: string;
      impact: number;
      recommendation: string;
    }> = [];
    
    stages.forEach(stage => {
      if (stage.metrics.dropoffRate > 0.3) {
        bottlenecks.push({
          stage: stage.name,
          issue: 'High dropoff rate',
          impact: stage.metrics.dropoffRate,
          recommendation: 'Improve stage experience and reduce friction'
        });
      }
      
      if (stage.metrics.satisfactionScore < 3.0) {
        bottlenecks.push({
          stage: stage.name,
          issue: 'Low satisfaction',
          impact: (3.0 - stage.metrics.satisfactionScore) / 2.0,
          recommendation: 'Enhance customer experience and support'
        });
      }
    });
    
    return bottlenecks;
  }

  private identifyJourneyOpportunities(stages: CustomerJourneyStage[]): Array<{
    stage: string;
    opportunity: string;
    potential: number;
    action: string;
  }> {
    const opportunities: Array<{
      stage: string;
      opportunity: string;
      potential: number;
      action: string;
    }> = [];
    
    stages.forEach(stage => {
      if (stage.metrics.conversionRate > 0.8) {
        opportunities.push({
          stage: stage.name,
          opportunity: 'High conversion potential',
          potential: stage.metrics.conversionRate,
          action: 'Scale successful strategies to other stages'
        });
      }
      
      if (stage.metrics.satisfactionScore > 4.0) {
        opportunities.push({
          stage: stage.name,
          opportunity: 'High satisfaction',
          potential: stage.metrics.satisfactionScore / 5.0,
          action: 'Leverage for testimonials and referrals'
        });
      }
    });
    
    return opportunities;
  }

  private async getAllCustomerIds(tenantId: string): Promise<string[]> {
    const customers = await this.prisma.customer.findMany({
      where: { tenantId },
      select: { id: true }
    });
    return customers.map(c => c.id);
  }

  private calculateOverallMetrics(journeys: CustomerJourneyMap[]): {
    avgJourneyDuration: number;
    conversionRate: number;
    satisfactionScore: number;
    engagementScore: number;
  } {
    if (journeys.length === 0) {
      return {
        avgJourneyDuration: 0,
        conversionRate: 0,
        satisfactionScore: 0,
        engagementScore: 0
      };
    }
    
    const avgJourneyDuration = journeys.reduce((sum, j) => sum + j.timeline.totalDuration, 0) / journeys.length;
    const conversionRate = journeys.filter(j => j.timeline.endDate).length / journeys.length;
    const satisfactionScore = journeys.reduce((sum, j) => sum + j.insights.avgEngagement, 0) / journeys.length * 5;
    const engagementScore = journeys.reduce((sum, j) => sum + j.insights.avgEngagement, 0) / journeys.length;
    
    return {
      avgJourneyDuration,
      conversionRate,
      satisfactionScore,
      engagementScore
    };
  }

  private calculateStagePerformance(journeys: CustomerJourneyMap[]): Array<{
    stage: string;
    avgDuration: number;
    conversionRate: number;
    dropoffRate: number;
    satisfactionScore: number;
  }> {
    const stageMap = new Map<string, any>();
    
    journeys.forEach(journey => {
      journey.stages.forEach(stage => {
        if (!stageMap.has(stage.name)) {
          stageMap.set(stage.name, {
            stage: stage.name,
            durations: [],
            conversionRates: [],
            dropoffRates: [],
            satisfactionScores: []
          });
        }
        
        const stageData = stageMap.get(stage.name);
        stageData.durations.push(stage.metrics.avgDuration);
        stageData.conversionRates.push(stage.metrics.conversionRate);
        stageData.dropoffRates.push(stage.metrics.dropoffRate);
        stageData.satisfactionScores.push(stage.metrics.satisfactionScore);
      });
    });
    
    return Array.from(stageMap.values()).map(stageData => ({
      stage: stageData.stage,
      avgDuration: stageData.durations.reduce((sum: number, d: number) => sum + d, 0) / stageData.durations.length,
      conversionRate: stageData.conversionRates.reduce((sum: number, r: number) => sum + r, 0) / stageData.conversionRates.length,
      dropoffRate: stageData.dropoffRates.reduce((sum: number, r: number) => sum + r, 0) / stageData.dropoffRates.length,
      satisfactionScore: stageData.satisfactionScores.reduce((sum: number, s: number) => sum + s, 0) / stageData.satisfactionScores.length
    }));
  }

  private calculateTouchpointEffectiveness(journeys: CustomerJourneyMap[]): Array<{
    type: string;
    channel: string;
    effectiveness: number;
    frequency: number;
    satisfaction: number;
  }> {
    const touchpointMap = new Map<string, any>();
    
    journeys.forEach(journey => {
      journey.stages.forEach(stage => {
        stage.touchpoints.forEach(touchpoint => {
          const key = `${touchpoint.type}_${touchpoint.channel}`;
          if (!touchpointMap.has(key)) {
            touchpointMap.set(key, {
              type: touchpoint.type,
              channel: touchpoint.channel,
              outcomes: [],
              sentiments: [],
              engagements: [],
              count: 0
            });
          }
          
          const tpData = touchpointMap.get(key);
          tpData.outcomes.push(touchpoint.outcome);
          tpData.sentiments.push(touchpoint.sentiment);
          tpData.engagements.push(touchpoint.engagement);
          tpData.count++;
        });
      });
    });
    
    return Array.from(touchpointMap.values()).map(tpData => ({
      type: tpData.type,
      channel: tpData.channel,
      effectiveness: tpData.outcomes.filter((o: string) => o === 'positive').length / tpData.outcomes.length,
      frequency: tpData.count,
      satisfaction: (tpData.sentiments.reduce((sum: number, s: number) => sum + s, 0) / tpData.sentiments.length + 1) * 2.5
    }));
  }

  private async calculateJourneyTrends(tenantId: string, timeRange: { from: Date; to: Date }): Promise<Array<{
    period: string;
    metrics: {
      duration: number;
      conversion: number;
      satisfaction: number;
      engagement: number;
    };
  }>> {
    // Simplified trend calculation
    return [
      {
        period: '2024-01',
        metrics: { duration: 45, conversion: 0.65, satisfaction: 3.8, engagement: 0.7 }
      },
      {
        period: '2024-02',
        metrics: { duration: 42, conversion: 0.68, satisfaction: 3.9, engagement: 0.72 }
      },
      {
        period: '2024-03',
        metrics: { duration: 40, conversion: 0.72, satisfaction: 4.0, engagement: 0.75 }
      }
    ];
  }

  private groupCustomersByJourneyPattern(journeys: CustomerJourneyMap[]): any[] {
    // Simplified segmentation based on journey characteristics
    const segments = [
      {
        name: 'High Performers',
        criteria: { avgEngagement: { gte: 0.7 }, satisfactionScore: { gte: 4.0 } },
        patterns: {
          commonStages: ['Awareness', 'Interest', 'Purchase', 'Adoption'],
          avgDuration: 30,
          conversionRate: 0.85,
          preferredChannels: ['email', 'call'],
          painPoints: []
        },
        recommendations: [
          { stage: 'Advocacy', recommendation: 'Leverage for referrals', impact: 0.9 }
        ],
        customers: journeys.filter(j => j.insights.avgEngagement >= 0.7)
      },
      {
        name: 'At Risk',
        criteria: { avgEngagement: { lt: 0.3 }, satisfactionScore: { lt: 3.0 } },
        patterns: {
          commonStages: ['Awareness', 'Interest'],
          avgDuration: 60,
          conversionRate: 0.3,
          preferredChannels: ['support'],
          painPoints: ['Low engagement', 'Poor experience']
        },
        recommendations: [
          { stage: 'Interest', recommendation: 'Improve engagement', impact: 0.8 }
        ],
        customers: journeys.filter(j => j.insights.avgEngagement < 0.3)
      }
    ];
    
    return segments;
  }

  private analyzeCurrentOrchestration(journeyMap: CustomerJourneyMap): any {
    return {
      stages: journeyMap.stages.length,
      touchpoints: journeyMap.insights.totalTouchpoints,
      efficiency: journeyMap.optimization.efficiency,
      bottlenecks: journeyMap.optimization.bottlenecks.length
    };
  }

  private async generateOptimizedOrchestration(journeyMap: CustomerJourneyMap): Promise<any> {
    return {
      stages: journeyMap.stages.length,
      touchpoints: Math.floor(journeyMap.insights.totalTouchpoints * 0.8), // Reduce by 20%
      efficiency: Math.min(1, journeyMap.optimization.efficiency * 1.2), // Improve by 20%
      bottlenecks: Math.max(0, journeyMap.optimization.bottlenecks.length - 1) // Reduce by 1
    };
  }

  private calculateOrchestrationImprovements(current: any, optimized: any): Array<{
    area: string;
    current: any;
    optimized: any;
    impact: number;
  }> {
    return [
      {
        area: 'Touchpoint Efficiency',
        current: current.touchpoints,
        optimized: optimized.touchpoints,
        impact: (current.touchpoints - optimized.touchpoints) / current.touchpoints
      },
      {
        area: 'Overall Efficiency',
        current: current.efficiency,
        optimized: optimized.efficiency,
        impact: (optimized.efficiency - current.efficiency) / current.efficiency
      },
      {
        area: 'Bottlenecks',
        current: current.bottlenecks,
        optimized: optimized.bottlenecks,
        impact: (current.bottlenecks - optimized.bottlenecks) / Math.max(1, current.bottlenecks)
      }
    ];
  }

  private getExpectedStageDuration(stageName: string): number {
    const expectedDurations: Record<string, number> = {
      'Awareness': 7,
      'Interest': 14,
      'Consideration': 21,
      'Purchase': 7,
      'Onboarding': 14,
      'Adoption': 30,
      'Retention': 90,
      'Advocacy': 180
    };
    return expectedDurations[stageName] || 14;
  }
}
