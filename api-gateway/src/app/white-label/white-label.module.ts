import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@glavito/shared-database';
import { FilesModule } from '../files/files.module';
import { WhiteLabelService } from './white-label.service';
import { WhiteLabelController } from './white-label.controller';
import { WhiteLabelTrackingController } from './white-label-tracking.controller';
import { DomainService } from './domain.service';
import { TemplateEngineService } from './template-engine.service';
import { ApiDocsBrandingController } from './api-docs.controller';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [ConfigModule, DatabaseModule, FilesModule, AuthModule, EmailModule],
  controllers: [WhiteLabelController, WhiteLabelTrackingController, ApiDocsBrandingController],
  providers: [WhiteLabelService, DomainService, TemplateEngineService],
  exports: [WhiteLabelService, DomainService, TemplateEngineService],
})
export class WhiteLabelModule {}


