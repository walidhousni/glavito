import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@glavito/shared-database';
// Make Kafka optional in case the shared-kafka dist is not available in some environments
let KafkaModuleSafe: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
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

@Module({
  imports: [ConfigModule, DatabaseModule, KafkaModuleSafe],
  providers: [IntegrationsService, IntegrationsSyncScheduler, SalesforceAdapter, HubspotAdapter, DynamicsAdapter, MarketoAdapter, PardotAdapter],
  controllers: [IntegrationsController],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}


