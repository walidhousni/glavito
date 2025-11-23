import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventPublisherService } from './event-publisher.service';
import { AdvancedEventBusService } from './advanced-event-bus.service';
import { EventStoreService } from './event-store.service';
import { AnalyticsStreamProcessor } from './stream-processors/analytics-stream-processor';
import { AIStreamProcessor } from './stream-processors/ai-stream-processor';
import { OutboundStreamProcessor } from './stream-processors/outbound-stream-processor';
import { DatabaseModule } from '@glavito/shared-database';

@Global()
@Module({
  imports: [ConfigModule, DatabaseModule],
  providers: [
    EventPublisherService,
    AdvancedEventBusService,
    EventStoreService,
    AnalyticsStreamProcessor,
    AIStreamProcessor,
    OutboundStreamProcessor,
  ],
  exports: [
    EventPublisherService,
    AdvancedEventBusService,
    EventStoreService,
    AnalyticsStreamProcessor,
    AIStreamProcessor,
    OutboundStreamProcessor,
  ],
})
export class KafkaModule {}