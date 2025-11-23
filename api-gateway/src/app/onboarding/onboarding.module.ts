/**
 * Onboarding Module
 * Comprehensive onboarding system for tenant admins and agents
 */

import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DatabaseModule } from '@glavito/shared-database';
import { OnboardingService } from './onboarding.service';
import { OnboardingController } from './onboarding.controller';
import { OnboardingGateway } from './onboarding.gateway';

@Module({
  imports: [
    DatabaseModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService, OnboardingGateway],
  exports: [OnboardingService],
})
export class OnboardingModule {}
