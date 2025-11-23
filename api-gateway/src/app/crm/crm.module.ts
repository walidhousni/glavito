import { Module } from '@nestjs/common';
import { DatabaseModule } from '@glavito/shared-database';
import { RedisModule } from '@glavito/shared-redis';
import { AuthModule } from '../auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Lazy-load AI to satisfy linter
let AIModuleSafe: unknown;
let AIIntelligenceServiceSafe: unknown;
try {
  const ai = require('@glavito/shared-ai');
  AIModuleSafe = ai.AIModule;
  AIIntelligenceServiceSafe = ai.AIIntelligenceService;
} catch {
  AIModuleSafe = class OptionalAIModule {};
  AIIntelligenceServiceSafe = class OptionalAIService {};
}
import { LeadsService } from './leads.service';
import { DealsService } from './deals.service';
import { PipelinesService } from './pipelines.service';
import { LeadsController } from './leads.controller';
import { DealsController } from './deals.controller';
import { PipelinesController } from './pipelines.controller';
import { AnalyticsModule as SharedAnalyticsModule } from '@glavito/shared-analytics';
import { WorkflowModule as SharedWorkflowModule } from '@glavito/shared-workflow';
import { SegmentsController } from './segments.controller';
import { SegmentsService } from './segments.service';
import { CrmAnalyticsController } from './crm-analytics.controller';
import { CrmAnalyticsService } from './crm-analytics.service';
import { CustomFieldsController } from './custom-fields.controller';
import { CustomFieldsService } from './custom-fields.service';
import { CrmCacheService } from './crm-cache.service';
import { CrmBackgroundService } from './crm-background.service';
import { CrmPerformanceService } from './crm-performance.service';
import { CrmPerformanceController } from './crm-performance.controller';
import { CrmSearchService } from './crm-search.service';
import { CrmSearchController } from './crm-search.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../email/email.module';
import { CrmAIController } from './ai-insights.controller';
import { PredictiveLeadScoringService } from '../ai/predictive-lead-scoring.service';
import { AdvancedChurnPreventionService } from '../ai/advanced-churn-prevention.service';
import { AISalesOptimizationService } from '../ai/ai-sales-optimization.service';
// Phase 2: Enhanced CRM Services
import { LeadScoringService } from './services/lead-scoring.service';
import { QuoteService } from './services/quote.service';
import { LeadScoringController } from './controllers/lead-scoring.controller';
import { QuotesController } from './controllers/quotes.controller';
// CRM Upgrade: Timeline and Links
import { CrmTimelineService } from './crm-timeline.service';
import { CrmTimelineController } from './crm-timeline.controller';
import { CrmLinksService } from './crm-links.service';
import { CrmLinksController } from './crm-links.controller';

// Make Kafka optional to avoid static import of lazy-loaded library
let KafkaModuleSafe: unknown;
try {
  KafkaModuleSafe = require('@glavito/shared-kafka').KafkaModule;
} catch {
  KafkaModuleSafe = class OptionalKafkaModule {};
}

@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    KafkaModuleSafe as never,
    AIModuleSafe as never,
    SharedAnalyticsModule,
    SharedWorkflowModule.forFeature(),
    NotificationsModule,
    EmailModule,
    AuthModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN', '24h') },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [
    LeadsController,
    DealsController,
    PipelinesController,
    SegmentsController,
    CrmAnalyticsController,
    CustomFieldsController,
    CrmPerformanceController,
    CrmSearchController,
    CrmAIController,
    // Phase 2
    LeadScoringController,
    QuotesController,
    // CRM Upgrade
    CrmTimelineController,
    CrmLinksController
  ],
  providers: [
    LeadsService,
    DealsService,
    PipelinesService,
    SegmentsService,
    CrmAnalyticsService,
    CustomFieldsService,
    CrmCacheService,
    CrmBackgroundService,
    CrmPerformanceService,
    CrmSearchService,
    AIIntelligenceServiceSafe as never,
    PredictiveLeadScoringService,
    AdvancedChurnPreventionService,
    AISalesOptimizationService,
    // Phase 2
    LeadScoringService,
    QuoteService,
    // CRM Upgrade
    CrmTimelineService,
    CrmLinksService
  ],
  exports: [
    LeadsService,
    DealsService,
    PipelinesService,
    SegmentsService,
    CrmAnalyticsService,
    CustomFieldsService,
    CrmCacheService,
    CrmBackgroundService,
    CrmPerformanceService,
    CrmSearchService,
    // Phase 2
    LeadScoringService,
    QuoteService,
    // CRM Upgrade
    CrmTimelineService,
    CrmLinksService
  ],
})
export class CrmModule {}


