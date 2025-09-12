import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { MarketingService } from './marketing.service'

@Injectable()
export class MarketingScheduler implements OnModuleInit {
  private readonly logger = new Logger(MarketingScheduler.name)
  private timer?: NodeJS.Timeout

  constructor(private readonly marketing: MarketingService) {}

  async onModuleInit() {
    this.start()
  }

  private start() {
    if (this.timer) clearInterval(this.timer as any)
    this.timer = setInterval(() => {
      this.tick().catch((e) => this.logger.error('tick error', e))
    }, 5000)
  }

  private async tick() {
    await this.marketing.processScheduledCampaigns()
    await this.marketing.processPendingDeliveries(100)
  }
}


