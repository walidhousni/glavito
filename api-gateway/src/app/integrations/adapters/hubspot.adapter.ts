import { Injectable } from '@nestjs/common';
import { IntegrationAdapter } from './integration-adapter';

@Injectable()
export class HubspotAdapter implements IntegrationAdapter {
  provider = 'hubspot';

  async buildAuthorizeUrl(args: { tenantId: string; redirectUri: string; state?: string; }): Promise<string> {
    const clientId = process.env.HUBSPOT_CLIENT_ID || '';
    const base = process.env.HUBSPOT_AUTH_URL || 'https://app.hubspot.com/oauth/authorize';
    const scopes = encodeURIComponent('crm.objects.contacts.read crm.objects.contacts.write');
    const state = encodeURIComponent(args.state || `${args.tenantId}:${Date.now()}`);
    return `${base}?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(args.redirectUri)}&scope=${scopes}&state=${state}`;
  }

  async handleCallback(args: { tenantId: string; code?: string; state?: string; redirectUri: string; }): Promise<{ connected: boolean; config: Record<string, unknown>; }> {
    // Stub: exchange code for tokens with HubSpot token endpoint
    return { connected: true, config: { accessToken: 'stub', expiresIn: 3600 } };
  }

  async syncEntity(args: { tenantId: string; entity: string; }): Promise<{ exported?: number; imported?: number; updated?: number; skipped?: number; }> {
    return { exported: 0, imported: 0, updated: 0, skipped: 0 };
  }

  getDocs() {
    return {
      name: 'HubSpot',
      description: 'Connects HubSpot CRM for contacts and deals synchronization.',
      setup: [
        'Create a private app or OAuth app in HubSpot and obtain Client ID/Secret.',
        'Configure redirect URI to match authorize call.',
        'Set HUBSPOT_CLIENT_ID/SECRET/AUTH_URL/TOKEN_URL environment variables.',
      ],
      env: ['HUBSPOT_CLIENT_ID', 'HUBSPOT_CLIENT_SECRET', 'HUBSPOT_AUTH_URL', 'HUBSPOT_TOKEN_URL'],
      scopes: ['crm.objects.contacts.read', 'crm.objects.contacts.write'],
    };
  }
}


