import { Injectable } from '@nestjs/common';
import { IntegrationAdapter } from './integration-adapter';

@Injectable()
export class SalesforceAdapter implements IntegrationAdapter {
  provider = 'salesforce';

  async buildAuthorizeUrl(args: { tenantId: string; redirectUri: string; state?: string; }): Promise<string> {
    const clientId = process.env.SALESFORCE_CLIENT_ID || '';
    const base = process.env.SALESFORCE_AUTH_URL || 'https://login.salesforce.com/services/oauth2/authorize';
    const state = encodeURIComponent(args.state || `${args.tenantId}:${Date.now()}`);
    return `${base}?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(args.redirectUri)}&state=${state}`;
  }

  async handleCallback(args: { tenantId: string; code?: string; state?: string; redirectUri: string; }): Promise<{ connected: boolean; config: Record<string, unknown>; }> {
    // Stub: in real impl, exchange code for tokens via token endpoint
    return { connected: true, config: { accessToken: 'stub', instanceUrl: 'https://example.my.salesforce.com' } };
  }

  async syncEntity(args: { tenantId: string; entity: string; }): Promise<{ exported?: number; imported?: number; updated?: number; skipped?: number; }> {
    // Stub behavior: pretend to sync customers
    return { exported: 0, imported: 0, updated: 0, skipped: 0 };
  }

  getDocs() {
    return {
      name: 'Salesforce',
      description: 'Connects Salesforce CRM for bidirectional sync of customers, leads, and deals.',
      setup: [
        'Create a Connected App in Salesforce and obtain Client ID/Secret.',
        'Add the callback URL to the app (same as redirectUri used in authorize).',
        'Configure environment variables SALESFORCE_CLIENT_ID/SECRET/AUTH_URL/TOKEN_URL.',
      ],
      env: ['SALESFORCE_CLIENT_ID', 'SALESFORCE_CLIENT_SECRET', 'SALESFORCE_AUTH_URL', 'SALESFORCE_TOKEN_URL'],
      scopes: ['api', 'refresh_token'],
    };
  }
}


