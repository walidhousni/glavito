import { Module } from '@nestjs/common'
import { DatabaseModule } from '@glavito/shared-database'
import { KafkaModule, EventPublisherService, EventStoreService } from '@glavito/shared-kafka'
import { ConversationModule } from '@glavito/shared-conversation'
import { ChannelsModule } from '../channels/channels.module'
import { EmailService } from '../auth/email.service'
import { MarketingService } from './marketing.service'
import { MarketingController } from './marketing.controller'
import { MarketingScheduler } from './marketing.scheduler'

@Module({
  imports: [DatabaseModule, KafkaModule, ConversationModule, ChannelsModule],
  controllers: [MarketingController],
  providers: [MarketingService, MarketingScheduler, EmailService, EventPublisherService, EventStoreService],
  exports: [MarketingService]
})
export class MarketingModule {}


