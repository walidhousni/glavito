import { Module } from '@nestjs/common';
import { DatabaseModule } from '@glavito/shared-database';
import { AIIntelligenceService, AIModule } from '@glavito/shared-ai';
import { RedisModule } from '@glavito/shared-redis';
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

// Make Kafka optional to avoid static import of lazy-loaded library
let KafkaModuleSafe: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  KafkaModuleSafe = require('@glavito/shared-kafka').KafkaModule;
} catch {
  KafkaModuleSafe = class OptionalKafkaModule {};
}

@Module({
  imports: [DatabaseModule, RedisModule, KafkaModuleSafe, AIModule, SharedAnalyticsModule, SharedWorkflowModule.forFeature()],
  controllers: [LeadsController, DealsController, PipelinesController, SegmentsController, CrmAnalyticsController, CustomFieldsController, CrmPerformanceController, CrmSearchController],
  providers: [LeadsService, DealsService, PipelinesService, SegmentsService, CrmAnalyticsService, CustomFieldsService, CrmCacheService, CrmBackgroundService, CrmPerformanceService, CrmSearchService, AIIntelligenceService],
  exports: [LeadsService, DealsService, PipelinesService, SegmentsService, CrmAnalyticsService, CustomFieldsService, CrmCacheService, CrmBackgroundService, CrmPerformanceService, CrmSearchService],
})
export class CrmModule {}


