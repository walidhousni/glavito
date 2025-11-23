import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@glavito/shared-database';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { EmailProviderFactory } from './provider.factory';
import { EmailTemplatesService } from './templates.service';
import { EmailTrackingService } from './tracking.service';
import { EmailRateLimitService } from './rate-limit.service';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [EmailController],
  providers: [EmailService, EmailProviderFactory, EmailTemplatesService, EmailTrackingService, EmailRateLimitService],
  exports: [EmailService],
})
export class EmailModule {}

