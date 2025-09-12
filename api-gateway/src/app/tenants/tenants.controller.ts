import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentTenant } from '@glavito/shared-auth';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantsService } from './tenants.service';
import { FilesService } from '../files/files.service';
import { FileInterceptor } from '@nestjs/platform-express';
import type { CreateTenantRequest, UpdateTenantRequest, Tenant } from '@glavito/shared-types';
import { CurrentUser } from '@glavito/shared-auth';

@ApiTags('Tenants')
@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly files: FilesService,
  ) {}

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new tenant' })
  @ApiResponse({ status: 201, description: 'Tenant created successfully' })
  async create(
    @Body()
    createTenantDto: CreateTenantRequest & { ownerId: string },
  ): Promise<Tenant> {
    return this.tenantsService.create(createTenantDto);
  }

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'Get all tenants' })
  @ApiResponse({ status: 200, description: 'List of tenants' })
  async findAll(): Promise<Tenant[]> {
    return this.tenantsService.findAll();
  }

  @Get(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Get tenant by ID' })
  @ApiResponse({ status: 200, description: 'Tenant found' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async findOne(@Param('id') id: string): Promise<Tenant> {
    return this.tenantsService.findOne(id);
  }

  // Current tenant branding BEFORE generic :id route to avoid capturing 'me' as :id
  @Get('me/branding')
  @ApiOperation({ summary: 'Get current tenant branding config' })
  async getMyBranding(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user?: { tenantId?: string; tenant?: { id: string } }
  ) {
    const id = tenantId || user?.tenantId || user?.tenant?.id;
    if (!id) {
      throw new (await import('@nestjs/common')).NotFoundException('Tenant not found');
    }
    const tenant = await this.tenantsService.findOne(id);
    type BrandingResponse = {
      name?: string;
      colors?: { primary?: string; secondary?: string };
      customCSS?: string;
      faviconUrl?: string;
      logoUrl?: string;
    };
    const raw = tenant as unknown as { name: string; brandingConfig?: BrandingResponse };
    const cfg: BrandingResponse = raw.brandingConfig ?? {};
    return { name: cfg.name ?? raw.name, ...cfg } satisfies BrandingResponse;
  }

  @Get(':id/branding')
  @ApiOperation({ summary: 'Get tenant branding config' })
  async getBranding(@Param('id') id: string) {
    const tenant = await this.tenantsService.findOne(id);
    type BrandingResponse = {
      name?: string;
      colors?: { primary?: string; secondary?: string };
      customCSS?: string;
      faviconUrl?: string;
      logoUrl?: string;
    };
    const raw = tenant as unknown as { name: string; brandingConfig?: BrandingResponse };
    const cfg: BrandingResponse = raw.brandingConfig ?? {};
    return { name: cfg.name ?? raw.name, ...cfg } satisfies BrandingResponse;
  }


  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update tenant' })
  @ApiResponse({ status: 200, description: 'Tenant updated successfully' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async update(
    @Param('id') id: string,
    @Body() updateTenantDto: UpdateTenantRequest,
  ): Promise<Tenant> {
    return this.tenantsService.update(id, updateTenantDto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete tenant' })
  @ApiResponse({ status: 200, description: 'Tenant deleted successfully' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.tenantsService.remove(id);
  }

  @Patch(':id/branding')
  @Roles('admin')
  @ApiOperation({ summary: 'Update tenant branding settings' })
  async updateBranding(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      colors?: { primary?: string; secondary?: string };
      customCSS?: string;
      faviconUrl?: string;
      logoUrl?: string;
    },
  ) {
    return this.tenantsService.updateBranding(id, body);
  }

  @Post(':id/branding/logo')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload tenant logo' })
  async uploadLogo(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    const uploaded = await this.files.uploadFile(file, { folder: `tenants/${id}/branding` });
    await this.tenantsService.updateBranding(id, { logoUrl: uploaded.url });
    return uploaded;
  }

  @Post(':id/branding/favicon')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload tenant favicon' })
  async uploadFavicon(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    const uploaded = await this.files.uploadFile(file, { folder: `tenants/${id}/branding` });
    await this.tenantsService.updateBranding(id, { faviconUrl: uploaded.url });
    return uploaded;
  }

  // Dashboard customization endpoints
  @Get('me/dashboard')
  @ApiOperation({ summary: 'Get current tenant dashboard configuration' })
  async getMyDashboard(@CurrentTenant() tenantId: string) {
    return this.tenantsService.getDashboardConfig(tenantId);
  }

  @Patch('me/dashboard')
  @ApiOperation({ summary: 'Update current tenant dashboard configuration' })
  async updateMyDashboard(
    @CurrentTenant() tenantId: string,
    @Body() body: Record<string, unknown>,
  ) {
    await this.tenantsService.updateDashboardConfig(tenantId, body || {});
    return { success: true };
  }

  // Roles/permissions mapping endpoints
  @Get('me/roles')
  @ApiOperation({ summary: 'Get current tenant custom roles mapping' })
  async getMyRoles(@CurrentTenant() tenantId: string) {
    return this.tenantsService.getRolesMapping(tenantId);
  }

  @Patch('me/roles')
  @ApiOperation({ summary: 'Update current tenant custom roles mapping' })
  async updateMyRoles(
    @CurrentTenant() tenantId: string,
    @Body() mapping: Record<string, { permissions: string[] }>,
  ) {
    await this.tenantsService.updateRolesMapping(tenantId, mapping || {});
    return { success: true };
  }

  @Get('me/permissions')
  @ApiOperation({ summary: 'Get current user effective permissions' })
  async myPermissions(@CurrentUser() user: { id: string }) {
    const perms = await this.tenantsService.getUserPermissions(user.id);
    return { permissions: perms };
  }

  // API Keys (tenant-scoped)
  @Get('me/api-keys')
  @ApiOperation({ summary: 'List API keys for current tenant' })
  async listMyApiKeys(@CurrentTenant() tenantId: string) {
    return this.tenantsService.listApiKeys(tenantId);
  }

  @Post('me/api-keys')
  @Roles('admin')
  @ApiOperation({ summary: 'Create API key for current tenant' })
  async createMyApiKey(
    @CurrentTenant() tenantId: string,
    @Body() body: { name: string; permissions?: string[] }
  ) {
    return this.tenantsService.createApiKey(tenantId, body?.name, body?.permissions || []);
  }

  @Delete('me/api-keys/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete API key by id for current tenant' })
  async deleteMyApiKey(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.tenantsService.deleteApiKey(tenantId, id);
  }

  @Get('me/call-analytics')
  @ApiOperation({ summary: 'Get current tenant call analytics summary' })
  async myCallAnalytics(@CurrentTenant() tenantId: string) {
    return this.tenantsService.getCallAnalytics(tenantId);
  }
}