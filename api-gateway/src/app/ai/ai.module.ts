import { Module } from '@nestjs/common';
import { AIController } from './ai.controller';
import { PredictiveAnalyticsController } from './predictive-analytics.controller';
import { AIModule as SharedAIModule } from '@glavito/shared-ai';
import { DatabaseModule } from '@glavito/shared-database';
import { RedisModule } from '@glavito/shared-redis';
import { CrmModule } from '../crm/crm.module';
import { PredictiveLeadScoringService } from './predictive-lead-scoring.service';
import { AdvancedChurnPreventionService } from './advanced-churn-prevention.service';
import { AISalesOptimizationService } from './ai-sales-optimization.service';
import { IntelligentCustomerJourneyService } from './intelligent-customer-journey.service';
import { AIModelManagementService } from './ai-model-management.service';

@Module({
  imports: [SharedAIModule, DatabaseModule, RedisModule, CrmModule],
  controllers: [AIController, PredictiveAnalyticsController],
  providers: [
    PredictiveLeadScoringService,
    AdvancedChurnPreventionService,
    AISalesOptimizationService,
    IntelligentCustomerJourneyService,
    AIModelManagementService
  ],
  exports: [
    PredictiveLeadScoringService,
    AdvancedChurnPreventionService,
    AISalesOptimizationService,
    IntelligentCustomerJourneyService,
    AIModelManagementService
  ]
})
export class AIModule {}