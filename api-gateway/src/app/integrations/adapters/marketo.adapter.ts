import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { IntegrationAdapter } from './integration-adapter';
import { PrismaService } from '@glavito/shared-database';
import { CrmSyncService } from '../services/crm-sync.service';

@Injectable()
export class MarketoAdapter implements IntegrationAdapter {
  provider = 'marketo';

  constructor(
    private readonly prisma: PrismaService, // For future use
    private readonly crmSync: CrmSyncService, // For future use
  ) {}

  async buildAuthorizeUrl(args: { tenantId: string; redirectUri: string; state?: string; }): Promise<string> {
    const clientId = process.env.MARKETO_CLIENT_ID || '';
    const base = process.env.MARKETO_AUTH_URL || 'https://login.marketo.com/oauth/authorize';
    const state = encodeURIComponent(args.state || `${args.tenantId}:${Date.now()}`);
    const scope = encodeURIComponent('lead_read lead_write');
    return `${base}?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(args.redirectUri)}&scope=${scope}&state=${state}`;
  }

  async refreshToken(args: { tenantId: string; refreshToken: string; redirectUri?: string; }): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number; tokenType?: string; scope?: string }> {
    const tokenUrl = process.env.MARKETO_TOKEN_URL || 'https://login.marketo.com/identity/oauth/token';
    const clientId = process.env.MARKETO_CLIENT_ID || '';
    const clientSecret = process.env.MARKETO_CLIENT_SECRET || '';
    const params = new URLSearchParams();
    params.set('grant_type', 'refresh_token');
    params.set('client_id', clientId);
    params.set('client_secret', clientSecret);
    params.set('refresh_token', args.refreshToken);
    const { data } = await axios.post(tokenUrl, params.toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
      scope: data.scope,
    };
  }

  async handleCallback(args: { tenantId: string; code?: string; state?: string; redirectUri: string; }): Promise<{ connected: boolean; config: Record<string, unknown>; }> {
    try {
      if (!args.code) return { connected: false, config: {} };
      const tokenUrl = process.env.MARKETO_TOKEN_URL || 'https://login.marketo.com/identity/oauth/token';
      const clientId = process.env.MARKETO_CLIENT_ID || '';
      const clientSecret = process.env.MARKETO_CLIENT_SECRET || '';

      const params = new URLSearchParams();
      params.set('grant_type', 'authorization_code');
      params.set('client_id', clientId);
      params.set('client_secret', clientSecret);
      params.set('redirect_uri', args.redirectUri);
      params.set('code', args.code);

      const { data } = await axios.post(tokenUrl, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const config = {
        accessToken: data.access_token as string,
        refreshToken: (data.refresh_token as string) || undefined,
        tokenType: data.token_type as string,
        expiresIn: Number(data.expires_in || 0),
        scope: data.scope as string,
        obtainedAt: new Date().toISOString(),
        tenantId: args.tenantId,
      } as Record<string, unknown>;

      return { connected: Boolean(data?.access_token), config };
    } catch (error) {
      const message = (error as { response?: { data?: unknown }; message?: string })?.response?.data || (error as Error).message;
      return { connected: false, config: { error: message } };
    }
  }

  async syncEntity(args: { tenantId: string; entity: string; lastSyncAt?: Date | null; }): Promise<{ exported?: number; imported?: number; updated?: number; skipped?: number; }> {
    const { tenantId, entity, lastSyncAt } = args; void tenantId; void entity; void lastSyncAt;
    // Stub for leads, activities synchronization
    return { exported: 0, imported: 0, updated: 0, skipped: 0 };
  }

  getDocs() {
    return {
      name: 'Marketo',
      description: 'Sync leads and marketing activities with Marketo.',
      setup: [
        'Create a Marketo custom service and obtain Client ID/Secret.',
        'Configure redirect URI and permissions.',
        'Set MARKETO_CLIENT_ID/SECRET/AUTH_URL/TOKEN_URL environment variables.'
      ],
      env: ['MARKETO_CLIENT_ID', 'MARKETO_CLIENT_SECRET', 'MARKETO_AUTH_URL', 'MARKETO_TOKEN_URL'],
      scopes: ['lead_read', 'lead_write']
    };
  }
}


