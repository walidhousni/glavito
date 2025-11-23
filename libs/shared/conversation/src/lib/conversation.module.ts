import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { EnhancedConversationOrchestratorService } from './enhanced-conversation-orchestrator.service';
import { WhatsAppAdapter } from './adapters/whatsapp-adapter';
import { InstagramAdapter } from './adapters/instagram-adapter';
import { EmailAdapter } from './adapters/email-adapter';
import { MessengerAdapter } from './adapters/messenger-adapter';
import { WebAdapter } from './adapters/web-adapter';
import { AdapterRegistryService } from './adapter-registry.service';
import { SMSAdapter } from './adapters/sms-adapter';
import { MessageRouterService } from './message-router.service';
import { SessionContextService } from './session-context.service';
import { MessageFeaturesService } from './message-features.service';
import { AudioCallService } from './audio-call.service';
// Redis-backed session context is provided at app level to avoid buildable lib importing RedisModule

@Global()
@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    })
  ],
  providers: [
    EnhancedConversationOrchestratorService,
    WhatsAppAdapter,
    InstagramAdapter,
    EmailAdapter,
    MessengerAdapter,
    WebAdapter,
    SMSAdapter,
    AdapterRegistryService,
    MessageRouterService,
    SessionContextService,
    MessageFeaturesService,
    AudioCallService,
    // Note: RedisSessionContextService is provided at app level to avoid buildable lib importing RedisModule
  ],
  exports: [
    EnhancedConversationOrchestratorService,
    WhatsAppAdapter,
    InstagramAdapter,
    EmailAdapter,
    MessengerAdapter,
    WebAdapter,
    SMSAdapter,
    AdapterRegistryService,
    MessageRouterService,
    SessionContextService,
    MessageFeaturesService,
    AudioCallService,
    // Redis-backed impl is exported by app-level module
  ],
})
export class ConversationModule { }