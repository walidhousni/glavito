import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import * as path from 'path';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CacheInterceptor } from '../common/interceptors/cache.interceptor';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from '@glavito/shared-database';
import { ConversationModule } from '@glavito/shared-conversation';
import { WorkflowModule as SharedWorkflowModule } from '@glavito/shared-workflow';
import { AuthModule } from './auth/auth.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { StripeModule } from './stripe/stripe.module';
import { TeamModule } from './team/team.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { TicketsModule } from './tickets/tickets.module';
import { CustomersModule } from './customers/customers.module';
import { ChannelsModule } from './channels/channels.module';
import { ConversationsModule } from './conversations/conversations.module';
import { MessagesModule } from './messages/messages.module';
import { FaqModule } from './faq/faq.module';
import { FilesModule } from './files/files.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { HealthModule } from './health/health.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { DataImportModule } from './data-import/data-import.module';
import { SLAModule } from './sla/sla.module';
import { WorkflowsModule } from './workflows/workflows.module'
import { CallsModule } from './calls/calls.module'
import { CustomFieldsModule } from './custom-fields/custom-fields.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { CollaborationModule } from './collaboration/collaboration.module';
import { SearchModule } from './search/search.module';
// FlowsModule removed in favor of centralized Workflows (n8n-backed)
import { RedisModule } from '@glavito/shared-redis';
import { NotificationsModule } from './notifications/notifications.module';
import { AIModule as GatewayAIModule } from './ai/ai.module';
import { CrmModule } from './crm/crm.module';
import { MarketingModule } from './marketing/marketing.module'
import { WhiteLabelModule } from './white-label/white-label.module'
import { CustomerPortalModule } from './customer-portal/customer-portal.module'
import { ApiDocsBrandingController } from './white-label/api-docs.controller'
import { SubscriptionController } from './auth/services/subscription.controller'
import { IntegrationsModule } from './integrations/integrations.module'
import { SecurityMiddleware } from './auth/middleware/security.middleware'
import { LocalizationModule } from './localization/localization.module'
import { UsageModule } from './usage/usage.module'
import { EmailAdapter } from '@glavito/shared-conversation'
import { RequestLoggingInterceptor } from '../common/interceptors/request-logging.interceptor'

const STATIC_UPLOADS = process.env.S3_BUCKET
  ? []
  : [
      ServeStaticModule.forRoot({
        rootPath: path.resolve(process.cwd(), process.env.UPLOAD_PATH || 'uploads'),
        serveRoot: '/uploads',
      }),
    ];

@Module({
  imports: [
    // Static serving for local uploads only when S3 is not configured
    ...STATIC_UPLOADS,
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.development', '.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.RATE_LIMIT_TTL || '60') * 1000,
        limit: parseInt(process.env.RATE_LIMIT_LIMIT || '100'),
      },
    ]),

    // Database and Event Infrastructure
    DatabaseModule,
    RedisModule,
    ConversationModule,
    SharedWorkflowModule.forRoot({
      n8n: {
        baseUrl: process.env.N8N_BASE_URL || 'http://localhost:5678',
        apiKey: process.env.N8N_API_KEY || '',
        timeout: parseInt(process.env.N8N_TIMEOUT || '30000'),
        retryAttempts: parseInt(process.env.N8N_RETRY_ATTEMPTS || '3')
      }
    }),

    // Core modules
    AuthModule,
    OnboardingModule,
    StripeModule,
    TeamModule,
    TenantsModule,
    UsersModule,
    TicketsModule,
    CustomersModule,
    ChannelsModule,
    ConversationsModule,
    MessagesModule,
    FaqModule,
    FilesModule,
    WebhooksModule,
    HealthModule,
    AnalyticsModule,
    DataImportModule,
    SLAModule,
    WorkflowsModule,
    CallsModule,
    CustomFieldsModule,
    MarketplaceModule,
    KnowledgeModule,
    CollaborationModule,
    SearchModule,
    NotificationsModule,
    GatewayAIModule,
    CrmModule,
    MarketingModule,
    IntegrationsModule,
    WhiteLabelModule,
    CustomerPortalModule,
    LocalizationModule,
    UsageModule,
  ],
  controllers: [AppController, ApiDocsBrandingController, SubscriptionController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor,
    },
    {
      provide: 'EMAIL_SENDER',
      useExisting: EmailAdapter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SecurityMiddleware)
      .forRoutes('*')
  }
}
