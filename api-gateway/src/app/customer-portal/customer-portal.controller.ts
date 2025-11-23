import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, CurrentTenant } from '@glavito/shared-auth';
import { CustomerPortalService } from './customer-portal.service';

@ApiTags('Customer Portal')
@Controller('customer-portal')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CustomerPortalController {
  constructor(private readonly service: CustomerPortalService) {}

  // Portal
  @Get('me')
  @ApiOperation({ summary: 'Get current tenant portal' })
  async getMe(@CurrentTenant() tenantId: string) {
    return (await this.service.getPortalByTenant(tenantId)) || {};
  }

  @Patch('me')
  @Roles('admin')
  @ApiOperation({ summary: 'Upsert portal for current tenant' })
  async upsertMe(@CurrentTenant() tenantId: string, @Body() body: any) {
    return this.service.upsertPortal(tenantId, body || {});
  }

  @Post('me/publish')
  @Roles('admin')
  @ApiOperation({ summary: 'Publish portal' })
  async publish(@CurrentTenant() tenantId: string) {
    return this.service.publish(tenantId);
  }

  // Pages
  @Get('me/pages')
  @ApiOperation({ summary: 'List portal pages' })
  async listPages(@CurrentTenant() tenantId: string) {
    return this.service.listPages(tenantId);
  }

  @Post('me/pages')
  @Roles('admin')
  @ApiOperation({ summary: 'Create or update a portal page' })
  async upsertPage(@CurrentTenant() tenantId: string, @Body() body: any) {
    return this.service.upsertPage(tenantId, body || {});
  }

  @Delete('me/pages/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a portal page' })
  async deletePage(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.deletePage(tenantId, id);
  }

  // Themes
  @Get('me/themes')
  @ApiOperation({ summary: 'List portal themes' })
  async listThemes(@CurrentTenant() tenantId: string) {
    return this.service.listThemes(tenantId);
  }

  @Post('me/themes')
  @Roles('admin')
  @ApiOperation({ summary: 'Create or update a theme' })
  async upsertTheme(@CurrentTenant() tenantId: string, @Body() body: any) {
    return this.service.upsertTheme(tenantId, body || {});
  }

  // Widgets
  @Get('me/widgets')
  @ApiOperation({ summary: 'List portal widgets' })
  async listWidgets(@CurrentTenant() tenantId: string) {
    return this.service.listWidgets(tenantId);
  }

  @Post('me/widgets')
  @Roles('admin')
  @ApiOperation({ summary: 'Create or update a widget' })
  async upsertWidget(@CurrentTenant() tenantId: string, @Body() body: any) {
    return this.service.upsertWidget(tenantId, body || {});
  }

  @Delete('me/widgets/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a widget' })
  async deleteWidget(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.deleteWidget(tenantId, id);
  }
}


