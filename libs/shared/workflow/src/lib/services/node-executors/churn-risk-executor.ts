import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { NodeExecutor, FlowExecutionContext } from '../flow-execution.service';

/**
 * Churn Risk Node Executor
 * 
 * Integrates with AdvancedChurnPreventionService to assess customer churn risk.
 * Automatically creates retention campaigns for high-risk customers.
 * 
 * Output paths: 'low', 'medium', 'high', 'critical'
 */
@Injectable()
export class ChurnRiskNodeExecutor implements NodeExecutor {
  private readonly logger = new Logger(ChurnRiskNodeExecutor.name);

  constructor(
    @Optional() @Inject('CHURN_PREVENTION_SERVICE') 
    private readonly churnService?: {
      assessChurnRisk: (tenantId: string, customerId: string) => Promise<{
        riskLevel: string;
        riskScore: number;
        probability: number;
        confidence: number;
        factors: Array<{ factor: string; impact: number }>;
        interventionSuggestions: string[];
        retentionActions: string[];
        timeline: string;
      }>;
      createRetentionCampaign: (tenantId: string, customerId: string, type: string) => Promise<{ id: string }>;
    }
  ) {}

  canHandle(nodeKind: string): boolean {
    return nodeKind === 'churn_risk_check' || nodeKind === 'churn_assessment';
  }

  async execute(node: Record<string, unknown>, context: FlowExecutionContext): Promise<Record<string, unknown>> {
    const config = (node['config'] || {}) as Record<string, unknown>;

    // Validate required data
    if (!context.customerId) {
      this.logger.warn('Churn risk check requires customerId');
      return {
        outputPath: 'unknown',
        skip: true,
        error: 'No customer ID provided',
      };
    }

    if (!this.churnService) {
      this.logger.warn('Churn prevention service not available');
      return {
        outputPath: (config['defaultOutput'] as string) || 'unknown',
        skip: true,
        serviceUnavailable: true,
      };
    }

    try {
      // Assess churn risk
      const assessment = await this.churnService.assessChurnRisk(
        context.tenantId,
        context.customerId
      );

      this.logger.log(
        `Churn risk for customer ${context.customerId}: ${assessment.riskLevel} (${assessment.riskScore}%)`
      );

      // Auto-create retention campaign if configured and risk is high
      if (config['autoCreateCampaign'] && (assessment.riskLevel === 'critical' || assessment.riskLevel === 'high')) {
        try {
          const campaignType = assessment.riskLevel === 'critical' ? 'reactive' : 'proactive';
          const campaign = await this.churnService.createRetentionCampaign(
            context.tenantId,
            context.customerId,
            campaignType
          );
          
          this.logger.log(`Created ${campaignType} retention campaign: ${campaign.id}`);
          
          context.variables['retentionCampaignId'] = campaign.id;
          context.variables['retentionCampaign'] = campaign;
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(`Failed to create retention campaign: ${errorMessage}`);
        }
      }

      // Store assessment in context
      context.variables['churnRisk'] = assessment.riskLevel;
      context.variables['churnProbability'] = assessment.probability;
      context.variables['churnAssessment'] = assessment;

      // Determine output path based on risk level
      const outputPath = assessment.riskLevel; // 'low', 'medium', 'high', 'critical'

      return {
        outputPath,
        riskLevel: assessment.riskLevel,
        riskScore: assessment.riskScore,
        probability: assessment.probability,
        confidence: assessment.confidence,
        factors: assessment.factors.slice(0, 5), // Top 5 factors
        interventions: assessment.interventionSuggestions,
        retentionActions: assessment.retentionActions,
        timeline: assessment.timeline,
        campaignCreated: !!context.variables['retentionCampaignId'],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Churn risk assessment failed: ${errorMessage}`, errorStack);
      return {
        outputPath: 'error',
        error: errorMessage,
        fallback: true,
      };
    }
  }
}

