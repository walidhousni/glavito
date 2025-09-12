import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@glavito/shared-database';
import { AIModule } from '@glavito/shared-ai';
import { ConversationModule } from '@glavito/shared-conversation';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeController } from './knowledge.controller';
import { PublicKnowledgeController } from './public-knowledge.controller';
import { PublicChatController } from './public-chat.controller';
import { PublicChatSessionStore } from './public-chat.store'
import { EmailService } from '../auth/email.service'
import { WebhooksModule } from '../webhooks/webhooks.module'

@Module({
  imports: [ConfigModule, DatabaseModule, AIModule, ConversationModule, WebhooksModule],
  controllers: [KnowledgeController, PublicKnowledgeController, PublicChatController],
  providers: [KnowledgeService, PublicChatSessionStore, EmailService],
  exports: [KnowledgeService, PublicChatSessionStore],
})
export class KnowledgeModule {}


