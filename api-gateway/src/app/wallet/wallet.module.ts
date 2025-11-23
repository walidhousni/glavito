import { Module, forwardRef } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { DatabaseModule } from '@glavito/shared-database';
import { ConversationModule } from '@glavito/shared-conversation';
import { StripeModule } from '../stripe/stripe.module';

@Module({
  imports: [DatabaseModule, ConversationModule, forwardRef(() => StripeModule)],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}

