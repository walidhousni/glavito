import { Module } from '@nestjs/common';
import { ChannelsController } from './channels.controller';
import { ChannelsService } from './channels.service';
import { DatabaseModule } from '@glavito/shared-database';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { WhatsAppAdapter } from '@glavito/shared-conversation';

@Module({
  imports: [DatabaseModule, HttpModule, ConfigModule],
  controllers: [ChannelsController],
  providers: [ChannelsService, WhatsAppAdapter],
  exports: [ChannelsService],
})
export class ChannelsModule {}