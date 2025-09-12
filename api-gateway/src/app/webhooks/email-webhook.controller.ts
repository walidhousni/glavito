import { Controller, Post, Body, Headers, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { EnhancedConversationOrchestratorService } from '@glavito/shared-conversation';
import { ChannelType, WebhookPayload } from '@glavito/shared-types';

@ApiTags('webhooks-email')
@Controller('webhooks/email')
export class EmailWebhookController {
  private readonly logger = new Logger(EmailWebhookController.name);

  constructor(private readonly orchestrator: EnhancedConversationOrchestratorService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Email webhook events (parsed email payload)' })
  async handle(@Body() body: unknown, @Headers() headers: Record<string, string>) {
    try {
      const tenantId = this.resolveTenantIdFromHeaders(headers) || this.resolveTenantIdFromBody(body);
      if (!tenantId) {
        this.logger.warn('Unable to resolve tenantId for Email webhook');
        return { success: false, error: 'tenant_not_found' };
      }

      const payload: WebhookPayload = { source: ChannelType.EMAIL, data: body, headers } as unknown as WebhookPayload;
      const res = await this.orchestrator.processWebhook(payload, tenantId);
      return res;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'unknown_error';
      this.logger.error('Email webhook processing failed', err as Error);
      return { success: false, error: message };
    }
  }

  private resolveTenantIdFromHeaders(headers: Record<string, string>): string | null {
    // Common pattern: X-Tenant-Id header from inbound processing pipeline
    const keyLower = 'x-tenant-id';
    const found = (headers as Record<string, unknown>)[keyLower] as string | undefined
      || (headers as Record<string, unknown>)['X-Tenant-Id'] as string | undefined;
    return found || null;
  }

  private resolveTenantIdFromBody(body: unknown): string | null {
    try {
      // Try common envelope formats used by inbound email services
      const b = body as { tenantId?: string; envelope?: { to?: Array<{ email?: string }>|string }; headers?: Record<string, unknown> };
      if (typeof b?.tenantId === 'string') return b.tenantId;
      // If multiple tenants, an upstream router should inject tenantId. Fallback: none.
      return null;
    } catch {
      return null;
    }
  }
}


