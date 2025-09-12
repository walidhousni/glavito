import { Injectable } from '@nestjs/common';
import { IntegrationAdapter } from './integration-adapter';

@Injectable()
export class DynamicsAdapter implements IntegrationAdapter {
  provider = 'dynamics';

  async buildAuthorizeUrl(args: { tenantId: string; redirectUri: string; state?: string; }): Promise<string> {
    const clientId = process.env.DYNAMICS_CLIENT_ID || '';
    const base = process.env.DYNAMICS_AUTH_URL || 'https://login.microsoftonline.com/common/oauth2/authorize';
    const state = encodeURIComponent(args.state || `${args.tenantId}:${Date.now()}`);
    const scope = encodeURIComponent('https://crm.dynamics.com/.default offline_access');
    return `${base}?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(args.redirectUri)}&scope=${scope}&state=${state}`;
  }

  async handleCallback(args: { tenantId: string; code?: string; state?: string; redirectUri: string; }): Promise<{ connected: boolean; config: Record<string, unknown>; }> {
    // Stub implementation - in production, exchange code for tokens at token endpoint
    return { connected: true, config: { accessToken: 'stub', tenantId: args.tenantId, resource: 'https://crm.dynamics.com' } };
  }

  async syncEntity(args: { tenantId: string; entity: string; }): Promise<{ exported?: number; imported?: number; updated?: number; skipped?: number; }> {
    // Stub sync - replace with real queries to Dynamics 365
    return { exported: 0, imported: 0, updated: 0, skipped: 0 };
  }

  getDocs() {
    return {
      name: 'Microsoft Dynamics 365',
      description: 'Bidirectional sync of customers, leads, and opportunities (deals) with Dynamics 365.',
      setup: [
        'Create an Azure App Registration and obtain Client ID/Secret.',
        'Grant API permissions to Dynamics and configure redirect URI.',
        'Set DYNAMICS_CLIENT_ID/SECRET/AUTH_URL/TOKEN_URL environment variables.'
      ],
      env: ['DYNAMICS_CLIENT_ID', 'DYNAMICS_CLIENT_SECRET', 'DYNAMICS_AUTH_URL', 'DYNAMICS_TOKEN_URL'],
      scopes: ['https://crm.dynamics.com/.default', 'offline_access']
    };
  }
}


