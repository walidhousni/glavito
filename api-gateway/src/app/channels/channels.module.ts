import { Module } from '@nestjs/common';
import { ChannelsController } from './channels.controller';
import { ChannelsService } from './channels.service';
import { ChannelSettingsController } from './channel-settings.controller';
import { ChannelSettingsService } from './channel-settings.service';
import { DatabaseModule } from '@glavito/shared-database';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { WhatsAppAdapter } from '@glavito/shared-conversation';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, HttpModule, ConfigModule, AuthModule],
  controllers: [ChannelsController, ChannelSettingsController],
  providers: [ChannelsService, ChannelSettingsService, WhatsAppAdapter],
  exports: [ChannelsService, ChannelSettingsService],
})
export class ChannelsModule {}