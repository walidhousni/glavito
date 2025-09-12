import { Injectable } from '@nestjs/common';
import { IntegrationAdapter } from './integration-adapter';

@Injectable()
export class PardotAdapter implements IntegrationAdapter {
  provider = 'pardot';

  async buildAuthorizeUrl(args: { tenantId: string; redirectUri: string; state?: string; }): Promise<string> {
    const clientId = process.env.PARDOT_CLIENT_ID || '';
    const base = process.env.PARDOT_AUTH_URL || 'https://login.salesforce.com/services/oauth2/authorize';
    const state = encodeURIComponent(args.state || `${args.tenantId}:${Date.now()}`);
    const scope = encodeURIComponent('refresh_token pardot_api');
    return `${base}?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(args.redirectUri)}&scope=${scope}&state=${state}`;
  }

  async handleCallback(args: { tenantId: string; code?: string; state?: string; redirectUri: string; }): Promise<{ connected: boolean; config: Record<string, unknown>; }> {
    return { connected: true, config: { accessToken: 'stub', instanceUrl: 'https://pi.pardot.com' } };
  }

  async syncEntity(args: { tenantId: string; entity: string; }): Promise<{ exported?: number; imported?: number; updated?: number; skipped?: number; }> {
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


