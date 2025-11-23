import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@glavito/shared-database';
// Make Kafka optional in case the shared-kafka dist is not available in some environments
let KafkaModuleSafe: unknown;
try {
  KafkaModuleSafe = require('@glavito/shared-kafka').KafkaModule;
} catch {
  KafkaModuleSafe = class OptionalKafkaModule {};
}
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsSyncScheduler } from './integrations.sync.scheduler';
import { SalesforceAdapter } from './adapters/salesforce.adapter';
import { HubspotAdapter } from './adapters/hubspot.adapter';
import { DynamicsAdapter } from './adapters/dynamics.adapter';
import { MarketoAdapter } from './adapters/marketo.adapter';
import { PardotAdapter } from './adapters/pardot.adapter';
import { MailchimpAdapter } from './adapters/mailchimp.adapter';
import { SendGridAdapter } from './adapters/sendgrid.adapter';
import { SlackAdapter } from './adapters/slack.adapter';
import { TwilioAdapter } from './adapters/twilio.adapter';
import { ShopifyAdapter } from './adapters/shopify.adapter';
import { WooCommerceAdapter } from './adapters/woocommerce.adapter';
import { StripeAdapter } from './adapters/stripe.adapter';
import { CrmSyncService } from './services/crm-sync.service';
import { IntegrationHealthService } from './services/integration-health.service';
import { ScheduleModule } from '@nestjs/schedule';
import { IntegrationAdapter } from './adapters/integration-adapter';

@Module({
  imports: [ConfigModule, DatabaseModule, KafkaModuleSafe as unknown as never, ScheduleModule],
  providers: [
    IntegrationsService,
    IntegrationsSyncScheduler,
    CrmSyncService,
    IntegrationHealthService,
    // CRM
    SalesforceAdapter,
    HubspotAdapter,
    DynamicsAdapter,
    MarketoAdapter,
    PardotAdapter,
    // Marketing/Comms
    {
      provide: MailchimpAdapter,
      useFactory: () =>
        new MailchimpAdapter({
          apiKey: process.env.MAILCHIMP_API_KEY || '',
          server: process.env.MAILCHIMP_SERVER || 'us1',
        }),
    },
    {
      provide: SendGridAdapter,
      useFactory: () =>
        new SendGridAdapter({
          apiKey: process.env.SENDGRID_API_KEY || '',
          defaultFrom: process.env.SENDGRID_FROM_EMAIL
            ? { email: String(process.env.SENDGRID_FROM_EMAIL), name: process.env.SENDGRID_FROM_NAME }
            : undefined,
        }),
    },
    {
      provide: SlackAdapter,
      useFactory: () =>
        new SlackAdapter({
          token: process.env.SLACK_BOT_TOKEN || '',
          signingSecret: process.env.SLACK_SIGNING_SECRET,
        }),
    },
    {
      provide: TwilioAdapter,
      useFactory: () =>
        new TwilioAdapter({
          accountSid: process.env.TWILIO_ACCOUNT_SID || '',
          authToken: process.env.TWILIO_AUTH_TOKEN || '',
          phoneNumber: process.env.TWILIO_PHONE_NUMBER,
        }),
    },
    // Commerce/Payments
    {
      provide: ShopifyAdapter,
      useFactory: () =>
        new ShopifyAdapter({
          shop: process.env.SHOPIFY_SHOP || '',
          accessToken: process.env.SHOPIFY_ACCESS_TOKEN || '',
          apiVersion: process.env.SHOPIFY_API_VERSION,
        }),
    },
    {
      provide: WooCommerceAdapter,
      useFactory: () =>
        new WooCommerceAdapter({
          siteUrl: process.env.WOOCOMMERCE_SITE_URL || '',
          consumerKey: process.env.WOOCOMMERCE_CONSUMER_KEY || '',
          consumerSecret: process.env.WOOCOMMERCE_CONSUMER_SECRET || '',
          version: process.env.WOOCOMMERCE_API_VERSION,
        }),
    },
    {
      provide: StripeAdapter,
      useFactory: () =>
        new StripeAdapter({
          apiKey: process.env.STRIPE_SECRET_KEY || '',
          apiVersion: process.env.STRIPE_API_VERSION,
        }),
    },
  ],
  controllers: [IntegrationsController],
  exports: [IntegrationsService, IntegrationHealthService],
})
export class IntegrationsModule {
  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly healthService: IntegrationHealthService,
  ) {
    // Wire up adapter resolver for health checks
    this.healthService.setAdapterResolver((provider) => {
      const resolved = this.integrationsService.resolveAdapter(provider) as unknown as IntegrationAdapter | null;
      return resolved;
    });
  }
}


