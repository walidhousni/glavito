import { Module } from '@nestjs/common';
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
import { AIModule } from '@glavito/shared-ai';

@Module({
  imports: [DatabaseModule, KafkaModuleSafe, AIModule, HttpModule],
  controllers: [CustomersController, Customer360Controller, SatisfactionController],
  providers: [
    CustomersService,
    CustomerAnalyticsService,
    CustomerSatisfactionService,
    (EventPublisherServiceSafe
      ? { provide: 'EVENT_PUBLISHER', useExisting: EventPublisherServiceSafe }
      : { provide: 'EVENT_PUBLISHER', useValue: { emit: (_event: string, _payload: Record<string, unknown>) => undefined } }
    ) as any,
  ],
  exports: [CustomersService, CustomerAnalyticsService, CustomerSatisfactionService],
})
export class CustomersModule {}