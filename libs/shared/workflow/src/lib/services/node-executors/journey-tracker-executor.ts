import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { NodeExecutor, FlowExecutionContext } from '../flow-execution.service';

/**
 * Journey Tracker Node Executor
 * 
 * Integrates with IntelligentCustomerJourneyService to track and optimize customer journeys.
 * Records journey checkpoints, stages, and provides real-time recommendations.
 * 
 * Use cases:
 * - Track onboarding progress
 * - Monitor customer lifecycle stages
 * - Get next-best-action recommendations
 * - Identify journey bottlenecks
 */
@Injectable()
export class JourneyTrackerNodeExecutor implements NodeExecutor {
  private readonly logger = new Logger(JourneyTrackerNodeExecutor.name);

  constructor(
    @Optional() @Inject('CUSTOMER_JOURNEY_SERVICE') 
    private readonly journeyService?: {
      generateCustomerJourney: (tenantId: string, customerId: string) => Promise<{
        timeline: { currentStage: string; totalDuration: number };
        optimization: { efficiency: number; bottlenecks: Array<{ stage: string; issue: string; impact: string }> };
        insights: { totalTouchpoints: number; avgEngagement: number; satisfactionTrend: string; nextBestAction: string; riskFactors: string[] };
      }>;
      generateJourneyOptimizationRecommendations: (tenantId: string, customerId: string) => Promise<Array<{
        type: string;
        recommendation: string;
        priority: string;
        impact: string;
      }>>;
    }
  ) {}

  canHandle(nodeKind: string): boolean {
    return nodeKind === 'journey_checkpoint' || 
           nodeKind === 'journey_stage' || 
           nodeKind === 'customer_journey';
  }

  async execute(node: Record<string, unknown>, context: FlowExecutionContext): Promise<Record<string, unknown>> {
    const config = (node['config'] || {}) as Record<string, unknown>;

    // Validate required data
    if (!context.customerId) {
      this.logger.warn('Journey tracking requires customerId');
      return {
        tracked: false,
        error: 'No customer ID provided',
      };
    }

    if (!this.journeyService) {
      this.logger.warn('Customer journey service not available');
      return {
        tracked: false,
        serviceUnavailable: true,
      };
    }

    try {
      // Generate or update customer journey map
      const journey = await this.journeyService.generateCustomerJourney(
        context.tenantId,
        context.customerId
      );

      this.logger.log(
        `Journey tracked for customer ${context.customerId}: stage=${journey.timeline.currentStage}`
      );

      // Get optimization recommendations if requested
      let recommendations = null;
      if (config['getRecommendations'] !== false) {
        try {
          recommendations = await this.journeyService.generateJourneyOptimizationRecommendations(
            context.tenantId,
            context.customerId
          );
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.warn(`Failed to get recommendations: ${errorMessage}`);
        }
      }

      // Store journey data in context
      context.variables['journeyStage'] = journey.timeline.currentStage;
      context.variables['journeyDuration'] = journey.timeline.totalDuration;
      context.variables['journeyEfficiency'] = journey.optimization.efficiency;
      context.variables['nextBestAction'] = journey.insights.nextBestAction;
      context.variables['journeyRiskFactors'] = journey.insights.riskFactors;

      // Record checkpoint if stage name provided
      const stageName = config['stageName'];
      if (stageName && typeof stageName === 'string') {
        await this.recordCheckpoint(stageName, context);
      }

      // Determine output path based on journey stage or efficiency
      let outputPath = 'default';
      
      if (config['routeByStage'] && journey.timeline.currentStage) {
        outputPath = journey.timeline.currentStage.toLowerCase().replace(/\s+/g, '_');
      } else if (config['routeByEfficiency']) {
        if (journey.optimization.efficiency < 0.5) {
          outputPath = 'low_efficiency';
        } else if (journey.optimization.efficiency < 0.7) {
          outputPath = 'medium_efficiency';
        } else {
          outputPath = 'high_efficiency';
        }
      }

      return {
        outputPath,
        tracked: true,
        journey: {
          currentStage: journey.timeline.currentStage,
          duration: journey.timeline.totalDuration,
          totalTouchpoints: journey.insights.totalTouchpoints,
          avgEngagement: journey.insights.avgEngagement,
          satisfactionTrend: journey.insights.satisfactionTrend,
        },
        nextBestAction: journey.insights.nextBestAction,
        riskFactors: journey.insights.riskFactors,
        efficiency: journey.optimization.efficiency,
        bottlenecks: journey.optimization.bottlenecks.map((b: { stage: string; issue: string; impact: string }) => ({
          stage: b.stage,
          issue: b.issue,
          impact: b.impact,
        })),
        recommendations: recommendations?.slice(0, 3).map((r: { type: string; recommendation: string; priority: string; impact: string }) => ({
          type: r.type,
          recommendation: r.recommendation,
          priority: r.priority,
          impact: r.impact,
        })),
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Journey tracking failed: ${errorMessage}`, errorStack);
      return {
        tracked: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Record a journey checkpoint (optional helper for future use)
   */
  private async recordCheckpoint(stageName: string, context: FlowExecutionContext): Promise<void> {
    this.logger.log(`Journey checkpoint: ${stageName} for customer ${context.customerId}`);
    
    // Store in context for other nodes to use
    if (!context.variables['journeyCheckpoints']) {
      context.variables['journeyCheckpoints'] = [];
    }
    
    const checkpoints = context.variables['journeyCheckpoints'] as Array<{ stage: string; timestamp: Date; flowRunId?: string }>;
    const contextExt = context as unknown as Record<string, unknown>;
    checkpoints.push({
      stage: stageName,
      timestamp: new Date(),
      flowRunId: contextExt['runId'] as string,
    });
  }
}

