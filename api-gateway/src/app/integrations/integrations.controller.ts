import { Controller, Get, Post, Body, UseGuards, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@glavito/shared-auth';
import { IntegrationsService } from './integrations.service';

@ApiTags('Integrations')
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  list(@CurrentUser() user: any) {
    return this.integrations.listStatuses(user.tenantId);
  }

  @Post('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  upsert(
    @CurrentUser() user: any,
    @Body()
    body: {
      type: string;
      status?: string;
      configuration?: Record<string, any>;
    },
  ) {
    return this.integrations.upsertStatus(user.tenantId, body.type, {
      status: body.status,
      configuration: body.configuration,
    });
  }

  // Connectors
  @Get('connectors')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  listConnectors(@CurrentUser() user: any) {
    return this.integrations.listConnectors(user.tenantId);
  }

  @Post('connectors')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  upsertConnector(
    @CurrentUser() user: any,
    @Body() body: { provider: string; status?: string; config?: Record<string, any> },
  ) {
    return this.integrations.upsertConnector(user.tenantId, body.provider, {
      status: body.status,
      config: body.config,
    });
  }

  @Patch('connectors/:provider/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  disableConnector(@CurrentUser() user: any, @Param('provider') provider: string) {
    return this.integrations.disableConnector(user.tenantId, provider);
  }

  @Post('connectors/:provider/sync')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  manualSync(
    @CurrentUser() user: any,
    @Param('provider') provider: string,
    @Body() body: { entity: string },
  ) {
    return this.integrations.manualSync(user.tenantId, provider, body.entity || 'customers');
  }

  // Field mappings per connector
  @Get('connectors/:provider/mappings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  listMappings(@CurrentUser() user: any, @Param('provider') provider: string) {
    return this.integrations.listFieldMappings(user.tenantId, provider);
  }

  @Post('connectors/:provider/mappings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  upsertMapping(
    @CurrentUser() user: any,
    @Param('provider') provider: string,
    @Body() body: { id?: string; sourceEntity: string; targetEntity?: string; mappings: Record<string, any>; direction?: 'inbound' | 'outbound' | 'both'; isActive?: boolean }
  ) {
    return this.integrations.upsertFieldMapping(user.tenantId, provider, body as any);
  }

  @Patch('connectors/:provider/mappings/:id/delete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  deleteMapping(@CurrentUser() user: any, @Param('provider') provider: string, @Param('id') id: string) {
    return this.integrations.deleteFieldMapping(user.tenantId, provider, id);
  }

  // OAuth
  @Get('oauth/authorize/:provider')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  oauthAuthorize(
    @CurrentUser() user: any,
    @Param('provider') provider: string,
    @Query('redirectUri') redirectUri: string,
    @Query('state') state?: string,
  ) {
    // The service will choose adapter and build the URL
    return this.integrations['resolveAdapter'](provider).buildAuthorizeUrl({ tenantId: user.tenantId, redirectUri, state });
  }

  @Post('oauth/callback/:provider')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async oauthCallback(
    @CurrentUser() user: any,
    @Param('provider') provider: string,
    @Body() body: { code?: string; state?: string; redirectUri: string },
  ) {
    const adapter = (this.integrations as any)['resolveAdapter'](provider);
    const result = await adapter.handleCallback({ tenantId: user.tenantId, code: body.code, state: body.state, redirectUri: body.redirectUri });
    if (result.connected) {
      await this.integrations.upsertConnector(user.tenantId, provider, { status: 'connected', config: result.config });
    }
    return { ok: result.connected };
  }

  // Developer docs for integrations
  @Get('docs/:provider')
  docs(@Param('provider') provider: string) {
    const adapter = (this.integrations as any)['resolveAdapter'](provider);
    return adapter.getDocs();
  }
}


