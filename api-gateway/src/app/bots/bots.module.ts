import { Module } from '@nestjs/common';
import type { Provider } from '@nestjs/common';
import { DatabaseModule } from '@glavito/shared-database';
// Make Kafka optional and avoid static import per lazy-load policy
let KafkaModuleSafe: unknown;
try {
  KafkaModuleSafe = require('@glavito/shared-kafka').KafkaModule;
} catch {
  KafkaModuleSafe = class OptionalKafkaModule {};
}
import { BotsController } from './bots.controller';
import { BotsService } from './bots.service';
import { AutopilotProcessorService } from './autopilot-processor.service';
import { ActionRegistryService } from './action-registry.service';
import { IntegrationsModule } from '../integrations/integrations.module';

// AI provider token (mirrors conversations.module.ts pattern)
const AI_SERVICE_TOKEN = 'AI_INTELLIGENCE_SERVICE';
let AIServiceProvider: Provider;
try {
  const ai = require('@glavito/shared-ai');
  AIServiceProvider = { provide: AI_SERVICE_TOKEN, useExisting: ai.AIIntelligenceService } as Provider;
} catch {
  AIServiceProvider = { provide: AI_SERVICE_TOKEN, useValue: {} } as Provider;
}

// Event bus provider token to avoid static import
const EVENT_BUS_TOKEN = 'ADVANCED_EVENT_BUS';
let EventBusProvider: Provider;
try {
  const kafka = require('@glavito/shared-kafka');
  EventBusProvider = { provide: EVENT_BUS_TOKEN, useExisting: kafka.AdvancedEventBusService } as Provider;
} catch {
  EventBusProvider = { provide: EVENT_BUS_TOKEN, useValue: null } as Provider;
}

@Module({
  imports: [DatabaseModule, KafkaModuleSafe as unknown as never, IntegrationsModule],
  controllers: [BotsController],
  providers: [BotsService, AutopilotProcessorService, ActionRegistryService, AIServiceProvider, EventBusProvider],
  exports: [BotsService, AutopilotProcessorService, ActionRegistryService],
})
export class BotsModule {}


