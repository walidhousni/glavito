import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { PublicTenantsController } from './public-tenants.controller';
import { TenantsService } from './tenants.service';
import { DatabaseModule } from '@glavito/shared-database';
import { FilesModule } from '../files/files.module';
import { TenantEmailProvidersService } from './tenant-email-providers.service';
import { TenantEmailProvidersController } from './tenant-email-providers.controller';

@Module({
  imports: [DatabaseModule, FilesModule],
  controllers: [TenantsController, PublicTenantsController, TenantEmailProvidersController],
  providers: [TenantsService, TenantEmailProvidersService],
  exports: [TenantsService, TenantEmailProvidersService],
})
export class TenantsModule {}