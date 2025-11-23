import { Controller, Get, Post, Body, UseGuards, Param, Patch, Query, Headers as HeadersDecorator } from '@nestjs/common';
import { Prisma as PrismaNS } from '@prisma/client';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@glavito/shared-auth';
import { IntegrationsService } from './integrations.service';
import { IntegrationHealthService } from './services/integration-health.service';

@ApiTags('Integrations')
@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly integrations: IntegrationsService,
    private readonly healthService: IntegrationHealthService,
  ) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  list(@CurrentUser() user: any) {
    return this.integrations.listStatuses(user.tenantId);
  }

  // Public catalog
  @Get('catalog')
  getCatalog() {
    return this.integrations.getCatalog();
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

  // Channel setups
  @Post('setup/whatsapp')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  setupWhatsApp(@CurrentUser() user: any, @Body() body: Record<string, unknown>) {
    return this.integrations.setupWhatsApp(user.tenantId, body || {});
  }

  @Post('setup/instagram')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  setupInstagram(@CurrentUser() user: any, @Body() body: Record<string, unknown>) {
    return this.integrations.setupInstagram(user.tenantId, body || {});
  }

  @Post('setup/email')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  setupEmail(@CurrentUser() user: any, @Body() body: Record<string, unknown>) {
    return this.integrations.setupEmail(user.tenantId, body || {});
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

  // Connector docs
  @Get('docs/:provider')
  @ApiOperation({ summary: 'Get connector documentation' })
  getConnectorDocs(@Param('provider') provider: string) {
    return this.integrations.getConnectorDocs(provider);
  }

  // Connector rules (update config subset)
  @Post('connectors/:provider/rules')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update connector rules/config' })
  updateRules(
    @CurrentUser() user: any,
    @Param('provider') provider: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.integrations.updateConnectorRules(user.tenantId, provider, body || {});
  }

  @Patch('connectors/:provider/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  disableConnector(@CurrentUser() user: any, @Param('provider') provider: string) {
    return this.integrations.disableConnector(user.tenantId, provider);
  }

  @Patch('connectors/:provider/refresh')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  refreshConnector(@CurrentUser() user: any, @Param('provider') provider: string) {
    return this.integrations.refreshConnector(user.tenantId, provider);
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
  @ApiOperation({ summary: 'Get OAuth authorization URL' })
  oauthAuthorize(
    @CurrentUser() user: any,
    @Param('provider') provider: string,
    @Query('redirectUri') redirectUri: string,
    @Query('state') state?: string,
  ) {
    const adapter = this.integrations.resolveAdapter(provider);
    if (!adapter) {
      throw new Error(`Adapter not found for provider: ${provider}`);
    }
    
    // Generate secure state token if not provided
    const stateToken = state || `${user.tenantId}:${Date.now()}:${Math.random().toString(36).substring(7)}`;
    
    // Store state in session/cache for validation (in production, use Redis or similar)
    // For now, we'll encode tenantId in state for validation
    
    const authUrl = adapter.buildAuthorizeUrl({ tenantId: user.tenantId, redirectUri, state: stateToken });
    
    return {
      url: authUrl,
      state: stateToken,
    };
  }

  @Post('oauth/callback/:provider')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Handle OAuth callback' })
  async oauthCallback(
    @CurrentUser() user: any,
    @Param('provider') provider: string,
    @Body() body: { code?: string; state?: string; redirectUri: string; error?: string; error_description?: string },
  ) {
    // Handle OAuth errors
    if (body.error) {
      return {
        ok: false,
        error: body.error,
        error_description: body.error_description || 'OAuth authorization failed',
      };
    }

    if (!body.code) {
      return {
        ok: false,
        error: 'missing_code',
        error_description: 'Authorization code not provided',
      };
    }

    // Validate state token (basic validation - in production, verify against stored state)
    if (body.state) {
      const stateParts = body.state.split(':');
      if (stateParts.length >= 1 && stateParts[0] !== user.tenantId) {
        return {
          ok: false,
          error: 'invalid_state',
          error_description: 'State token validation failed',
        };
      }
    }

    try {
      const adapter = this.integrations.resolveAdapter(provider);
      if (!adapter) {
        throw new Error(`Adapter not found for provider: ${provider}`);
      }

      const result = await adapter.handleCallback({
        tenantId: user.tenantId,
        code: body.code,
        state: body.state,
        redirectUri: body.redirectUri,
      });

      if (result.connected) {
        await this.integrations.upsertConnector(user.tenantId, provider, {
          status: 'connected',
          config: result.config as unknown as PrismaNS.InputJsonValue,
        });

        // Log successful connection
        if (this.healthService) {
          const connector = await this.integrations.listConnectors(user.tenantId);
          const integration = connector.find((c) => c.provider === provider);
          if (integration) {
            await this.healthService.logActivity({
              integrationId: integration.id,
              tenantId: user.tenantId,
              action: 'oauth_connect',
              status: 'success',
            });
          }
        }

        return {
          ok: true,
          provider,
          message: 'Successfully connected',
        };
      } else {
        // Log failed connection
        if (this.healthService) {
          const connector = await this.integrations.listConnectors(user.tenantId);
          const integration = connector.find((c) => c.provider === provider);
          if (integration) {
            await this.healthService.logActivity({
              integrationId: integration.id,
              tenantId: user.tenantId,
              action: 'oauth_connect',
              status: 'error',
              errorMessage: (result.config as any).error || 'Connection failed',
            });
          }
        }

        return {
          ok: false,
          error: 'connection_failed',
          error_description: (result.config as any).error || 'Failed to establish connection',
        };
      }
    } catch (error: any) {
      return {
        ok: false,
        error: 'callback_error',
        error_description: error?.message || 'OAuth callback processing failed',
      };
    }
  }

  // Bidirectional Sync - Inbound Webhooks (from CRM to Glavito)
  @Post('webhooks/inbound/:provider')
  @ApiOperation({ summary: 'Handle inbound webhook from CRM provider' })
  async handleInboundWebhook(
    @Param('provider') provider: string,
    @Body() payload: any,
    @HeadersDecorator() headers: Record<string, string>,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.integrations.handleInboundWebhook(provider, payload, headers, tenantId);
  }

  // Bidirectional Sync - Outbound Sync (from Glavito to CRM)
  @Post('sync/outbound/:provider')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trigger outbound sync to CRM provider' })
  async triggerOutboundSync(
    @CurrentUser() user: any,
    @Param('provider') provider: string,
    @Body() body: { entity: string; entityId: string; action: 'create' | 'update' | 'delete' },
  ) {
    return this.integrations.syncOutbound(user.tenantId, provider, body.entity, body.entityId, body.action);
  }

  // Sync Queue Management
  @Get('sync/queue')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get sync queue status' })
  async getSyncQueue(@CurrentUser() user: any) {
    return this.integrations.getSyncQueue(user.tenantId);
  }

  @Post('sync/queue/:id/retry')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retry failed sync item' })
  async retrySyncItem(@CurrentUser() user: any, @Param('id') id: string) {
    return this.integrations.retrySyncItem(user.tenantId, id);
  }

  // Health & Monitoring
  @Get('health')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all integration health statuses for tenant' })
  async getHealthStatus(@CurrentUser() user: any) {
    return this.healthService.getTenantIntegrationsHealth(user.tenantId);
  }

  @Get('health/:integrationId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get specific integration health status' })
  async getIntegrationHealth(
    @CurrentUser() user: any,
    @Param('integrationId') integrationId: string,
  ) {
    const result = await this.healthService.checkIntegrationHealth(integrationId);
    await this.healthService.updateHealthRecord(integrationId, result);
    return result;
  }

  @Get('logs')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get integration activity logs' })
  async getLogs(
    @CurrentUser() user: any,
    @Query('integrationId') integrationId?: string,
    @Query('action') action?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.healthService.getIntegrationLogs({
      integrationId,
      tenantId: user.tenantId,
      action,
      status,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Post('connectors/:provider/test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test integration connection' })
  async testConnection(
    @CurrentUser() user: any,
    @Param('provider') provider: string,
  ) {
    const connector = await this.integrations.listConnectors(user.tenantId);
    const integration = connector.find((c) => c.provider === provider);
    
    if (!integration) {
      throw new Error(`Integration not found for provider: ${provider}`);
    }

    const result = await this.healthService.checkIntegrationHealth(integration.id);
    await this.healthService.updateHealthRecord(integration.id, result);
    
    return {
      success: result.status === 'healthy',
      status: result.status,
      latency: result.latency,
      error: result.error,
      timestamp: result.timestamp,
    };
  }

  @Get('sync-history/:provider')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get sync history for a provider' })
  async getSyncHistory(
    @CurrentUser() user: any,
    @Param('provider') provider: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const connector = await this.integrations.listConnectors(user.tenantId);
    const integration = connector.find((c) => c.provider === provider);
    
    if (!integration) {
      throw new Error(`Integration not found for provider: ${provider}`);
    }

    return this.integrations.getSyncHistory(user.tenantId, integration.id, {
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }
}


