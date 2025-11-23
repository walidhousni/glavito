import { Module } from '@nestjs/common';
import { DatabaseModule } from '@glavito/shared-database';
import { FilesModule } from '../files/files.module';
import { CustomerPortalService } from './customer-portal.service';
import { CustomerPortalController } from './customer-portal.controller';
import { PublicPortalBrandingController } from './public-branding.controller';
import { WhiteLabelModule } from '../white-label/white-label.module';

@Module({
  imports: [DatabaseModule, FilesModule, WhiteLabelModule],
  providers: [CustomerPortalService],
  controllers: [CustomerPortalController, PublicPortalBrandingController],
  exports: [CustomerPortalService],
})
export class CustomerPortalModule {}


