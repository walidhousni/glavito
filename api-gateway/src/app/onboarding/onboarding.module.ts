/**
 * Onboarding Module
 * Configures all onboarding-related services, controllers, and gateways
 */

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { NotificationsModule } from '../notifications/notifications.module';

// Services
import { OnboardingService } from './onboarding.service';
import { ProgressTrackingService } from './progress-tracking.service';
import { ConnectionTestingService } from './connection-testing.service';
import { BusinessHoursService } from './business-hours.service';

// Controllers
import { OnboardingController } from './onboarding.controller';
import { ProgressController } from './progress.controller';
import { OnboardingKnowledgeCompatController } from './knowledge-compat.controller';
import { OnboardingWorkflowCompatController } from './workflow-compat.controller';
// Removed onboarding-specific KnowledgeBaseService; use shared KnowledgeService via KnowledgeModule
import { AIAutomationService } from './ai-automation.service';

// Gateways
import { OnboardingGateway } from './onboarding.gateway';

// Shared modules
import { DatabaseModule } from '@glavito/shared-database';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { WhiteLabelModule } from '../white-label/white-label.module';
import { StripeModule } from '../stripe/stripe.module';
import { WorkflowModule as SharedWorkflowModule } from '@glavito/shared-workflow';

@Module({
  imports: [
    DatabaseModule,
    KnowledgeModule,
    WhiteLabelModule,
    StripeModule,
    NotificationsModule,
    SharedWorkflowModule.forFeature(),
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '1h'),
        },
      }),
      inject: [ConfigService],
    }),
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
  ],
  controllers: [OnboardingController, ProgressController, OnboardingKnowledgeCompatController, OnboardingWorkflowCompatController],
  providers: [
    OnboardingService,
    ProgressTrackingService,
    ConnectionTestingService,
    BusinessHoursService,
    OnboardingGateway,
    AIAutomationService,
  ],
  exports: [
    OnboardingService,
    ProgressTrackingService,
    ConnectionTestingService,
    BusinessHoursService,
    OnboardingGateway,
    AIAutomationService,
  ],
})
export class OnboardingModule {}