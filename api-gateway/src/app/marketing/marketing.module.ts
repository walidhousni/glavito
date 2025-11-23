/* eslint-disable @typescript-eslint/no-explicit-any */
import { Module } from '@nestjs/common';
import { DatabaseModule } from '@glavito/shared-database'
import { ConversationModule } from '@glavito/shared-conversation'
import { ChannelsModule } from '../channels/channels.module'
import { TicketsModule } from '../tickets/tickets.module';
import { EmailModule } from '../email/email.module'
import { MarketingService } from './marketing.service'
import { MarketingController, MarketingCustomerController } from './marketing.controller'
import { MarketingTrackingController } from './marketing.tracking.controller'
import { MarketingScheduler } from './marketing.scheduler'
import { NotificationsModule } from '../notifications/notifications.module';
import { WalletModule } from '../wallet/wallet.module';
import { StripeModule } from '../stripe/stripe.module';

// Make AI and Kafka optional and expose safe tokens
let AIModuleSafe: any;
let AIIntelligenceServiceSafe: any;
let KafkaModuleSafe: any;
let EventPublisherServiceSafe: any;

try {
  const ai = require('@glavito/shared-ai');
  AIModuleSafe = ai.AIModule;
  AIIntelligenceServiceSafe = ai.AIIntelligenceService;
} catch {
  AIModuleSafe = class OptionalAIModule {};
  AIIntelligenceServiceSafe = null;
}

try {
  const kafka = require('@glavito/shared-kafka');
  KafkaModuleSafe = kafka.KafkaModule;
  EventPublisherServiceSafe = kafka.EventPublisherService;
} catch {
  KafkaModuleSafe = class OptionalKafkaModule {};
  EventPublisherServiceSafe = null;
}

const AI_SERVICE_TOKEN = 'AI_SERVICE';
const EVENT_PUBLISHER_TOKEN = 'EVENT_PUBLISHER';

const AIServiceProvider = AIIntelligenceServiceSafe
  ? { provide: AI_SERVICE_TOKEN, useExisting: AIIntelligenceServiceSafe }
  : { provide: AI_SERVICE_TOKEN, useValue: {} as any };

const EventPublisherProvider = EventPublisherServiceSafe
  ? { provide: EVENT_PUBLISHER_TOKEN, useExisting: EventPublisherServiceSafe }
  : { provide: EVENT_PUBLISHER_TOKEN, useValue: {} as any };

@Module({
  imports: [
    DatabaseModule,
    ConversationModule,
    ChannelsModule,
    AIModuleSafe,
    KafkaModuleSafe,
    NotificationsModule,
    TicketsModule,
    EmailModule,
    WalletModule,
    StripeModule,
  ],
  controllers: [MarketingController, MarketingCustomerController, MarketingTrackingController],
  providers: [
    MarketingService, 
    MarketingScheduler, 
    ...(AIIntelligenceServiceSafe ? [AIIntelligenceServiceSafe] : []),
    ...(EventPublisherServiceSafe ? [EventPublisherServiceSafe] : []),
    AIServiceProvider,
    EventPublisherProvider,
  ],
  exports: [MarketingService]
})
export class MarketingModule {}


