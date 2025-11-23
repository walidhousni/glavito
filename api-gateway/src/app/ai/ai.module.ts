import { Module } from '@nestjs/common';
import { AIController } from './ai.controller';
import { PredictiveAnalyticsController } from './predictive-analytics.controller';
import { AIModule as SharedAIModule } from '@glavito/shared-ai';
import { ConversationModule } from '@glavito/shared-conversation';
import { ProductToolAdapter } from './tools/product-tool.adapter';
import { OrderToolAdapter } from './tools/order-tool.adapter';
import { CustomerToolAdapter } from './tools/customer-tool.adapter';
import { ORDER_TOOL_TOKEN, PRODUCT_TOOL_TOKEN, CUSTOMER_TOOL_TOKEN } from './tools/tokens';
import { DatabaseModule } from '@glavito/shared-database';
import { RedisModule } from '@glavito/shared-redis';
import { CrmModule } from '../crm/crm.module';
import { WalletModule } from '../wallet/wallet.module';
import { PredictiveLeadScoringService } from './predictive-lead-scoring.service';
import { AdvancedChurnPreventionService } from './advanced-churn-prevention.service';
import { AISalesOptimizationService } from './ai-sales-optimization.service';
import { IntelligentCustomerJourneyService } from './intelligent-customer-journey.service';
import { AIModelManagementService } from './ai-model-management.service';
import { AIOrchestratorService } from './ai-orchestrator.service';
import { GlavaiAutoResolveService } from './glavai-auto-resolve.service';
import { GlavaiInsightsService } from './glavai-insights.service';
import { forwardRef } from '@nestjs/common';

@Module({
  imports: [SharedAIModule, DatabaseModule, RedisModule, CrmModule, ConversationModule, WalletModule],
  controllers: [AIController, PredictiveAnalyticsController],
  providers: [
    PredictiveLeadScoringService,
    AdvancedChurnPreventionService,
    AISalesOptimizationService,
    IntelligentCustomerJourneyService,
    AIModelManagementService,
    AIOrchestratorService,
    GlavaiAutoResolveService,
    GlavaiInsightsService,
    // AI Tool Adapters
    ProductToolAdapter,
    OrderToolAdapter,
    CustomerToolAdapter,
    { provide: PRODUCT_TOOL_TOKEN, useExisting: ProductToolAdapter },
    { provide: ORDER_TOOL_TOKEN, useExisting: OrderToolAdapter },
    { provide: CUSTOMER_TOOL_TOKEN, useExisting: CustomerToolAdapter },
  ],
  exports: [
    PredictiveLeadScoringService,
    AdvancedChurnPreventionService,
    AISalesOptimizationService,
    IntelligentCustomerJourneyService,
    AIModelManagementService,
    AIOrchestratorService,
    GlavaiAutoResolveService,
    GlavaiInsightsService,
  ],
})
export class AIModule {}