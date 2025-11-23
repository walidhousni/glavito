import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '@glavito/shared-database';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceController } from './marketplace.controller';
import { TenantsService } from '../tenants/tenants.service';
import { CustomFieldsService } from '../custom-fields/custom-fields.service';
import { ChannelsService } from '../channels/channels.service';
import { WorkflowModule as SharedWorkflowModule } from '@glavito/shared-workflow';

@Module({
  imports: [DatabaseModule, ConfigModule, HttpModule, SharedWorkflowModule.forFeature()],
  controllers: [MarketplaceController],
  providers: [
    MarketplaceService,
    TenantsService,
    CustomFieldsService,
    ChannelsService,
  ],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}


