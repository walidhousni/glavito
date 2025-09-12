import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IntegrationsService } from './integrations.service';
import { PrismaService } from '@glavito/shared-database';

@Injectable()
export class IntegrationsSyncScheduler {
  private readonly logger = new Logger(IntegrationsSyncScheduler.name);

  constructor(
    private readonly integrations: IntegrationsService,
    private readonly prisma: PrismaService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handlePeriodicSync() {
    const connectors = await this.prisma.integrationConnector.findMany({
      where: { status: 'connected' },
    });
    for (const c of connectors) {
      try {
        this.logger.log(`Periodic sync: ${c.provider} for tenant ${c.tenantId}`);
        const entities = ['customers', 'leads', 'deals'];
        for (const entity of entities) {
          try {
            await this.integrations.manualSync(c.tenantId, c.provider, entity);
          } catch (inner: any) {
            this.logger.warn(`Sync error for ${c.provider}:${entity} - ${inner?.message || inner}`);
          }
        }
      } catch (e: any) {
        this.logger.error(`Periodic sync failed for ${c.provider}: ${e?.message}`);
      }
    }
  }
}


