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
import { TemplatesModule } from '../templates/templates.module';

@Module({
  imports: [
    DatabaseModule,
    EventEmitterModule.forRoot(),
    TemplatesModule,
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService, OnboardingGateway],
  exports: [OnboardingService],
})
export class OnboardingModule {}
