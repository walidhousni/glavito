import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@glavito/shared-database';
import { FilesModule } from '../files/files.module';
import { WhiteLabelService } from './white-label.service';
import { WhiteLabelController } from './white-label.controller';
import { WhiteLabelTrackingController } from './white-label-tracking.controller';
import { DomainService } from './domain.service';
import { TemplateEngineService } from './template-engine.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ConfigModule, DatabaseModule, FilesModule, AuthModule],
  controllers: [WhiteLabelController, WhiteLabelTrackingController],
  providers: [WhiteLabelService, DomainService, TemplateEngineService],
  exports: [WhiteLabelService, DomainService, TemplateEngineService],
})
export class WhiteLabelModule {}


