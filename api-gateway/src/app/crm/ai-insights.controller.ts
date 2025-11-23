import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard, Roles } from '@glavito/shared-auth';
import { AIIntelligenceService } from '@glavito/shared-ai';
import { PredictiveLeadScoringService } from '../ai/predictive-lead-scoring.service';
import { AdvancedChurnPreventionService } from '../ai/advanced-churn-prevention.service';
import { AISalesOptimizationService } from '../ai/ai-sales-optimization.service';
import { DatabaseService } from '@glavito/shared-database';

@Controller('crm/ai')
@ApiTags('CRM AI')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CrmAIController {
  constructor(
    private readonly aiService: AIIntelligenceService,
    private readonly leadScoring: PredictiveLeadScoringService,
    private readonly churnPrevention: AdvancedChurnPreventionService,
    private readonly salesOptimization: AISalesOptimizationService,
    private readonly db: DatabaseService,
  ) {}

  @Get('dashboard/insights')
  @Roles('admin', 'agent')
  @ApiOperation({ summary: 'Get AI-powered dashboard insights' })
  @ApiResponse({ status: 200, description: 'Dashboard insights retrieved successfully' })
  async getDashboardInsights(@Req() req: any) {
    const tenantId = req.user.tenantId;

    try {
      const [topLeads, atRiskDeals, churnAlerts] = await Promise.all([
        this.getTopLeads(tenantId, 5),
        this.getAtRiskDeals(tenantId, 5),
        this.getChurnAlerts(tenantId, 5),
      ]);

      const recommendations = await this.generateSmartRecommendations(tenantId, {
        topLeads,
        atRiskDeals,
        churnAlerts,
      });

      return {
        success: true,
        data: {
          topLeads,
          atRiskDeals,
          churnAlerts,
          recommendations,
        },
      };
    } catch (error) {
      console.error('Failed to get dashboard insights:', error);
      return {
        success: true,
        data: {
          topLeads: [],
          atRiskDeals: [],
          churnAlerts: [],
          recommendations: [],
        },
      };
    }
  }

  @Get('lead/:id/score')
  @Roles('admin', 'agent')
  @ApiOperation({ summary: 'Get AI lead score' })
  @ApiResponse({ status: 200, description: 'Lead score retrieved successfully' })
  async getLeadScore(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.user.tenantId;
    try {
      const score = await this.leadScoring.scoreLead(tenantId, id);
      return { success: true, data: score };
    } catch (error) {
      console.error(`Failed to score lead ${id}:`, error);
      return {
        success: false,
        error: 'Failed to calculate lead score',
      };
    }
  }

  @Get('deal/:id/win-probability')
  @Roles('admin', 'agent')
  @ApiOperation({ summary: 'Get deal win probability' })
  @ApiResponse({ status: 200, description: 'Win probability retrieved successfully' })
  async getDealWinProbability(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.user.tenantId;
    try {
      const prediction = await this.salesOptimization.predictDealWin(tenantId, id);
      return { success: true, data: prediction };
    } catch (error) {
      console.error(`Failed to predict deal win for ${id}:`, error);
      return {
        success: false,
        error: 'Failed to calculate win probability',
      };
    }
  }

  @Get('customer/:id/churn-risk')
  @Roles('admin', 'agent')
  @ApiOperation({ summary: 'Get customer churn risk' })
  @ApiResponse({ status: 200, description: 'Churn risk retrieved successfully' })
  async getChurnRisk(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.user.tenantId;
    try {
      const risk = await this.churnPrevention.assessChurnRisk(tenantId, id);
      return { success: true, data: risk };
    } catch (error) {
      console.error(`Failed to assess churn risk for ${id}:`, error);
      return {
        success: false,
        error: 'Failed to calculate churn risk',
      };
    }
  }

  private async getTopLeads(tenantId: string, limit: number) {
    try {
      const leads = await this.db.lead.findMany({
        where: { tenantId },
        orderBy: { score: 'desc' },
        take: limit,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          company: true,
          score: true,
          source: true,
        },
      });

      return leads.map(lead => ({
        id: lead.id,
        name: `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || lead.email,
        score: lead.score || 0,
        reason: this.getLeadScoreReason(lead.score || 0, lead.source),
        suggestedAction: this.getLeadSuggestedAction(lead.score || 0),
      }));
    } catch (error) {
      console.error('Failed to get top leads:', error);
      return [];
    }
  }

  private async getAtRiskDeals(tenantId: string, limit: number) {
    try {
      // Get deals that have been in negotiation for too long or are stalled
      const deals = await this.db.deal.findMany({
        where: {
          tenantId,
          stage: { in: ['QUALIFIED', 'PROPOSAL', 'NEGOTIATION'] },
        },
        orderBy: { updatedAt: 'asc' },
        take: limit * 2, // Get more to filter
        select: {
          id: true,
          name: true,
          title: true,
          stage: true,
          valueAmount: true,
          updatedAt: true,
          createdAt: true,
        },
      });

      // Calculate risk based on time in stage
      const now = Date.now();
      const dealsWithRisk = deals.map(deal => {
        const daysSinceUpdate = (now - new Date(deal.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
        const daysSinceCreation = (now - new Date(deal.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        
        let riskScore = 0;
        const riskFactors: string[] = [];

        if (daysSinceUpdate > 14) {
          riskScore += 30;
          riskFactors.push('No activity for 14+ days');
        }
        if (daysSinceCreation > 90) {
          riskScore += 25;
          riskFactors.push('Deal older than 90 days');
        }
        if (deal.stage === 'NEGOTIATION' && daysSinceUpdate > 7) {
          riskScore += 20;
          riskFactors.push('Stalled in negotiation');
        }
        if (!deal.valueAmount || deal.valueAmount === 0) {
          riskScore += 15;
          riskFactors.push('No deal value set');
        }

        return {
          ...deal,
          riskScore,
          riskFactors,
        };
      });

      return dealsWithRisk
        .filter(d => d.riskScore > 20)
        .sort((a, b) => b.riskScore - a.riskScore)
        .slice(0, limit)
        .map(deal => ({
          id: deal.id,
          name: deal.name || deal.title || 'Untitled Deal',
          riskScore: deal.riskScore,
          riskFactors: deal.riskFactors,
        }));
    } catch (error) {
      console.error('Failed to get at-risk deals:', error);
      return [];
    }
  }

  private async getChurnAlerts(tenantId: string, limit: number) {
    try {
      // Get customers with low health scores or declining engagement
      const customers = await this.db.customer.findMany({
        where: { tenantId },
        take: limit * 3,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          company: true,
          updatedAt: true,
          conversations: {
            take: 1,
            orderBy: { updatedAt: 'desc' },
            select: { updatedAt: true },
          },
        },
      });

      const now = Date.now();
      const customersWithRisk = customers.map(customer => {
        const lastInteraction = customer.updatedAt || 
                               customer.conversations[0]?.updatedAt || 
                               new Date(0);
        const daysSinceInteraction = (now - new Date(lastInteraction).getTime()) / (1000 * 60 * 60 * 24);

        let churnProbability = 0;
        let primaryReason = '';

        if (daysSinceInteraction > 90) {
          churnProbability = 0.8;
          primaryReason = 'No contact in 90+ days';
        } else if (daysSinceInteraction > 60) {
          churnProbability = 0.6;
          primaryReason = 'Decreasing engagement';
        } else if (daysSinceInteraction > 30) {
          churnProbability = 0.4;
          primaryReason = 'Low recent activity';
        }

        return {
          ...customer,
          churnProbability,
          primaryReason,
        };
      });

      return customersWithRisk
        .filter(c => c.churnProbability > 0.5)
        .sort((a, b) => b.churnProbability - a.churnProbability)
        .slice(0, limit)
        .map(customer => ({
          id: customer.id,
          customerName: customer.firstName || customer.lastName || 
                       `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 
                       customer.email || 
                       customer.company || 
                       'Unknown Customer',
          primaryReason: customer.primaryReason,
          churnProbability: customer.churnProbability,
        }));
    } catch (error) {
      console.error('Failed to get churn alerts:', error);
      return [];
    }
  }

  private async generateSmartRecommendations(tenantId: string, context: any) {
    const recommendations: Array<{
      title: string;
      description: string;
      actionLabel: string;
      priority?: 'high' | 'medium' | 'low';
    }> = [];

    if (context.topLeads.length > 0) {
      recommendations.push({
        title: 'Follow up with hot leads',
        description: `You have ${context.topLeads.length} high-scoring leads. Prioritize contact to increase conversion.`,
        actionLabel: 'View Hot Leads',
        priority: 'high',
      });
    }

    if (context.atRiskDeals.length > 0) {
      recommendations.push({
        title: 'Review stalled deals',
        description: `${context.atRiskDeals.length} deals are at risk of being lost. Schedule follow-up calls.`,
        actionLabel: 'View At-Risk Deals',
        priority: 'high',
      });
    }

    if (context.churnAlerts.length > 0) {
      recommendations.push({
        title: 'Prevent customer churn',
        description: `${context.churnAlerts.length} customers show churn signals. Launch retention campaign.`,
        actionLabel: 'Start Retention',
        priority: 'high',
      });
    }

    // Add general recommendations
    if (context.topLeads.length < 3 && context.atRiskDeals.length === 0) {
      recommendations.push({
        title: 'Generate more leads',
        description: 'Lead pipeline is low. Consider running a marketing campaign.',
        actionLabel: 'Create Campaign',
        priority: 'medium',
      });
    }

    return recommendations;
  }

  private getLeadScoreReason(score: number, source?: string): string {
    if (score > 80) return `Excellent engagement from ${source || 'multiple channels'}`;
    if (score > 60) return `Strong potential based on ${source || 'activity'}`;
    if (score > 40) return 'Moderate interest shown';
    return 'Early stage lead';
  }

  private getLeadSuggestedAction(score: number): string {
    if (score > 80) return 'Schedule demo ASAP';
    if (score > 60) return 'Send personalized email';
    if (score > 40) return 'Add to nurture campaign';
    return 'Continue monitoring';
  }
}
