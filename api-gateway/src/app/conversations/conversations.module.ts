import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { AdvancedConversationController } from './advanced-conversation.controller';
import { ConversationsService } from './conversations.service';
import { DatabaseModule } from '@glavito/shared-database';
import { AuthModule } from '../auth/auth.module';
// Lazy-load Kafka like TicketsModule to satisfy linter rules
let KafkaModuleSafe: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const kafka = require('@glavito/shared-kafka');
  KafkaModuleSafe = kafka.KafkaModule;
} catch {
  KafkaModuleSafe = class OptionalKafkaModule {};
}
import { ConversationModule } from '@glavito/shared-conversation';
import { ConversationsGateway } from './conversations.gateway';
import { AIModule } from '@glavito/shared-ai';
import { CustomersModule } from '../customers/customers.module';

@Module({
  imports: [DatabaseModule, KafkaModuleSafe, ConversationModule, AuthModule, AIModule, CustomersModule],
  controllers: [ConversationsController, AdvancedConversationController],
  providers: [ConversationsService, ConversationsGateway],
  exports: [ConversationsService, ConversationsGateway],
})
export class ConversationsModule {}