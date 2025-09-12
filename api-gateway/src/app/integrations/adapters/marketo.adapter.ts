import { Injectable } from '@nestjs/common';
import { IntegrationAdapter } from './integration-adapter';

@Injectable()
export class MarketoAdapter implements IntegrationAdapter {
  provider = 'marketo';

  async buildAuthorizeUrl(args: { tenantId: string; redirectUri: string; state?: string; }): Promise<string> {
    const clientId = process.env.MARKETO_CLIENT_ID || '';
    const base = process.env.MARKETO_AUTH_URL || 'https://login.marketo.com/oauth/authorize';
    const state = encodeURIComponent(args.state || `${args.tenantId}:${Date.now()}`);
    const scope = encodeURIComponent('lead_read lead_write');
    return `${base}?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(args.redirectUri)}&scope=${scope}&state=${state}`;
  }

  async handleCallback(args: { tenantId: string; code?: string; state?: string; redirectUri: string; }): Promise<{ connected: boolean; config: Record<string, unknown>; }> {
    return { connected: true, config: { accessToken: 'stub', expiresIn: 3600 } };
  }

  async syncEntity(args: { tenantId: string; entity: string; }): Promise<{ exported?: number; imported?: number; updated?: number; skipped?: number; }> {
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


