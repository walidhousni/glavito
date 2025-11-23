import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { MarketingService } from './marketing.service'
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MarketingScheduler implements OnModuleInit {
  private readonly logger = new Logger(MarketingScheduler.name)
  private timer?: NodeJS.Timeout

  constructor(
    private readonly marketing: MarketingService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() { this.start() }

  private start() {
    if (this.timer) clearInterval(this.timer as any)
    this.timer = setInterval(() => { this.tick().catch((e) => this.logger.error('tick error', e)) }, 5000)
  }

  private async tick() {
    try {
      await this.marketing.processScheduledCampaigns();
      await this.marketing.processPendingDeliveries(100);
      const tenantId = this.config.get('TENANT_ID') || ''
      const count = await this.marketing.requeueFailedDeliveries(tenantId, 50)
      if (count > 0) this.logger.warn(`${count} deliveries queued for retry`)
    } catch (err) {
      const msg = (err instanceof Error) ? err.message : 'unknown'
      this.logger.error(`Marketing scheduler tick failed: ${msg}`)
    }
  }
}


