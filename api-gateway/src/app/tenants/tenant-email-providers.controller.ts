import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant, Roles, RolesGuard } from '@glavito/shared-auth';
import { TenantEmailProvidersService } from './tenant-email-providers.service';

@ApiTags('Tenants Email Providers')
@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TenantEmailProvidersController {
  constructor(private readonly service: TenantEmailProvidersService) {}

  // Current tenant aliases
  @Get('me/email/providers')
  @ApiOperation({ summary: 'List email providers for current tenant' })
  async listMe(@CurrentTenant() tenantId: string) {
    return this.service.list(tenantId);
  }
  @Post('me/email/providers')
  @Roles('admin')
  @ApiOperation({ summary: 'Create email provider for current tenant' })
  async createMe(@CurrentTenant() tenantId: string, @Body() body: any) {
    return this.service.create(tenantId, body || {});
  }
  @Patch('me/email/providers/:providerId')
  @Roles('admin')
  @ApiOperation({ summary: 'Update email provider for current tenant' })
  async updateMe(@CurrentTenant() tenantId: string, @Param('providerId') id: string, @Body() body: any) {
    return this.service.update(tenantId, id, body || {});
  }
  @Delete('me/email/providers/:providerId')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete email provider for current tenant' })
  async deleteMe(@CurrentTenant() tenantId: string, @Param('providerId') id: string) {
    return this.service.remove(tenantId, id);
  }
  @Post('me/email/providers/:providerId/verify-domain')
  @Roles('admin')
  @ApiOperation({ summary: 'Verify email sending domain for current tenant' })
  async verifyMe(@CurrentTenant() tenantId: string, @Param('providerId') id: string) {
    return this.service.verifyDomain(tenantId, id);
  }

  @Get(':id/email/providers')
  @ApiOperation({ summary: 'List tenant email provider configurations' })
  async list(@Param('id') tenantId: string) {
    return this.service.list(tenantId);
  }

  @Post(':id/email/providers')
  @Roles('admin')
  @ApiOperation({ summary: 'Create tenant email provider configuration' })
  async create(
    @Param('id') tenantId: string,
    @Body()
    body: {
      provider: 'SMTP' | 'SES' | 'SENDGRID' | 'ALIYUN_DM';
      isPrimary?: boolean;
      fromName: string;
      fromEmail: string;
      replyToEmail?: string;
      dkimDomain?: string;
      trackingDomain?: string;
      ratePerSecond?: number;
      credentials: Record<string, unknown>;
    },
  ) {
    return this.service.create(tenantId, body);
  }

  @Patch(':tenantId/email/providers/:providerId')
  @Roles('admin')
  @ApiOperation({ summary: 'Update tenant email provider configuration' })
  async update(
    @Param('tenantId') tenantId: string,
    @Param('providerId') id: string,
    @Body() body: Partial<{
      isPrimary: boolean;
      fromName: string;
      fromEmail: string;
      replyToEmail?: string;
      dkimDomain?: string;
      trackingDomain?: string;
      ratePerSecond?: number;
      credentials: Record<string, unknown> | string;
    }>,
  ) {
    return this.service.update(tenantId, id, body || {});
  }

  @Delete(':tenantId/email/providers/:providerId')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete tenant email provider configuration' })
  async remove(@Param('tenantId') tenantId: string, @Param('providerId') id: string) {
    return this.service.remove(tenantId, id);
  }

  @Post(':tenantId/email/providers/:providerId/verify-domain')
  @Roles('admin')
  @ApiOperation({ summary: 'Trigger verification of sending domain' })
  async verify(@Param('tenantId') tenantId: string, @Param('providerId') id: string) {
    return this.service.verifyDomain(tenantId, id);
  }
}


