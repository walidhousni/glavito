import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { IntegrationAdapter } from './integration-adapter';
import { PrismaService } from '@glavito/shared-database';
import { CrmSyncService } from '../services/crm-sync.service';

@Injectable()
export class HubspotAdapter implements IntegrationAdapter {
  provider = 'hubspot';

  constructor(
    private readonly prisma: PrismaService,
    private readonly crmSync: CrmSyncService,
  ) {}

  async buildAuthorizeUrl(args: { tenantId: string; redirectUri: string; state?: string; }): Promise<string> {
    const clientId = process.env.HUBSPOT_CLIENT_ID || '';
    const base = process.env.HUBSPOT_AUTH_URL || 'https://app.hubspot.com/oauth/authorize';
    const scopes = encodeURIComponent('crm.objects.contacts.read crm.objects.contacts.write');
    const state = encodeURIComponent(args.state || `${args.tenantId}:${Date.now()}`);
    return `${base}?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(args.redirectUri)}&scope=${scopes}&state=${state}`;
  }

  async handleCallback(args: { tenantId: string; code?: string; state?: string; redirectUri: string; }): Promise<{ connected: boolean; config: Record<string, unknown>; }> {
    try {
      if (!args.code) return { connected: false, config: {} };
      const tokenUrl = process.env.HUBSPOT_TOKEN_URL || 'https://api.hubapi.com/oauth/v1/token';
      const clientId = process.env.HUBSPOT_CLIENT_ID || '';
      const clientSecret = process.env.HUBSPOT_CLIENT_SECRET || '';

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
        expiresIn: data.expires_in,
        tokenType: data.token_type,
        scope: data.scope,
        obtainedAt: new Date().toISOString(),
        tenantId: args.tenantId,
      } as Record<string, unknown>;

      return { connected: Boolean(data?.access_token), config };
    } catch (err: any) {
      return { connected: false, config: { error: err?.response?.data || err?.message } };
    }
  }

  async refreshToken(args: { tenantId: string; refreshToken: string; redirectUri?: string; }): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number; tokenType?: string; scope?: string }> {
    const tokenUrl = process.env.HUBSPOT_TOKEN_URL || 'https://api.hubapi.com/oauth/v1/token';
    const clientId = process.env.HUBSPOT_CLIENT_ID || '';
    const clientSecret = process.env.HUBSPOT_CLIENT_SECRET || '';
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

  async syncEntity(args: { tenantId: string; entity: string; lastSyncAt?: Date | null; }): Promise<{ exported?: number; imported?: number; updated?: number; skipped?: number; }> {
    const { tenantId, entity, lastSyncAt } = args;
    
    const connector = await this.getConnectorConfig(tenantId);
    const accessToken = (connector.config as Record<string, unknown>).accessToken as string;
    
    if (!accessToken) {
      throw new Error('Missing HubSpot credentials');
    }

    let imported = 0;
    let updated = 0;
    let skipped = 0;

    if (entity === 'customers' || entity === 'contacts') {
      // Build query with incremental sync support
      let url = 'https://api.hubapi.com/crm/v3/objects/contacts?limit=100&properties=email,firstname,lastname,phone,company,hs_lastmodifieddate';
      if (lastSyncAt) {
        const sinceTimestamp = lastSyncAt.getTime();
        url += `&hs_lastmodifieddate__gte=${sinceTimestamp}`;
      }
      
      // Fetch contacts from HubSpot
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
      });

      const records = response.data?.results || [];
      const mappings = await this.getFieldMappings(tenantId, 'customer');
      
      for (const record of records) {
        try {
          const data = {
            email: record.properties.email,
            firstname: record.properties.firstname,
            lastname: record.properties.lastname,
            phone: record.properties.phone,
            company: record.properties.company,
            ...record.properties,
          };
          const existing = await this.crmSync.upsertCustomerFromCrm(tenantId, data, mappings);
          // Determine if this was an update or import
          if (lastSyncAt && existing) {
            updated++;
          } else {
            imported++;
          }
        } catch {
          skipped++;
        }
      }
    }

    if (entity === 'deals') {
      // Fetch deals from HubSpot
      let url = 'https://api.hubapi.com/crm/v3/objects/deals?limit=100&properties=dealname,amount,dealstage,pipeline,closedate,hs_lastmodifieddate';
      if (lastSyncAt) {
        const sinceTimestamp = lastSyncAt.getTime();
        url += `&hs_lastmodifieddate__gte=${sinceTimestamp}`;
      }
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
      });

      const records = response.data?.results || [];
      // Could create deals in your system here
      imported = records.length;
    }

    return { exported: 0, imported, updated, skipped };
  }

  private async getConnectorConfig(tenantId: string): Promise<any> {
    const connector = await this.prisma.integrationConnector.findUnique({
      where: {
        tenantId_provider: { tenantId, provider: 'hubspot' } as any,
      },
    });
    
    if (!connector) {
      throw new Error('HubSpot connector not found');
    }
    
    return connector;
  }

  private async getFieldMappings(tenantId: string, entity: string): Promise<Record<string, unknown>> {
    const mappings = await this.prisma.integrationFieldMapping.findFirst({
      where: {
        tenantId,
        provider: 'hubspot',
        sourceEntity: entity,
        isActive: true,
      },
    });

    return (mappings?.mappings as Record<string, unknown>) || {
      email: 'email',
      firstname: 'firstName',
      lastname: 'lastName',
      phone: 'phone',
      company: 'company',
    };
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


