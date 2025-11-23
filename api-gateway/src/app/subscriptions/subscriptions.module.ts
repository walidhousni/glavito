import { Module } from '@nestjs/common';
import { DatabaseModule } from '@glavito/shared-database';
import { SubscriptionService } from './subscriptions.service';
import { UsageModule } from '../usage/usage.module';

@Module({
  imports: [DatabaseModule, UsageModule],
  providers: [SubscriptionService],
  exports: [SubscriptionService],
})
export class SubscriptionsModule {}

