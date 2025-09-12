import { Module } from '@nestjs/common';
import { DatabaseModule } from '@glavito/shared-database';
import { FilesModule } from '../files/files.module';
import { CustomerPortalService } from './customer-portal.service';
import { CustomerPortalController } from './customer-portal.controller';

@Module({
  imports: [DatabaseModule, FilesModule],
  providers: [CustomerPortalService],
  controllers: [CustomerPortalController],
  exports: [CustomerPortalService],
})
export class CustomerPortalModule {}


