import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '@glavito/shared-database';
import { AIModule as SharedAIModule } from '@glavito/shared-ai';
import { CallsGateway } from './calls.gateway';
import { CallsService } from './calls.service';
import { CallsController } from './calls.controller';
import { TelephonyService } from './telephony.service';
import { TranscriptionService } from './transcription.service';
import { TelephonyController } from './telephony.controller';

@Module({
  imports: [JwtModule.register({}), ConfigModule, HttpModule, DatabaseModule, SharedAIModule],
  controllers: [CallsController, TelephonyController],
  providers: [CallsGateway, CallsService, TelephonyService, TranscriptionService],
  exports: [CallsGateway, CallsService, TelephonyService, TranscriptionService],
})
export class CallsModule {}


