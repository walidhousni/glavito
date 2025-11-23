import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { DatabaseModule } from '@glavito/shared-database';
import { TicketsRoutingService } from './tickets-routing.service';
import { TicketsGateway } from './tickets.gateway';
import { TicketsSearchService } from './tickets-search.service';
import { CustomersModule } from '../customers/customers.module';
import { SLAModule } from '../sla/sla.module';
import { NotificationsModule } from '../notifications/notifications.module';
// Avoid static import of lazy-loaded kafka service
import { TicketsMarketingListenerService } from './tickets-marketing-listener.service';

// Make Kafka optional and expose a safe event publisher token
let KafkaModuleSafe: unknown;
let EventPublisherServiceSafe: unknown;
let AIModuleSafe: unknown;
let AIServiceSafe: unknown;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const kafka = require('@glavito/shared-kafka');
  KafkaModuleSafe = kafka.KafkaModule;
  EventPublisherServiceSafe = kafka.EventPublisherService;
} catch {
  KafkaModuleSafe = class OptionalKafkaModule {};
  EventPublisherServiceSafe = null as unknown as undefined;
}
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ai = require('@glavito/shared-ai');
  AIModuleSafe = ai.AIModule;
  AIServiceSafe = ai.AIIntelligenceService;
} catch {
  AIModuleSafe = class OptionalAIModule {};
  AIServiceSafe = null as unknown as undefined;
}
const EVENT_PUBLISHER_TOKEN = 'EVENT_PUBLISHER';
const EventPublisherProvider = EventPublisherServiceSafe
  ? { provide: EVENT_PUBLISHER_TOKEN, useExisting: EventPublisherServiceSafe as any }
  : { provide: EVENT_PUBLISHER_TOKEN, useValue: {} };
const AI_SERVICE_TOKEN = 'AI_INTELLIGENCE_SERVICE';
const AIServiceProvider = AIServiceSafe
  ? { provide: AI_SERVICE_TOKEN, useExisting: AIServiceSafe as any }
  : { provide: AI_SERVICE_TOKEN, useValue: {} };

@Module({
  imports: [
    DatabaseModule,
    KafkaModuleSafe as never,
    AIModuleSafe as never,
    CustomersModule,
    SLAModule,
    NotificationsModule,
  ],
  controllers: [TicketsController],
  providers: [
    TicketsService, 
    TicketsRoutingService, 
    TicketsGateway, 
    TicketsSearchService, 
    EventPublisherProvider,
    AIServiceProvider,
    TicketsMarketingListenerService
  ],
  exports: [TicketsService, TicketsSearchService, TicketsGateway]
})
export class TicketsModule {}