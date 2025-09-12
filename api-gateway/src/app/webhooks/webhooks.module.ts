import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '@glavito/shared-database';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { ConversationModule } from '@glavito/shared-conversation';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller';
import { WhatsAppWebhookStatusController } from './whatsapp-webhook-status.controller';
import { InstagramWebhookController } from './instagram-webhook.controller';
import { MetricsService } from '../observability/metrics.service';
import { EmailWebhookController } from './email-webhook.controller';
import { PublicChatLinkService } from './public-chat-link.service';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { TranscriptionService } from '../calls/transcription.service';
import { WorkflowModule as SharedWorkflowModule } from '@glavito/shared-workflow'
import { MediaAnalysisService } from '../ai/media-analysis.service';

@Module({
imports: [ConfigModule, HttpModule, DatabaseModule, ConversationModule, forwardRef(() => KnowledgeModule), SharedWorkflowModule.forFeature()],
  controllers: [WebhooksController, WhatsAppWebhookController, WhatsAppWebhookStatusController, InstagramWebhookController, EmailWebhookController],
  providers: [WebhooksService, MetricsService, PublicChatLinkService, TranscriptionService, MediaAnalysisService],
  exports: [WebhooksService, MetricsService, PublicChatLinkService],
})
export class WebhooksModule {}