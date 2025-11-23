import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CustomersController } from './customers.controller';
import { Customer360Controller } from './customer-360.controller';
import { SatisfactionController } from './satisfaction.controller';
import { CustomersService } from './customers.service';
import { CustomerSatisfactionService } from './customer-satisfaction.service';
import { DatabaseModule } from '@glavito/shared-database';
// Make Kafka optional like other modules
let KafkaModuleSafe: any;
let EventPublisherServiceSafe: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const kafka = require('@glavito/shared-kafka');
  KafkaModuleSafe = kafka.KafkaModule;
  EventPublisherServiceSafe = kafka.EventPublisherService;
} catch {
  KafkaModuleSafe = class OptionalKafkaModule {};
}
import { CustomerAnalyticsService } from './customer-analytics.service';
import { AIModule as SharedAIModule } from '@glavito/shared-ai';
// Provide AI service via explicit token to avoid static import metadata issues
const AI_SERVICE_TOKEN = 'AI_INTELLIGENCE_SERVICE';
let AIServiceProvider: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ai = require('@glavito/shared-ai');
  AIServiceProvider = { provide: AI_SERVICE_TOKEN, useExisting: ai.AIIntelligenceService };
} catch {
  AIServiceProvider = { provide: AI_SERVICE_TOKEN, useValue: {} as any };
}
import { WorkflowModule as SharedWorkflowModule } from '@glavito/shared-workflow'
// Import local AIModule for predictive analytics services
let LocalAIModule: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const localAI = require('../ai/ai.module');
  LocalAIModule = localAI.AIModule;
} catch {
  LocalAIModule = class OptionalAIModule {};
}

@Module({
  imports: [
    DatabaseModule,
    KafkaModuleSafe,
    SharedAIModule,
    HttpModule,
    SharedWorkflowModule.forFeature(),
    forwardRef(() => LocalAIModule),
  ],
  controllers: [CustomersController, Customer360Controller, SatisfactionController],
  providers: [
    CustomersService,
    CustomerAnalyticsService,
    CustomerSatisfactionService,
    AIServiceProvider,
    (EventPublisherServiceSafe
      ? { provide: 'EVENT_PUBLISHER', useExisting: EventPublisherServiceSafe }
      : { provide: 'EVENT_PUBLISHER', useValue: { emit: (_event: string, _payload: Record<string, unknown>) => undefined } }
    ) as any,
  ],
  exports: [CustomersService, CustomerAnalyticsService, CustomerSatisfactionService],
})
export class CustomersModule {}