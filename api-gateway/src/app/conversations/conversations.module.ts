/* eslint-disable @typescript-eslint/no-explicit-any */
import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { AdvancedConversationController } from './advanced-conversation.controller';
import { ConversationsService } from './conversations.service';
import { DatabaseModule } from '@glavito/shared-database';
import { AuthModule } from '../auth/auth.module';
// Lazy-load Kafka like TicketsModule to satisfy linter rules
let KafkaModuleSafe: unknown;
try {
  const kafka = require('@glavito/shared-kafka');
  KafkaModuleSafe = kafka.KafkaModule;
} catch {
  KafkaModuleSafe = class OptionalKafkaModule {};
}
import { ConversationModule } from '@glavito/shared-conversation';
import { ConversationsGateway } from './conversations.gateway';
let AIModuleSafe: unknown;
try {
  const ai = require('@glavito/shared-ai');
  AIModuleSafe = ai.AIModule;
} catch {
  AIModuleSafe = class OptionalAIModule {};
}
import { CustomersModule } from '../customers/customers.module';
import { TicketsModule } from '../tickets/tickets.module';
import { WalletModule } from '../wallet/wallet.module';

// Provide AI service via explicit token to avoid static import metadata issues
const AI_SERVICE_TOKEN = 'AI_INTELLIGENCE_SERVICE';
let AIServiceProvider: unknown;
try {
  const ai = require('@glavito/shared-ai');
  AIServiceProvider = { provide: AI_SERVICE_TOKEN, useExisting: ai.AIIntelligenceService };
} catch {
  AIServiceProvider = { provide: AI_SERVICE_TOKEN, useValue: {} as any };
}

@Module({
  imports: [DatabaseModule, KafkaModuleSafe as any, ConversationModule, AuthModule, AIModuleSafe as any, CustomersModule, TicketsModule, WalletModule],
  controllers: [ConversationsController, AdvancedConversationController],
  providers: [ConversationsService, ConversationsGateway, AIServiceProvider as any],
  exports: [ConversationsService, ConversationsGateway],
})
export class ConversationsModule {}