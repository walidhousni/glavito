import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';

export interface ScoreCalculationResult {
  score: number;
  breakdown: Record<string, number>;
  reason: string[];
  predictedValue?: number;
  conversionProbability?: number;
}

export interface ScoringRule {
  field: string;
  operator: string; // equals | contains | greater_than | less_than | exists
  value?: any;
  points: number;
  description: string;
}

@Injectable()
export class LeadScoringService {
  private readonly logger = new Logger(LeadScoringService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Calculate lead score based on scoring model
   */
  async calculateLeadScore(
    leadId: string,
    scoringModelId?: string
  ): Promise<ScoreCalculationResult> {
    const lead = await this.db.lead.findUnique({
      where: { id: leadId },
      include: {
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 50
        },
        tenant: {
          include: {
            industryProfile: true
          }
        }
      }
    });

    if (!lead) {
      throw new Error(`Lead ${leadId} not found`);
    }

    // Get scoring model
    let scoringModel = null;
    if (scoringModelId) {
      scoringModel = await this.db.leadScoringModel.findUnique({
        where: { id: scoringModelId }
      });
    } else {
      // Use default model for tenant's industry
      const industry = lead.tenant.industryProfile?.primaryIndustry;
      scoringModel = await this.db.leadScoringModel.findFirst({
        where: {
          tenantId: lead.tenantId,
          OR: [
            { isDefault: true },
            { industry: industry }
          ]
        },
        orderBy: { isDefault: 'desc' }
      });
    }

    if (!scoringModel) {
      // Use basic scoring if no model exists
      return this.basicScoring(lead);
    }

    // Calculate score using model rules
    return this.applyRules(lead, scoringModel);
  }

  /**
   * Apply scoring rules to lead
   */
  private async applyRules(lead: any, model: any): Promise<ScoreCalculationResult> {
    const rules = model.rules as ScoringRule[];
    const weights = model.weightConfig as Record<string, number>;
    
    let totalScore = 0;
    const breakdown: Record<string, number> = {};
    const reasons: string[] = [];

    // Apply each rule
    for (const rule of rules) {
      const points = this.evaluateRule(rule, lead);
      if (points > 0) {
        totalScore += points;
        breakdown[rule.field] = points;
        reasons.push(rule.description);
      }
    }

    // Apply demographic weights
    if (weights.demographic) {
      const demoScore = this.calculateDemographicScore(lead, weights.demographic);
      totalScore += demoScore;
      breakdown.demographic = demoScore;
    }

    // Apply engagement weights
    if (weights.engagement) {
      const engagementScore = this.calculateEngagementScore(lead, weights.engagement);
      totalScore += engagementScore;
      breakdown.engagement = engagementScore;
    }

    // Apply behavioral weights
    if (weights.behavioral) {
      const behaviorScore = this.calculateBehavioralScore(lead, weights.behavioral);
      totalScore += behaviorScore;
      breakdown.behavioral = behaviorScore;
    }

    // Cap score at 100
    totalScore = Math.min(100, Math.max(0, totalScore));

    // ML predictions if available
    let predictedValue: number | undefined;
    let conversionProbability: number | undefined;

    if (model.mlModelType && model.mlModelPath) {
      const mlPrediction = await this.applyMLModel(lead, model);
      predictedValue = mlPrediction.predictedValue;
      conversionProbability = mlPrediction.conversionProbability;
    }

    return {
      score: Math.round(totalScore),
      breakdown,
      reason: reasons,
      predictedValue,
      conversionProbability
    };
  }

  /**
   * Evaluate a single scoring rule
   */
  private evaluateRule(rule: ScoringRule, lead: any): number {
    const fieldValue = this.getFieldValue(rule.field, lead);

    switch (rule.operator) {
      case 'equals':
        return fieldValue === rule.value ? rule.points : 0;
      
      case 'contains':
        if (typeof fieldValue === 'string') {
          return fieldValue.includes(rule.value) ? rule.points : 0;
        }
        if (Array.isArray(fieldValue)) {
          return fieldValue.includes(rule.value) ? rule.points : 0;
        }
        return 0;
      
      case 'greater_than':
        return fieldValue > rule.value ? rule.points : 0;
      
      case 'less_than':
        return fieldValue < rule.value ? rule.points : 0;
      
      case 'exists':
        return fieldValue != null ? rule.points : 0;
      
      default:
        return 0;
    }
  }

  /**
   * Get field value from lead object (supports dot notation)
   */
  private getFieldValue(fieldPath: string, lead: any): any {
    const parts = fieldPath.split('.');
    let value = lead;
    
    for (const part of parts) {
      if (value == null) return null;
      value = value[part];
    }
    
    return value;
  }

  /**
   * Calculate demographic score
   */
  private calculateDemographicScore(lead: any, weight: number): number {
    let score = 0;

    // Company size (estimated from company name or custom fields)
    if (lead.company) {
      score += 5;
    }

    // Contact information completeness
    if (lead.email) score += 3;
    if (lead.phone) score += 3;
    if (lead.firstName && lead.lastName) score += 2;

    // Job title importance (if available in custom fields)
    const title = lead.customFields?.title || lead.title;
    if (title) {
      const importantTitles = ['ceo', 'director', 'manager', 'vp', 'president', 'owner'];
      const isImportant = importantTitles.some(t => 
        title.toLowerCase().includes(t)
      );
      if (isImportant) score += 10;
    }

    return score * weight;
  }

  /**
   * Calculate engagement score based on activities
   */
  private calculateEngagementScore(lead: any, weight: number): number {
    let score = 0;
    const activities = lead.activities || [];

    // Activity count (more engaged)
    score += Math.min(20, activities.length * 2);

    // Recent activity (engaged in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentActivities = activities.filter((a: any) => 
      new Date(a.createdAt) > sevenDaysAgo
    );
    
    score += Math.min(15, recentActivities.length * 3);

    // Activity type diversity
    const activityTypes = new Set(activities.map((a: any) => a.type));
    score += Math.min(10, activityTypes.size * 2);

    return score * weight;
  }

  /**
   * Calculate behavioral score
   */
  private calculateBehavioralScore(lead: any, weight: number): number {
    let score = 0;

    // Lead source quality
    const qualitySources = ['referral', 'partner', 'event', 'webinar'];
    if (qualitySources.includes(lead.source)) {
      score += 15;
    }

    // Tags (indicate interest areas)
    if (lead.tags && lead.tags.length > 0) {
      score += Math.min(10, lead.tags.length * 2);
    }

    // Time since creation (fresh leads are warmer)
    const daysSinceCreation = Math.floor(
      (Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceCreation <= 3) {
      score += 10;
    } else if (daysSinceCreation <= 7) {
      score += 5;
    }

    return score * weight;
  }

  /**
   * Basic scoring when no model is configured
   */
  private basicScoring(lead: any): ScoreCalculationResult {
    let score = 0;
    const breakdown: Record<string, number> = {};
    const reasons: string[] = [];

    // Contact completeness
    const contactScore = (lead.email ? 10 : 0) + (lead.phone ? 10 : 0) + (lead.company ? 10 : 0);
    score += contactScore;
    breakdown.contact_info = contactScore;
    if (contactScore > 0) reasons.push('Complete contact information');

    // Activity level
    const activityCount = lead.activities?.length || 0;
    const activityScore = Math.min(30, activityCount * 5);
    score += activityScore;
    breakdown.engagement = activityScore;
    if (activityScore > 0) reasons.push(`${activityCount} interactions`);

    // Source quality
    const qualitySources = ['referral', 'partner', 'event'];
    if (qualitySources.includes(lead.source)) {
      score += 20;
      breakdown.source_quality = 20;
      reasons.push('High-quality lead source');
    }

    return {
      score: Math.min(100, score),
      breakdown,
      reason: reasons
    };
  }

  /**
   * Apply ML model for predictions (placeholder for future ML integration)
   */
  private async applyMLModel(lead: any, model: any): Promise<{
    predictedValue?: number;
    conversionProbability?: number;
  }> {
    // TODO: Integrate with ML service when ready
    // For now, return estimated values based on score
    
    const score = lead.score || 50;
    
    return {
      predictedValue: undefined,
      conversionProbability: score / 100 // Simple estimation
    };
  }

  /**
   * Update lead score in database
   */
  async updateLeadScore(leadId: string, result: ScoreCalculationResult, modelId?: string) {
    const scoreHistory = await this.db.lead.findUnique({
      where: { id: leadId },
      select: { scoreHistory: true }
    });

    const history = scoreHistory?.scoreHistory as any[] || [];
    history.push({
      score: result.score,
      calculatedAt: new Date(),
      modelId,
      breakdown: result.breakdown
    });

    // Keep only last 50 score calculations
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }

    await this.db.lead.update({
      where: { id: leadId },
      data: {
        score: result.score,
        scoreReason: result.breakdown,
        scoreHistory: history as any,
        scoringModelId: modelId,
        predictedValue: result.predictedValue,
        conversionProbability: result.conversionProbability,
        updatedAt: new Date()
      }
    });

    // Update model stats
    if (modelId) {
      await this.db.leadScoringModel.update({
        where: { id: modelId },
        data: {
          totalLeadsScored: { increment: 1 }
        }
      });
    }

    this.logger.log(`Updated score for lead ${leadId}: ${result.score}`);
  }

  /**
   * Bulk score leads for a tenant
   */
  async scoreAllLeads(tenantId: string, modelId?: string): Promise<{
    total: number;
    updated: number;
    failed: number;
  }> {
    const leads = await this.db.lead.findMany({
      where: {
        tenantId,
        status: { notIn: ['CONVERTED', 'LOST'] }
      },
      select: { id: true }
    });

    let updated = 0;
    let failed = 0;

    for (const lead of leads) {
      try {
        const result = await this.calculateLeadScore(lead.id, modelId);
        await this.updateLeadScore(lead.id, result, modelId);
        updated++;
      } catch (error) {
        this.logger.error(`Failed to score lead ${lead.id}: ${error}`);
        failed++;
      }
    }

    return {
      total: leads.length,
      updated,
      failed
    };
  }

  /**
   * Get lead scoring model analytics
   */
  async getModelAnalytics(modelId: string) {
    const model = await this.db.leadScoringModel.findUnique({
      where: { id: modelId },
      include: {
        leads: {
          select: {
            score: true,
            status: true,
            convertedAt: true
          }
        }
      }
    });

    if (!model) {
      throw new Error(`Scoring model ${modelId} not found`);
    }

    const leads = model.leads;
    const convertedLeads = leads.filter(l => l.status === 'CONVERTED');

    // Calculate statistics
    const avgScore = leads.length > 0
      ? leads.reduce((sum, l) => sum + l.score, 0) / leads.length
      : 0;

    const conversionRate = leads.length > 0
      ? (convertedLeads.length / leads.length) * 100
      : 0;

    // Score distribution
    const scoreRanges = {
      '0-20': 0,
      '21-40': 0,
      '41-60': 0,
      '61-80': 0,
      '81-100': 0
    };

    for (const lead of leads) {
      if (lead.score <= 20) scoreRanges['0-20']++;
      else if (lead.score <= 40) scoreRanges['21-40']++;
      else if (lead.score <= 60) scoreRanges['41-60']++;
      else if (lead.score <= 80) scoreRanges['61-80']++;
      else scoreRanges['81-100']++;
    }

    return {
      model: {
        id: model.id,
        name: model.name,
        industry: model.industry,
        totalLeadsScored: model.totalLeadsScored
      },
      statistics: {
        avgScore: Math.round(avgScore),
        conversionRate: Math.round(conversionRate * 100) / 100,
        totalLeads: leads.length,
        convertedLeads: convertedLeads.length,
        scoreDistribution: scoreRanges
      }
    };
  }
}

