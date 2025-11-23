import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant, CurrentUser } from '@glavito/shared-auth';
import { TemplatesService, ApplyTemplateOptions } from './templates.service';

@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  /**
   * List all available industry templates
   */
  @Get()
  async listTemplates(
    @Query('industry') industry?: string,
    @Query('isActive') isActive?: string
  ) {
    return this.templatesService.listTemplates({
      industry,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined
    });
  }

  /**
   * Get a specific template
   */
  @Get(':id')
  async getTemplate(@Param('id') id: string) {
    return this.templatesService.getTemplate(id);
  }

  /**
   * Get templates for a specific industry
   */
  @Get('industry/:industry')
  async getTemplatesByIndustry(@Param('industry') industry: string) {
    return this.templatesService.getTemplatesByIndustry(industry);
  }

  /**
   * Apply a template to the current tenant
   */
  @Post('apply')
  async applyTemplate(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Body() body: {
      templateId: string;
      customizations?: Record<string, unknown>;
      options?: Partial<ApplyTemplateOptions>;
    }
  ) {
    const options: ApplyTemplateOptions = {
      tenantId,
      templateId: body.templateId,
      userId: user.id,
      customizations: body.customizations,
      ...body.options
    };

    return this.templatesService.applyTemplate(options);
  }

  /**
   * Get applied templates for current tenant
   */
  @Get('tenant/applied')
  async getAppliedTemplates(@CurrentTenant() tenantId: string) {
    return this.templatesService.getAppliedTemplates(tenantId);
  }

  /**
   * Get current tenant's industry profile
   */
  @Get('tenant/profile')
  async getTenantProfile(@CurrentTenant() tenantId: string) {
    return this.templatesService.getTenantIndustryProfile(tenantId);
  }

  /**
   * Update tenant's industry profile
   */
  @Put('tenant/profile')
  async updateTenantProfile(
    @CurrentTenant() tenantId: string,
    @Body() body: {
      primaryIndustry?: string;
      subIndustries?: string[];
      companySize?: string;
      region?: string;
      customizations?: Record<string, any>;
    }
  ) {
    return this.templatesService.updateIndustryProfile(tenantId, body);
  }
}

