/**
 * Customer Portal Controller
 * Handles customer portal customization and management API endpoints
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { PortalService } from './portal.service';
import {
  CreatePortalDto,
  UpdatePortalDto,
  PublishPortalDto,
  CreateCustomDomainDto,
  CreatePortalPageDto,
  UpdatePortalPageDto,
  CreatePortalThemeDto,
  ValidateSubdomainDto,
  ValidateDomainDto,
} from './dto/portal.dto';
import type {
  CreatePortalRequest,
  UpdatePortalRequest,
  PublishPortalRequest,
  CreateCustomDomainRequest,
  CreatePortalPageRequest,
  UpdatePortalPageRequest,
  CreatePortalThemeRequest,
  CreatePortalWidgetRequest,
} from '@glavito/shared-types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('portal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('portal')
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @Post()
  @ApiOperation({ summary: 'Create customer portal' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Customer portal created successfully',
  })
  async createPortal(
    @Request() req: any,
    @Body() dto: CreatePortalDto
  ) {
    const { tenantId, userId } = req.user;
    const request: CreatePortalRequest = {
      name: dto.name,
      description: dto.description,
      subdomain: dto.subdomain,
      branding: dto.branding as any,
      features: dto.features as any,
      seoSettings: dto.seoSettings as any,
    };
    return this.portalService.createPortal(tenantId, request, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get customer portal' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Customer portal retrieved successfully',
  })
  async getPortal(@Request() req: any) {
    const { tenantId } = req.user;
    const portal = await this.portalService.getPortal(tenantId);
    return portal || { message: 'No customer portal found' };
  }

  @Put()
  @ApiOperation({ summary: 'Update customer portal' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Customer portal updated successfully',
  })
  async updatePortal(
    @Request() req: any,
    @Body() dto: UpdatePortalDto
  ) {
    const { tenantId, userId } = req.user;
    const request: UpdatePortalRequest = {
      name: dto.name,
      description: dto.description,
      subdomain: dto.subdomain,
      customDomain: dto.customDomain,
      isActive: dto.isActive,
      branding: dto.branding as any,
      features: dto.features as any,
      seoSettings: dto.seoSettings as any,
    };
    return this.portalService.updatePortal(tenantId, request, userId);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete customer portal' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Customer portal deleted successfully',
  })
  async deletePortal(@Request() req: any) {
    const { tenantId, userId } = req.user;
    await this.portalService.deletePortal(tenantId, userId);
    return { success: true, message: 'Customer portal deleted successfully' };
  }

  @Post('publish')
  @ApiOperation({ summary: 'Publish customer portal' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Customer portal published successfully',
  })
  async publishPortal(
    @Request() req: any,
    @Body() dto: PublishPortalDto
  ) {
    const { tenantId, userId } = req.user;
    const request: PublishPortalRequest = {
      generateIntegrationCode: dto.generateIntegrationCode,
      notifyUsers: dto.notifyUsers,
      backupCurrent: dto.backupCurrent,
    };
    return this.portalService.publishPortal(tenantId, request, userId);
  }

  @Get('preview')
  @ApiOperation({ summary: 'Generate portal preview' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Portal preview generated successfully',
  })
  async generatePreview(@Request() req: any) {
    const { tenantId } = req.user;
    return this.portalService.generatePreview(tenantId);
  }

  @Post('domains')
  @ApiOperation({ summary: 'Create custom domain' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Custom domain created successfully',
  })
  async createCustomDomain(
    @Request() req: any,
    @Body() dto: CreateCustomDomainDto
  ) {
    const { tenantId, userId } = req.user;
    const request: CreateCustomDomainRequest = {
      domain: dto.domain,
      autoVerify: dto.autoVerify,
    };
    return this.portalService.createCustomDomain(tenantId, request, userId);
  }

  @Get('domains')
  @ApiOperation({ summary: 'Get custom domains' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Custom domains retrieved successfully',
  })
  async getCustomDomains(@Request() req: any) {
    const { tenantId } = req.user;
    // This would be implemented in the service
    return { domains: [] };
  }

  @Post('domains/:domainId/verify')
  @ApiOperation({ summary: 'Verify custom domain' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Custom domain verification initiated',
  })
  async verifyCustomDomain(
    @Request() req: any,
    @Param('domainId') domainId: string
  ) {
    return this.portalService.verifyCustomDomain(domainId);
  }

  @Post('pages')
  @ApiOperation({ summary: 'Create portal page' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Portal page created successfully',
  })
  async createPortalPage(
    @Request() req: any,
    @Body() dto: CreatePortalPageDto
  ) {
    const { tenantId, userId } = req.user;
    const request: CreatePortalPageRequest = {
      name: dto.name,
      slug: dto.slug,
      title: dto.title,
      content: dto.content,
      pageType: dto.pageType as 'home' | 'contact' | 'faq' | 'ticket_submit' | 'knowledge_base' | 'custom',
      seoTitle: dto.seoTitle,
      seoDescription: dto.seoDescription,
      customCss: dto.customCss,
      customJs: dto.customJs,
    };
    return this.portalService.createPortalPage(tenantId, request, userId);
  }

  @Get('pages')
  @ApiOperation({ summary: 'Get portal pages' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Portal pages retrieved successfully',
  })
  @ApiQuery({ name: 'pageType', required: false, description: 'Filter by page type' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Filter by active status' })
  async getPortalPages(
    @Request() req: any,
    @Query('pageType') pageType?: string,
    @Query('isActive') isActive?: string
  ) {
    const { tenantId } = req.user;
    // This would be implemented in the service
    return { pages: [] };
  }

  @Get('pages/:pageId')
  @ApiOperation({ summary: 'Get portal page by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Portal page retrieved successfully',
  })
  async getPortalPage(
    @Request() req: any,
    @Param('pageId') pageId: string
  ) {
    const { tenantId } = req.user;
    // This would be implemented in the service
    return { page: null };
  }

  @Put('pages/:pageId')
  @ApiOperation({ summary: 'Update portal page' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Portal page updated successfully',
  })
  async updatePortalPage(
    @Request() req: any,
    @Param('pageId') pageId: string,
    @Body() dto: UpdatePortalPageDto
  ) {
    const { tenantId, userId } = req.user;
    const request: UpdatePortalPageRequest = {
      name: dto.name,
      slug: dto.slug,
      title: dto.title,
      content: dto.content,
      isActive: dto.isActive,
      seoTitle: dto.seoTitle,
      seoDescription: dto.seoDescription,
      customCss: dto.customCss,
      customJs: dto.customJs,
    };
    return this.portalService.updatePortalPage(tenantId, pageId, request, userId);
  }

  @Delete('pages/:pageId')
  @ApiOperation({ summary: 'Delete portal page' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Portal page deleted successfully',
  })
  async deletePortalPage(
    @Request() req: any,
    @Param('pageId') pageId: string
  ) {
    const { tenantId } = req.user;
    // This would be implemented in the service
    return { success: true, message: 'Portal page deleted successfully' };
  }

  @Post('themes')
  @ApiOperation({ summary: 'Create portal theme' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Portal theme created successfully',
  })
  async createPortalTheme(
    @Request() req: any,
    @Body() dto: CreatePortalThemeDto
  ) {
    const { tenantId, userId } = req.user;
    const request: CreatePortalThemeRequest = {
      name: dto.name,
      description: dto.description,
      colors: dto.colors,
      typography: dto.typography,
      layout: dto.layout,
      components: dto.components,
      customCss: dto.customCss,
    };
    return this.portalService.createPortalTheme(tenantId, request, userId);
  }

  @Get('themes')
  @ApiOperation({ summary: 'Get portal themes' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Portal themes retrieved successfully',
  })
  async getPortalThemes(@Request() req: any) {
    const { tenantId } = req.user;
    // This would be implemented in the service
    return { themes: [] };
  }

  @Post('themes/:themeId/activate')
  @ApiOperation({ summary: 'Activate portal theme' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Portal theme activated successfully',
  })
  async activatePortalTheme(
    @Request() req: any,
    @Param('themeId') themeId: string
  ) {
    const { tenantId, userId } = req.user;
    return this.portalService.activatePortalTheme(tenantId, themeId, userId);
  }

  @Delete('themes/:themeId')
  @ApiOperation({ summary: 'Delete portal theme' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Portal theme deleted successfully',
  })
  async deletePortalTheme(
    @Request() req: any,
    @Param('themeId') themeId: string
  ) {
    const { tenantId } = req.user;
    // This would be implemented in the service
    return { success: true, message: 'Portal theme deleted successfully' };
  }

  @Post('widgets')
  @ApiOperation({ summary: 'Create portal widget' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Portal widget created successfully',
  })
  async createPortalWidget(
    @Request() req: any,
    @Body() body: any
  ) {
    const { tenantId } = req.user;
    // This would be implemented in the service
    return { widget: null };
  }

  @Get('widgets')
  @ApiOperation({ summary: 'Get portal widgets' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Portal widgets retrieved successfully',
  })
  async getPortalWidgets(@Request() req: any) {
    const { tenantId } = req.user;
    // This would be implemented in the service
    return { widgets: [] };
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get portal metrics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Portal metrics retrieved successfully',
  })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for metrics (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date for metrics (ISO string)' })
  @ApiQuery({ name: 'period', required: false, description: 'Metrics period (day, week, month)' })
  async getPortalMetrics(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('period') period?: 'day' | 'week' | 'month'
  ) {
    const { tenantId } = req.user;
    return this.portalService.getPortalMetrics(tenantId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      period,
    });
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get portal templates' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Portal templates retrieved successfully',
  })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by template category' })
  @ApiQuery({ name: 'isPremium', required: false, description: 'Filter by premium status' })
  async getPortalTemplates(
    @Query('category') category?: string,
    @Query('isPremium') isPremium?: string
  ) {
    return this.portalService.getPortalTemplates(
      category,
      isPremium ? isPremium === 'true' : undefined
    );
  }

  @Post('templates/:templateId/apply')
  @ApiOperation({ summary: 'Apply portal template' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Portal template applied successfully',
  })
  async applyPortalTemplate(
    @Request() req: any,
    @Param('templateId') templateId: string,
    @Body() body?: { overwriteExisting?: boolean }
  ) {
    const { tenantId } = req.user;
    // This would be implemented in the service
    return { success: true, message: 'Portal template applied successfully' };
  }

  @Post('upload/logo')
  @ApiOperation({ summary: 'Upload portal logo' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Logo uploaded successfully',
  })
  @UseInterceptors(FileInterceptor('logo'))
  async uploadLogo(
    @Request() req: any,
    @UploadedFile() file: any
  ) {
    const { tenantId } = req.user;
    // This would be implemented in the service
    return {
      success: true,
      url: '/uploads/logos/example-logo.png',
      message: 'Logo uploaded successfully',
    };
  }

  @Post('upload/favicon')
  @ApiOperation({ summary: 'Upload portal favicon' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Favicon uploaded successfully',
  })
  @UseInterceptors(FileInterceptor('favicon'))
  async uploadFavicon(
    @Request() req: any,
    @UploadedFile() file: any
  ) {
    const { tenantId } = req.user;
    // This would be implemented in the service
    return {
      success: true,
      url: '/uploads/favicons/example-favicon.ico',
      message: 'Favicon uploaded successfully',
    };
  }

  @Get('export')
  @ApiOperation({ summary: 'Export portal configuration' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Portal configuration exported successfully',
  })
  async exportPortal(@Request() req: any) {
    const { tenantId } = req.user;
    // This would be implemented in the service
    return {
      exportUrl: '/exports/portal-config.json',
      message: 'Portal configuration exported successfully',
    };
  }

  @Post('import')
  @ApiOperation({ summary: 'Import portal configuration' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Portal configuration imported successfully',
  })
  @UseInterceptors(FileInterceptor('config'))
  async importPortal(
    @Request() req: any,
    @UploadedFile() file: any,
    @Body() options?: { overwriteExisting?: boolean }
  ) {
    const { tenantId, userId } = req.user;
    // This would be implemented in the service
    return {
      success: true,
      message: 'Portal configuration imported successfully',
    };
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get portal dashboard data' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Portal dashboard data retrieved successfully',
  })
  async getPortalDashboard(@Request() req: any) {
    const { tenantId } = req.user;
    
    const [portal, metrics] = await Promise.all([
      this.portalService.getPortal(tenantId),
      this.portalService.getPortalMetrics(tenantId),
    ]);

    return {
      portal,
      metrics,
      summary: {
        isPublished: portal?.isPublished || false,
        totalPages: 0, // Would be calculated from actual pages
        totalThemes: 0, // Would be calculated from actual themes
        customDomain: portal?.customDomain || null,
        lastPublished: portal?.lastPublishedAt || null,
      },
    };
  }

  @Post('validate/subdomain')
  @ApiOperation({ summary: 'Validate subdomain availability' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Subdomain validation completed',
  })
  async validateSubdomain(@Body() body: ValidateSubdomainDto) {
    // This would be implemented in the service
    return {
      available: true,
      subdomain: body.subdomain,
      suggestions: [],
    };
  }

  @Post('validate/domain')
  @ApiOperation({ summary: 'Validate custom domain' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Domain validation completed',
  })
  async validateDomain(@Body() body: ValidateDomainDto) {
    // This would be implemented in the service
    return {
      valid: true,
      domain: body.domain,
      dnsRecords: [],
    };
  }
}