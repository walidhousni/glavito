import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { DatabaseModule } from '@glavito/shared-database';
import { TicketsRoutingService } from './tickets-routing.service';
import { TicketsGateway } from './tickets.gateway';
import { AIModule } from '@glavito/shared-ai';
import { TicketsSearchService } from './tickets-search.service';
import { CustomersModule } from '../customers/customers.module';
import { SLAModule } from '../sla/sla.module';

// Make Kafka optional and expose a safe event publisher token
let KafkaModuleSafe: any;
let EventPublisherServiceSafe: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const kafka = require('@glavito/shared-kafka');
  KafkaModuleSafe = kafka.KafkaModule;
  EventPublisherServiceSafe = kafka.EventPublisherService;
} catch {
  KafkaModuleSafe = class OptionalKafkaModule {};
  EventPublisherServiceSafe = null;
}
const EVENT_PUBLISHER_TOKEN = 'EVENT_PUBLISHER';
const EventPublisherProvider = EventPublisherServiceSafe
  ? { provide: EVENT_PUBLISHER_TOKEN, useExisting: EventPublisherServiceSafe }
  : { provide: EVENT_PUBLISHER_TOKEN, useValue: {} as any };

@Module({
  imports: [
    DatabaseModule,
    KafkaModuleSafe,
    AIModule,
    CustomersModule,
    SLAModule,
  ],
  controllers: [TicketsController],
  providers: [TicketsService, TicketsRoutingService, TicketsGateway, TicketsSearchService, EventPublisherProvider],
  exports: [TicketsService, TicketsSearchService]
})
export class TicketsModule {}