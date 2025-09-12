/**
 * Error Handling Module
 * Comprehensive error handling system for onboarding
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';

import { ErrorHandlingService } from './error-handling.service';
import { ErrorMonitoringService } from './error-monitoring.service';
import { ErrorRecoveryService } from './error-recovery.service';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule,
    ScheduleModule.forRoot(),
  ],
  providers: [
    ErrorHandlingService,
    ErrorMonitoringService,
    ErrorRecoveryService,
  ],
  exports: [
    ErrorHandlingService,
    ErrorMonitoringService,
    ErrorRecoveryService,
  ],
})
export class ErrorHandlingModule {}