import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@glavito/shared-database';
import { ConversationModule } from '@glavito/shared-conversation';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeController } from './knowledge.controller';
import { PublicKnowledgeController } from './public-knowledge.controller';
import { PublicChatController } from './public-chat.controller';
import { PublicChatSessionStore } from './public-chat.store'
import { EmailService } from '../email/email.service'
import { EmailModule } from '../email/email.module'
import { WebhooksModule } from '../webhooks/webhooks.module'
import { ChannelOrchestratorService } from './services/channel-orchestrator.service'
import { ContactVerificationService } from './services/contact-verification.service'

@Module({
  imports: [
    ConfigModule, 
    DatabaseModule, 
    forwardRef(() => import('@glavito/shared-ai').then(m => m.AIModule)), 
    ConversationModule, 
    forwardRef(() => WebhooksModule),
    EmailModule
  ],
  controllers: [KnowledgeController, PublicKnowledgeController, PublicChatController],
  providers: [
    KnowledgeService, 
    PublicChatSessionStore, 
    ChannelOrchestratorService, 
    ContactVerificationService
  ],
  exports: [KnowledgeService, PublicChatSessionStore, ChannelOrchestratorService],
})
export class KnowledgeModule {}


