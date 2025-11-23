import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { IntegrationAdapter } from './integration-adapter';
import { PrismaService } from '@glavito/shared-database';
import { CrmSyncService } from '../services/crm-sync.service';

@Injectable()
export class PardotAdapter implements IntegrationAdapter {
  provider = 'pardot';

  constructor(
    private readonly prisma: PrismaService, // For future use
    private readonly crmSync: CrmSyncService, // For future use
  ) {}

  async buildAuthorizeUrl(args: { tenantId: string; redirectUri: string; state?: string; }): Promise<string> {
    const clientId = process.env.PARDOT_CLIENT_ID || '';
    const base = process.env.PARDOT_AUTH_URL || 'https://login.salesforce.com/services/oauth2/authorize';
    const state = encodeURIComponent(args.state || `${args.tenantId}:${Date.now()}`);
    const scope = encodeURIComponent('refresh_token pardot_api');
    return `${base}?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(args.redirectUri)}&scope=${scope}&state=${state}`;
  }

  async refreshToken(args: { tenantId: string; refreshToken: string; redirectUri?: string; }): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number; tokenType?: string; scope?: string }> {
    const tokenUrl = process.env.PARDOT_TOKEN_URL || 'https://login.salesforce.com/services/oauth2/token';
    const clientId = process.env.PARDOT_CLIENT_ID || '';
    const clientSecret = process.env.PARDOT_CLIENT_SECRET || '';
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
      const tokenUrl = process.env.PARDOT_TOKEN_URL || 'https://login.salesforce.com/services/oauth2/token';
      const clientId = process.env.PARDOT_CLIENT_ID || '';
      const clientSecret = process.env.PARDOT_CLIENT_SECRET || '';

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
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        instanceUrl: data.instance_url || 'https://pi.pardot.com',
        tokenType: data.token_type,
        scope: data.scope,
        expiresIn: data.expires_in,
        obtainedAt: new Date().toISOString(),
        tenantId: args.tenantId,
      } as Record<string, unknown>;

      return { connected: Boolean(data?.access_token), config };
    } catch (err: any) {
      return { connected: false, config: { error: err?.response?.data || err?.message } };
    }
  }

  async syncEntity(args: { tenantId: string; entity: string; lastSyncAt?: Date | null; }): Promise<{ exported?: number; imported?: number; updated?: number; skipped?: number; }> {
    const { tenantId, entity, lastSyncAt } = args; void tenantId; void entity; void lastSyncAt;
    return { exported: 0, imported: 0, updated: 0, skipped: 0 };
  }

  getDocs() {
    return {
      name: 'Pardot (Account Engagement)',
      description: 'Sync prospects and campaigns with Salesforce Pardot.',
      setup: [
        'Create a Salesforce Connected App with Pardot scopes.',
        'Configure callback URL and permissions.',
        'Set PARDOT_CLIENT_ID/SECRET/AUTH_URL/TOKEN_URL environment variables.'
      ],
      env: ['PARDOT_CLIENT_ID', 'PARDOT_CLIENT_SECRET', 'PARDOT_AUTH_URL', 'PARDOT_TOKEN_URL'],
      scopes: ['pardot_api', 'refresh_token']
    };
  }
}


