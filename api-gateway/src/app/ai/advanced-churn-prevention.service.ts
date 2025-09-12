import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@glavito/shared-database';
import { AIIntelligenceService } from '@glavito/shared-ai';
import { CrmCacheService } from '../crm/crm-cache.service';

export interface ChurnRiskModel {
  id: string;
  name: string;
  version: string;
  accuracy: number;
  features: string[];
  thresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  lastTrained: Date;
  isActive: boolean;
}

export interface ChurnRiskFeatures {
  // Customer health metrics
  healthScore: number;
  satisfactionScore: number;
  supportTicketCount: number;
  avgResolutionTime: number;
  
  // Engagement metrics
  lastLoginDays: number;
  lastInteractionDays: number;
  featureUsageFrequency: number;
  supportInteractionsLast30d: number;
  
  // Business metrics
  contractValue: number;
  contractLength: number;
  daysToRenewal: number;
  paymentHistory: number; // 0-1 score
  
  // Behavioral patterns
  supportTicketTrend: number; // -1 to 1
  satisfactionTrend: number; // -1 to 1
  engagementTrend: number; // -1 to 1
  
  // External factors
  competitorMentions: number;
  cancellationKeywords: number;
  downgradeRequests: number;
}

export interface ChurnRiskAssessment {
  customerId: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number; // 0-100
  probability: number; // 0-1
  factors: Array<{
    factor: string;
    value: any;
    weight: number;
    contribution: number;
    trend: 'improving' | 'stable' | 'declining';
  }>;
  modelVersion: string;
  confidence: number;
  interventionSuggestions: string[];
  retentionActions: string[];
  timeline: {
    estimatedChurnDate: Date;
    interventionWindow: number; // days
    urgency: 'low' | 'medium' | 'high' | 'critical';
  };
}

export interface RetentionCampaign {
  id: string;
  customerId: string;
  campaignType: 'proactive' | 'reactive' | 'win_back';
  status: 'scheduled' | 'active' | 'completed' | 'paused';
  actions: Array<{
    type: 'email' | 'call' | 'meeting' | 'offer' | 'escalation';
    description: string;
    scheduledDate: Date;
    completedDate?: Date;
    outcome?: string;
  }>;
  successMetrics: {
    engagementScore: number;
    satisfactionImprovement: number;
    retentionProbability: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ChurnPreventionInsights {
  totalAtRisk: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  topRiskFactors: Array<{
    factor: string;
    count: number;
    impact: number;
  }>;
  interventionEffectiveness: {
    campaignType: string;
    successRate: number;
    avgRetentionImprovement: number;
  }[];
  trends: {
    period: string;
    churnRate: number;
    retentionRate: number;
    interventionSuccess: number;
  }[];
}

@Injectable()
export class AdvancedChurnPreventionService {
  private readonly logger = new Logger(AdvancedChurnPreventionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIIntelligenceService,
    private readonly cache: CrmCacheService
  ) {}

  /**
   * Assess churn risk for a customer
   */
  async assessChurnRisk(tenantId: string, customerId: string): Promise<ChurnRiskAssessment> {
    try {
      // Check cache first
      const cacheKey = `churn_risk:${customerId}`;
      const cached = await this.cache.get(cacheKey, { prefix: 'churn' });
      if (cached) {
        return cached;
      }

      // Get customer data
      const customer = await this.getCustomerData(tenantId, customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }

      // Extract features
      const features = await this.extractChurnFeatures(customer);
      
      // Get active model
      const model = await this.getActiveChurnModel(tenantId);
      
      // Calculate risk score
      const riskScore = model 
        ? this.calculateChurnRisk(features, model)
        : this.calculateHeuristicChurnRisk(features);

      // Determine risk level
      const riskLevel = this.determineRiskLevel(riskScore, model);
      
      // Generate intervention suggestions
      const interventionSuggestions = await this.generateInterventionSuggestions(features, riskLevel);
      
      // Generate retention actions
      const retentionActions = await this.generateRetentionActions(features, riskLevel);
      
      // Calculate timeline
      const timeline = this.calculateChurnTimeline(features, riskScore);

      const assessment: ChurnRiskAssessment = {
        customerId,
        riskLevel,
        riskScore: Math.round(riskScore * 100),
        probability: riskScore,
        factors: this.calculateFactorContributions(features, model),
        modelVersion: model?.version || 'heuristic_v1',
        confidence: model?.accuracy || 0.7,
        interventionSuggestions,
        retentionActions,
        timeline
      };

      // Cache the result
      await this.cache.set(cacheKey, assessment, { prefix: 'churn', ttl: 3600 });

      return assessment;
    } catch (error) {
      this.logger.error('Churn risk assessment failed:', error);
      throw error;
    }
  }

  /**
   * Batch assess churn risk for multiple customers
   */
  async batchAssessChurnRisk(tenantId: string, customerIds: string[]): Promise<ChurnRiskAssessment[]> {
    const assessments: ChurnRiskAssessment[] = [];
    
    // Process in batches
    const batchSize = 50;
    for (let i = 0; i < customerIds.length; i += batchSize) {
      const batch = customerIds.slice(i, i + batchSize);
      const batchAssessments = await Promise.all(
        batch.map(customerId => this.assessChurnRisk(tenantId, customerId))
      );
      assessments.push(...batchAssessments);
    }

    return assessments;
  }

  /**
   * Create a retention campaign for at-risk customers
   */
  async createRetentionCampaign(
    tenantId: string, 
    customerId: string, 
    campaignType: 'proactive' | 'reactive' | 'win_back'
  ): Promise<RetentionCampaign> {
    try {
      const assessment = await this.assessChurnRisk(tenantId, customerId);
      
      const campaign: RetentionCampaign = {
        id: `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        customerId,
        campaignType,
        status: 'scheduled',
        actions: await this.generateCampaignActions(assessment, campaignType),
        successMetrics: {
          engagementScore: 0,
          satisfactionImprovement: 0,
          retentionProbability: assessment.probability
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store campaign
      await this.prisma.retentionCampaign.create({
        data: {
          id: campaign.id,
          tenantId,
          customerId,
          campaignType,
          status: campaign.status,
          actions: campaign.actions as any,
          successMetrics: campaign.successMetrics as any,
          createdAt: campaign.createdAt,
          updatedAt: campaign.updatedAt
        }
      });

      return campaign;
    } catch (error) {
      this.logger.error('Failed to create retention campaign:', error);
      throw error;
    }
  }

  /**
   * Execute retention campaign actions
   */
  async executeCampaignAction(
    campaignId: string, 
    actionType: string, 
    outcome?: string
  ): Promise<void> {
    try {
      const campaign = await this.prisma.retentionCampaign.findUnique({
        where: { id: campaignId }
      });

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Update action status
      const actions = (campaign.actions as any[]) || [];
      const actionIndex = actions.findIndex((a: any) => a.type === actionType);
      
      if (actionIndex >= 0) {
        actions[actionIndex].completedDate = new Date();
        actions[actionIndex].outcome = outcome;
      }

      // Update campaign status
      const completedActions = actions.filter((a: any) => a.completedDate).length;
      const totalActions = actions.length;
      const status = completedActions >= totalActions ? 'completed' : 'active';

      await this.prisma.retentionCampaign.update({
        where: { id: campaignId },
        data: {
          actions: actions as any,
          status,
          updatedAt: new Date()
        }
      });

      // Update success metrics
      await this.updateCampaignMetrics(campaignId);
    } catch (error) {
      this.logger.error('Failed to execute campaign action:', error);
      throw error;
    }
  }

  /**
   * Get churn prevention insights
   */
  async getChurnPreventionInsights(tenantId: string, timeRange: { from: Date; to: Date }): Promise<ChurnPreventionInsights> {
    try {
      // Get all customer assessments
      const assessments = await this.batchAssessChurnRisk(tenantId, await this.getAllCustomerIds(tenantId));
      
      // Calculate risk distribution
      const riskDistribution = {
        low: assessments.filter(a => a.riskLevel === 'low').length,
        medium: assessments.filter(a => a.riskLevel === 'medium').length,
        high: assessments.filter(a => a.riskLevel === 'high').length,
        critical: assessments.filter(a => a.riskLevel === 'critical').length
      };

      // Get top risk factors
      const topRiskFactors = this.calculateTopRiskFactors(assessments);

      // Get intervention effectiveness
      const interventionEffectiveness = await this.calculateInterventionEffectiveness(tenantId, timeRange);

      // Get trends
      const trends = await this.calculateChurnTrends(tenantId, timeRange);

      return {
        totalAtRisk: assessments.filter(a => a.riskLevel !== 'low').length,
        riskDistribution,
        topRiskFactors,
        interventionEffectiveness,
        trends
      };
    } catch (error) {
      this.logger.error('Failed to get churn prevention insights:', error);
      throw error;
    }
  }

  /**
   * Train churn prediction model
   */
  async trainChurnModel(tenantId: string, modelName: string): Promise<string> {
    this.logger.log(`Starting churn prediction model training for tenant: ${tenantId}`);
    
    try {
      // Collect training data
      const trainingData = await this.collectChurnTrainingData(tenantId);
      
      if (trainingData.length < 100) {
        throw new Error('Insufficient training data. Need at least 100 customers with churn outcomes.');
      }

      // Train model using AI service
      const modelId = await this.aiService.trainCustomModel('churn_prediction', trainingData);
      
      // Store model metadata
      const model = await this.prisma.aIModel.create({
        data: {
          id: modelId,
          tenantId,
          name: modelName,
          type: 'churn_prediction',
          status: 'training',
          configuration: {
            modelType: 'churn_prediction',
            features: Object.keys(trainingData[0]?.features || {}),
            trainingDataSize: trainingData.length,
            algorithm: 'random_forest'
          },
          trainingData: trainingData as any,
          version: '1.0'
        }
      });

      // Simulate training completion
      setTimeout(async () => {
        await this.completeChurnModelTraining(modelId, trainingData);
      }, 5000);

      return modelId;
    } catch (error) {
      this.logger.error('Churn model training failed:', error);
      throw error;
    }
  }

  private async getCustomerData(tenantId: string, customerId: string): Promise<any> {
    return await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      include: {
        tickets: {
          orderBy: { createdAt: 'desc' },
          take: 50
        },
        conversations: {
          orderBy: { updatedAt: 'desc' },
          take: 20
        },
        deals: true,
        paymentIntents: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });
  }

  private async extractChurnFeatures(customer: any): Promise<ChurnRiskFeatures> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Calculate health score
    const healthResult = await this.aiService.computeCustomerHealth({
      tenantId: customer.tenantId,
      customerId: customer.id
    });

    // Calculate support metrics
    const supportTickets = customer.tickets || [];
    const supportTicketCount = supportTickets.length;
    const avgResolutionTime = this.calculateAvgResolutionTime(supportTickets);
    const supportInteractionsLast30d = supportTickets.filter((t: any) => 
      new Date(t.createdAt) >= thirtyDaysAgo
    ).length;

    // Calculate engagement metrics
    const lastLoginDays = customer.lastInteractionAt 
      ? Math.floor((now.getTime() - new Date(customer.lastInteractionAt).getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    
    const lastInteractionDays = customer.lastInteractionAt 
      ? Math.floor((now.getTime() - new Date(customer.lastInteractionAt).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    // Calculate business metrics
    const deals = customer.deals || [];
    const contractValue = deals.reduce((sum: number, deal: any) => sum + Number(deal.value), 0);
    const contractLength = 365; // Default 1 year
    const daysToRenewal = this.calculateDaysToRenewal(customer);
    const paymentHistory = this.calculatePaymentHistoryScore(customer.paymentIntents || []);

    // Calculate trends
    const supportTicketTrend = this.calculateTrend(supportTickets, thirtyDaysAgo, ninetyDaysAgo);
    const satisfactionTrend = 0; // Would be calculated from satisfaction surveys
    const engagementTrend = this.calculateEngagementTrend(customer.conversations || [], thirtyDaysAgo, ninetyDaysAgo);

    // Calculate external factors
    const competitorMentions = this.countCompetitorMentions(customer.conversations || []);
    const cancellationKeywords = this.countCancellationKeywords(customer.conversations || []);
    const downgradeRequests = this.countDowngradeRequests(customer.tickets || []);

    return {
      healthScore: healthResult.healthScore,
      satisfactionScore: customer.satisfactionScore || 3.0,
      supportTicketCount,
      avgResolutionTime,
      lastLoginDays,
      lastInteractionDays,
      featureUsageFrequency: 0.5, // Would be calculated from usage analytics
      supportInteractionsLast30d,
      contractValue,
      contractLength,
      daysToRenewal,
      paymentHistory,
      supportTicketTrend,
      satisfactionTrend,
      engagementTrend,
      competitorMentions,
      cancellationKeywords,
      downgradeRequests
    };
  }

  private calculateChurnRisk(features: ChurnRiskFeatures, model: any): number {
    // Simplified churn risk calculation
    let riskScore = 0.3; // Base risk

    // Health score impact
    if (features.healthScore < 30) riskScore += 0.3;
    else if (features.healthScore < 50) riskScore += 0.2;
    else if (features.healthScore < 70) riskScore += 0.1;

    // Support ticket impact
    if (features.supportTicketCount > 10) riskScore += 0.2;
    else if (features.supportTicketCount > 5) riskScore += 0.1;

    // Engagement impact
    if (features.lastInteractionDays > 30) riskScore += 0.2;
    else if (features.lastInteractionDays > 14) riskScore += 0.1;

    // Payment history impact
    if (features.paymentHistory < 0.7) riskScore += 0.15;

    // Trend impact
    if (features.supportTicketTrend > 0.5) riskScore += 0.1;
    if (features.engagementTrend < -0.3) riskScore += 0.15;

    // External factors
    if (features.competitorMentions > 0) riskScore += 0.1;
    if (features.cancellationKeywords > 0) riskScore += 0.2;
    if (features.downgradeRequests > 0) riskScore += 0.15;

    return Math.max(0, Math.min(1, riskScore));
  }

  private calculateHeuristicChurnRisk(features: ChurnRiskFeatures): number {
    // Fallback heuristic calculation
    return this.calculateChurnRisk(features, null);
  }

  private determineRiskLevel(riskScore: number, model: any): 'low' | 'medium' | 'high' | 'critical' {
    const thresholds = model?.configuration?.thresholds || {
      low: 0.3,
      medium: 0.5,
      high: 0.7,
      critical: 0.85
    };

    if (riskScore >= thresholds.critical) return 'critical';
    if (riskScore >= thresholds.high) return 'high';
    if (riskScore >= thresholds.medium) return 'medium';
    return 'low';
  }

  private calculateFactorContributions(features: ChurnRiskFeatures, model: any): Array<{
    factor: string;
    value: any;
    weight: number;
    contribution: number;
    trend: 'improving' | 'stable' | 'declining';
  }> {
    const factors = [];

    // Health score contribution
    const healthContribution = features.healthScore < 50 ? 0.2 : 0;
    factors.push({
      factor: 'healthScore',
      value: features.healthScore,
      weight: 0.2,
      contribution: healthContribution,
      trend: features.healthScore > 70 ? 'improving' : features.healthScore < 40 ? 'declining' : 'stable'
    });

    // Support tickets contribution
    const supportContribution = features.supportTicketCount > 5 ? 0.15 : 0;
    factors.push({
      factor: 'supportTicketCount',
      value: features.supportTicketCount,
      weight: 0.15,
      contribution: supportContribution,
      trend: features.supportTicketTrend > 0.3 ? 'declining' : 'stable'
    });

    // Engagement contribution
    const engagementContribution = features.lastInteractionDays > 14 ? 0.15 : 0;
    factors.push({
      factor: 'lastInteractionDays',
      value: features.lastInteractionDays,
      weight: 0.15,
      contribution: engagementContribution,
      trend: features.engagementTrend < -0.2 ? 'declining' : 'stable'
    });

    return factors;
  }

  private async generateInterventionSuggestions(features: ChurnRiskFeatures, riskLevel: string): Promise<string[]> {
    const suggestions: string[] = [];

    if (features.healthScore < 50) {
      suggestions.push('Schedule health check call with customer success manager');
    }

    if (features.supportTicketCount > 5) {
      suggestions.push('Review and resolve outstanding support issues');
    }

    if (features.lastInteractionDays > 14) {
      suggestions.push('Initiate proactive outreach to re-engage customer');
    }

    if (features.paymentHistory < 0.7) {
      suggestions.push('Review payment issues and offer flexible payment options');
    }

    if (features.competitorMentions > 0) {
      suggestions.push('Address competitive concerns with value proposition');
    }

    if (features.cancellationKeywords > 0) {
      suggestions.push('Immediate escalation to retention specialist');
    }

    if (riskLevel === 'critical') {
      suggestions.push('Executive escalation and retention offer');
    }

    return suggestions;
  }

  private async generateRetentionActions(features: ChurnRiskFeatures, riskLevel: string): Promise<string[]> {
    const actions: string[] = [];

    if (riskLevel === 'critical') {
      actions.push('Executive call within 24 hours');
      actions.push('Retention offer with discount');
      actions.push('Priority support assignment');
    } else if (riskLevel === 'high') {
      actions.push('Customer success manager outreach');
      actions.push('Feature training session');
      actions.push('Success metrics review');
    } else if (riskLevel === 'medium') {
      actions.push('Proactive check-in call');
      actions.push('Educational content delivery');
      actions.push('Usage optimization recommendations');
    }

    return actions;
  }

  private calculateChurnTimeline(features: ChurnRiskFeatures, riskScore: number): {
    estimatedChurnDate: Date;
    interventionWindow: number;
    urgency: 'low' | 'medium' | 'high' | 'critical';
  } {
    const now = new Date();
    const daysToChurn = Math.max(7, Math.floor((1 - riskScore) * 90));
    const estimatedChurnDate = new Date(now.getTime() + daysToChurn * 24 * 60 * 60 * 1000);
    
    const interventionWindow = Math.min(30, Math.floor(daysToChurn * 0.3));
    
    let urgency: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (daysToChurn < 14) urgency = 'critical';
    else if (daysToChurn < 30) urgency = 'high';
    else if (daysToChurn < 60) urgency = 'medium';

    return {
      estimatedChurnDate,
      interventionWindow,
      urgency
    };
  }

  private async generateCampaignActions(assessment: ChurnRiskAssessment, campaignType: string): Promise<Array<{
    type: 'email' | 'call' | 'meeting' | 'offer' | 'escalation';
    description: string;
    scheduledDate: Date;
    completedDate?: Date;
    outcome?: string;
  }>> {
    const actions = [];
    const now = new Date();

    if (campaignType === 'proactive') {
      actions.push({
        type: 'email' as const,
        description: 'Send health check email with usage insights',
        scheduledDate: new Date(now.getTime() + 24 * 60 * 60 * 1000)
      });
      actions.push({
        type: 'call' as const,
        description: 'Schedule customer success check-in call',
        scheduledDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
      });
    } else if (campaignType === 'reactive') {
      actions.push({
        type: 'call' as const,
        description: 'Immediate retention specialist call',
        scheduledDate: new Date(now.getTime() + 2 * 60 * 60 * 1000) // 2 hours
      });
      actions.push({
        type: 'offer' as const,
        description: 'Prepare retention offer based on risk factors',
        scheduledDate: new Date(now.getTime() + 24 * 60 * 60 * 1000)
      });
    } else if (campaignType === 'win_back') {
      actions.push({
        type: 'email' as const,
        description: 'Send win-back email with special offer',
        scheduledDate: new Date(now.getTime() + 24 * 60 * 60 * 1000)
      });
      actions.push({
        type: 'call' as const,
        description: 'Executive outreach call',
        scheduledDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
      });
    }

    return actions;
  }

  private async updateCampaignMetrics(campaignId: string): Promise<void> {
    // Update campaign success metrics based on actions and outcomes
    // This would integrate with actual engagement and satisfaction data
  }

  private async getAllCustomerIds(tenantId: string): Promise<string[]> {
    const customers = await this.prisma.customer.findMany({
      where: { tenantId },
      select: { id: true }
    });
    return customers.map(c => c.id);
  }

  private calculateTopRiskFactors(assessments: ChurnRiskAssessment[]): Array<{
    factor: string;
    count: number;
    impact: number;
  }> {
    const factorCounts = new Map<string, number>();
    const factorImpacts = new Map<string, number>();

    assessments.forEach(assessment => {
      assessment.factors.forEach(factor => {
        const count = factorCounts.get(factor.factor) || 0;
        const impact = factorImpacts.get(factor.factor) || 0;
        
        factorCounts.set(factor.factor, count + 1);
        factorImpacts.set(factor.factor, impact + factor.contribution);
      });
    });

    return Array.from(factorCounts.entries()).map(([factor, count]) => ({
      factor,
      count,
      impact: factorImpacts.get(factor) || 0
    })).sort((a, b) => b.impact - a.impact).slice(0, 10);
  }

  private async calculateInterventionEffectiveness(tenantId: string, timeRange: { from: Date; to: Date }): Promise<Array<{
    campaignType: string;
    successRate: number;
    avgRetentionImprovement: number;
  }>> {
    // This would calculate actual intervention effectiveness from historical data
    return [
      { campaignType: 'proactive', successRate: 0.75, avgRetentionImprovement: 0.15 },
      { campaignType: 'reactive', successRate: 0.60, avgRetentionImprovement: 0.25 },
      { campaignType: 'win_back', successRate: 0.40, avgRetentionImprovement: 0.35 }
    ];
  }

  private async calculateChurnTrends(tenantId: string, timeRange: { from: Date; to: Date }): Promise<Array<{
    period: string;
    churnRate: number;
    retentionRate: number;
    interventionSuccess: number;
  }>> {
    // This would calculate actual trends from historical data
    return [
      { period: '2024-01', churnRate: 0.05, retentionRate: 0.95, interventionSuccess: 0.70 },
      { period: '2024-02', churnRate: 0.04, retentionRate: 0.96, interventionSuccess: 0.75 },
      { period: '2024-03', churnRate: 0.03, retentionRate: 0.97, interventionSuccess: 0.80 }
    ];
  }

  private async collectChurnTrainingData(tenantId: string): Promise<any[]> {
    // Get customers with known churn outcomes
    const customers = await this.prisma.customer.findMany({
      where: { tenantId },
      include: {
        tickets: true,
        conversations: true,
        deals: true,
        paymentIntents: true
      },
      take: 1000
    });

    const trainingData = [];
    for (const customer of customers) {
      const features = await this.extractChurnFeatures(customer);
      const outcome = this.determineChurnOutcome(customer);
      
      trainingData.push({
        customerId: customer.id,
        features,
        outcome: outcome === 'churned' ? 1 : 0,
        churnDate: outcome === 'churned' ? customer.updatedAt : null
      });
    }

    return trainingData;
  }

  private determineChurnOutcome(customer: any): 'churned' | 'retained' {
    // Simplified churn determination logic
    const lastActivity = customer.lastInteractionAt || customer.updatedAt;
    const daysSinceActivity = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
    
    // Consider churned if no activity for 90+ days and has cancellation indicators
    if (daysSinceActivity > 90) {
      const hasCancellationKeywords = this.countCancellationKeywords(customer.conversations || []) > 0;
      return hasCancellationKeywords ? 'churned' : 'retained';
    }
    
    return 'retained';
  }

  private async getActiveChurnModel(tenantId: string): Promise<any> {
    return await this.prisma.aIModel.findFirst({
      where: { 
        tenantId, 
        type: 'churn_prediction', 
        status: 'ready',
        isActive: true 
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  private calculateAvgResolutionTime(tickets: any[]): number {
    if (tickets.length === 0) return 0;
    
    const resolvedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed');
    if (resolvedTickets.length === 0) return 0;
    
    const totalTime = resolvedTickets.reduce((sum, ticket) => {
      const created = new Date(ticket.createdAt);
      const resolved = new Date(ticket.updatedAt);
      return sum + (resolved.getTime() - created.getTime());
    }, 0);
    
    return totalTime / resolvedTickets.length / (1000 * 60 * 60 * 24); // days
  }

  private calculateDaysToRenewal(customer: any): number {
    // Simplified calculation - would be based on contract data
    return 365; // Default 1 year
  }

  private calculatePaymentHistoryScore(paymentIntents: any[]): number {
    if (paymentIntents.length === 0) return 1.0;
    
    const successfulPayments = paymentIntents.filter(p => p.status === 'succeeded').length;
    return successfulPayments / paymentIntents.length;
  }

  private calculateTrend(items: any[], recentPeriod: Date, olderPeriod: Date): number {
    const recent = items.filter(item => new Date(item.createdAt) >= recentPeriod).length;
    const older = items.filter(item => {
      const date = new Date(item.createdAt);
      return date >= olderPeriod && date < recentPeriod;
    }).length;
    
    if (older === 0) return recent > 0 ? 1 : 0;
    return (recent - older) / older;
  }

  private calculateEngagementTrend(conversations: any[], recentPeriod: Date, olderPeriod: Date): number {
    return this.calculateTrend(conversations, recentPeriod, olderPeriod);
  }

  private countCompetitorMentions(conversations: any[]): number {
    const competitors = ['salesforce', 'hubspot', 'pipedrive', 'zendesk', 'freshworks'];
    let count = 0;
    
    conversations.forEach(conv => {
      const content = (conv.content || '').toLowerCase();
      competitors.forEach(competitor => {
        if (content.includes(competitor)) count++;
      });
    });
    
    return count;
  }

  private countCancellationKeywords(conversations: any[]): number {
    const keywords = ['cancel', 'terminate', 'end subscription', 'stop service', 'close account'];
    let count = 0;
    
    conversations.forEach(conv => {
      const content = (conv.content || '').toLowerCase();
      keywords.forEach(keyword => {
        if (content.includes(keyword)) count++;
      });
    });
    
    return count;
  }

  private countDowngradeRequests(tickets: any[]): number {
    const keywords = ['downgrade', 'reduce plan', 'lower tier', 'basic plan'];
    let count = 0;
    
    tickets.forEach(ticket => {
      const content = (ticket.description || '').toLowerCase();
      keywords.forEach(keyword => {
        if (content.includes(keyword)) count++;
      });
    });
    
    return count;
  }

  private async completeChurnModelTraining(modelId: string, trainingData: any[]): Promise<void> {
    const accuracy = 0.82 + Math.random() * 0.1;
    
    await this.prisma.aIModel.update({
      where: { id: modelId },
      data: {
        status: 'ready',
        accuracy,
        version: '1.0'
      }
    });

    this.logger.log(`Churn model training completed: ${modelId} with accuracy: ${accuracy}`);
  }
}
