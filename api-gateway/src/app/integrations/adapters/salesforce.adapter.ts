import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { IntegrationAdapter } from './integration-adapter';
import { PrismaService } from '@glavito/shared-database';
import { CrmSyncService } from '../services/crm-sync.service';

@Injectable()
export class SalesforceAdapter implements IntegrationAdapter {
  provider = 'salesforce';
  private readonly logger = new Logger(SalesforceAdapter.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crmSync: CrmSyncService,
  ) {}

  async buildAuthorizeUrl(args: { tenantId: string; redirectUri: string; state?: string; }): Promise<string> {
    const clientId = process.env.SALESFORCE_CLIENT_ID || '';
    const base = process.env.SALESFORCE_AUTH_URL || 'https://login.salesforce.com/services/oauth2/authorize';
    const state = encodeURIComponent(args.state || `${args.tenantId}:${Date.now()}`);
    return `${base}?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(args.redirectUri)}&state=${state}`;
  }

  async refreshToken(args: { tenantId: string; refreshToken: string; redirectUri?: string; }): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number; tokenType?: string; scope?: string }> {
    const tokenUrl = process.env.SALESFORCE_TOKEN_URL || 'https://login.salesforce.com/services/oauth2/token';
    const clientId = process.env.SALESFORCE_CLIENT_ID || '';
    const clientSecret = process.env.SALESFORCE_CLIENT_SECRET || '';
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
      const tokenUrl = process.env.SALESFORCE_TOKEN_URL || 'https://login.salesforce.com/services/oauth2/token';
      const clientId = process.env.SALESFORCE_CLIENT_ID || '';
      const clientSecret = process.env.SALESFORCE_CLIENT_SECRET || '';

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
        instanceUrl: data.instance_url,
        id: data.id,
        issuedAt: data.issued_at,
        tokenType: data.token_type,
        scope: data.scope,
        tenantId: args.tenantId,
        obtainedAt: new Date().toISOString(),
      } as Record<string, unknown>;

      return { connected: Boolean(data?.access_token), config };
    } catch (err: any) {
      return { connected: false, config: { error: err?.response?.data || err?.message } };
    }
  }

  async syncEntity(args: { tenantId: string; entity: string; lastSyncAt?: Date | null; }): Promise<{ exported?: number; imported?: number; updated?: number; skipped?: number; }> {
    const { tenantId, entity, lastSyncAt } = args;
    
    try {
      const connector = await this.getConnectorConfig(tenantId);
      const accessToken = (connector.config as any).accessToken;
      const instanceUrl = (connector.config as any).instanceUrl;
      
      if (!accessToken || !instanceUrl) {
        throw new Error('Missing Salesforce credentials');
      }

      let imported = 0;
      let updated = 0;
      let skipped = 0;

      if (entity === 'customers' || entity === 'contacts') {
        // Build SOQL query with incremental sync support
        let query = 'SELECT Id,Email,FirstName,LastName,Phone,MobilePhone,AccountId,Account.Name,Title,Department,CreatedDate,LastModifiedDate FROM Contact WHERE Email != null';
        if (lastSyncAt) {
          const isoDate = lastSyncAt.toISOString();
          query += ` AND LastModifiedDate >= ${isoDate}`;
        }
        query += ' ORDER BY LastModifiedDate DESC LIMIT 200';
        
        const response = await axios.get(
          `${instanceUrl}/services/data/v57.0/query?q=${encodeURIComponent(query)}`,
          { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
        );

        const records = response.data?.records || [];
        
        // Get field mappings
        const mappings = await this.getFieldMappings(tenantId, 'customer');
        
        // Import customers using CRM sync service
        for (const record of records) {
          try {
            const existing = await this.crmSync.upsertCustomerFromCrm(tenantId, record, mappings);
            // Determine if this was an update or import
            if (lastSyncAt && existing) {
              updated++;
            } else {
              imported++;
            }
          } catch (error: any) {
            this.logger.warn(`Failed to import contact ${record.Id}: ${error?.message}`);
            skipped++;
          }
        }
      }

      if (entity === 'leads') {
        // Build SOQL query with incremental sync support
        let query = 'SELECT Id,Email,FirstName,LastName,Phone,Company,Title,Status,LeadSource,Rating,CreatedDate,LastModifiedDate FROM Lead WHERE Email != null';
        if (lastSyncAt) {
          const isoDate = lastSyncAt.toISOString();
          query += ` AND LastModifiedDate >= ${isoDate}`;
        }
        query += ' ORDER BY LastModifiedDate DESC LIMIT 200';
        
        const response = await axios.get(
          `${instanceUrl}/services/data/v57.0/query?q=${encodeURIComponent(query)}`,
          { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
        );

        const records = response.data?.records || [];
        
        // Get field mappings
        const mappings = await this.getFieldMappings(tenantId, 'lead');
        const config = await this.crmSync.getIntegrationConfig(tenantId, 'salesforce');
        
        // Import leads
        for (const record of records) {
          try {
            // First create/update customer
            const customer = await this.crmSync.upsertCustomerFromCrm(tenantId, record, mappings);
            
            if (customer) {
              // Then create/update lead
              await this.crmSync.upsertLeadFromCrm(tenantId, record, mappings, customer);
              
              // Optionally create ticket
              if (config?.autoCreateTickets) {
                await this.crmSync.createTicketFromCrmLead(tenantId, record, customer, true);
              }
            }
            
            imported++;
          } catch (error: any) {
            this.logger.warn(`Failed to import lead ${record.Id}: ${error?.message}`);
            skipped++;
          }
        }
      }

      return { exported: 0, imported, updated, skipped };
    } catch (error: any) {
      this.logger.error(`Salesforce sync failed: ${error?.message}`);
      throw error;
    }
  }

  private async getConnectorConfig(tenantId: string): Promise<any> {
    const connector = await this.prisma.integrationConnector.findUnique({
      where: {
        tenantId_provider: { tenantId, provider: 'salesforce' } as any,
      },
    });
    
    if (!connector) {
      throw new Error('Salesforce connector not found');
    }
    
    return connector;
  }

  private async getFieldMappings(tenantId: string, entity: string): Promise<Record<string, unknown>> {
    const mappings = await this.prisma.integrationFieldMapping.findFirst({
      where: {
        tenantId,
        provider: 'salesforce',
        sourceEntity: entity,
        isActive: true,
      },
    });

    return (mappings?.mappings as Record<string, unknown>) || {
      Email: 'email',
      FirstName: 'firstName',
      LastName: 'lastName',
      Phone: 'phone',
      Company: 'company',
    };
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


