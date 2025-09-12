import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConversationOrchestratorService } from './conversation-orchestrator.service';
import { EnhancedConversationOrchestratorService } from './enhanced-conversation-orchestrator.service';
import { WhatsAppAdapter } from './adapters/whatsapp-adapter';
import { InstagramAdapter } from './adapters/instagram-adapter';
import { EmailAdapter } from './adapters/email-adapter';

@Global()
@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    })
  ],
  providers: [
    ConversationOrchestratorService,
    EnhancedConversationOrchestratorService,
    WhatsAppAdapter,
    InstagramAdapter,
    EmailAdapter,
  ],
  exports: [
    ConversationOrchestratorService,
    EnhancedConversationOrchestratorService,
    WhatsAppAdapter,
    InstagramAdapter,
    EmailAdapter,
  ],
})
export class ConversationModule { }