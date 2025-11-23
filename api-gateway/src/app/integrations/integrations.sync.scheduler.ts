import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IntegrationsService } from './integrations.service';
import { PrismaService } from '@glavito/shared-database';

@Injectable()
export class IntegrationsSyncScheduler {
  private readonly logger = new Logger(IntegrationsSyncScheduler.name);
  private runningSync: Set<string> = new Set();

  constructor(
    private readonly integrations: IntegrationsService,
    private readonly prisma: PrismaService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handlePeriodicSync() {
    this.logger.log('Starting periodic integration sync...');
    
    try {
      // Only sync enabled connectors that are connected
      const connectors = await this.prisma.integrationConnector.findMany({
        where: {
          status: 'connected',
          syncEnabled: true,
        },
      });

      this.logger.log(`Found ${connectors.length} enabled connectors to sync`);

      for (const connector of connectors) {
        const syncKey = `${connector.tenantId}:${connector.provider}`;
        
        // Skip if already syncing
        if (this.runningSync.has(syncKey)) {
          this.logger.debug(`Skipping ${syncKey} - already syncing`);
          continue;
        }

        // Check sync interval
        if (connector.lastSyncAt) {
          const nextSyncTime = new Date(connector.lastSyncAt.getTime() + (connector.syncInterval * 1000));
          if (new Date() < nextSyncTime) {
            this.logger.debug(`Skipping ${syncKey} - next sync at ${nextSyncTime.toISOString()}`);
            continue;
          }
        }

        // Mark as syncing
        this.runningSync.add(syncKey);
        
        // Run sync in background
        this.syncConnector(connector).finally(() => {
          this.runningSync.delete(syncKey);
        });
      }
    } catch (error: any) {
      this.logger.error(`Periodic sync scheduler failed: ${error?.message}`, error.stack);
    }
  }

  private async syncConnector(connector: any) {
    const { tenantId, provider, id } = connector;
    
    try {
      this.logger.log(`Starting sync: ${provider} for tenant ${tenantId}`);
      
      // Update status to syncing
      await this.prisma.integrationConnector.update({
        where: { id },
        data: { status: 'syncing', lastError: null },
      });

      const entities = ['customers', 'leads'];
      let totalImported = 0;
      let totalErrors = 0;

      for (const entity of entities) {
        try {
          const result = await this.integrations.manualSync(tenantId, provider, entity);
          const stats = result as any;
          totalImported += (stats.imported || 0);
          this.logger.log(`Synced ${entity} for ${provider}: ${JSON.stringify(stats)}`);
        } catch (entityError: any) {
          totalErrors++;
          this.logger.warn(`Sync error for ${provider}:${entity} - ${entityError?.message}`);
        }
      }

      // Update status back to connected
      await this.prisma.integrationConnector.update({
        where: { id },
        data: {
          status: 'connected',
          lastSyncAt: new Date(),
          lastError: totalErrors > 0 ? `${totalErrors} entity sync(s) failed` : null,
        },
      });

      this.logger.log(`Completed sync: ${provider} for tenant ${tenantId} - imported ${totalImported} records`);
    } catch (error: any) {
      this.logger.error(`Sync failed for ${provider} (tenant ${tenantId}): ${error?.message}`, error.stack);
      
      // Update status to error
      try {
        await this.prisma.integrationConnector.update({
          where: { id },
          data: {
            status: 'error',
            lastError: error?.message || 'Unknown sync error',
          },
        });
      } catch (updateError: any) {
        this.logger.error(`Failed to update connector status: ${updateError?.message}`);
      }
    }
  }
}


