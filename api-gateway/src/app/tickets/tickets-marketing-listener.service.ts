import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { EventPublisherService } from '@glavito/shared-kafka';
import type { MarketingEventPayload } from '@glavito/shared-types';

@Injectable()
export class TicketsMarketingListenerService implements OnModuleInit {
  private readonly logger = new Logger(TicketsMarketingListenerService.name);

  constructor(
    private readonly eventPublisher: EventPublisherService,
    private readonly ticketsService: TicketsService,
  ) {}

  async onModuleInit() {
    try {
      await this.eventPublisher.subscribeToEvents(['marketing-events'], this.handleMarketingEvent.bind(this));
      this.logger.log('TicketsMarketingListenerService subscribed to marketing-events');
    } catch (error) {
      this.logger.error('Failed to subscribe to marketing-events:', error);
    }
  }

  private async handleMarketingEvent(event: MarketingEventPayload) {
    try {
      if (event.eventType === 'marketing.delivery.failed') {
        const { campaignId, customerId, error, channel } = event.data;
        if (customerId) {
          // Create low-priority ticket for delivery failure (e.g., bounce, invalid contact)
          const ticketData = {
            tenantId: event.tenantId,
            customerId,
            subject: `Delivery failure: ${error || 'Unknown error'} for customer`,
            description: `Marketing delivery failed for campaign ${campaignId} via ${channel}. Error: ${error}. Please investigate and contact customer if needed.`,
            priority: 'low' as const,
            tags: ['marketing', 'delivery-failure', `campaign:${campaignId}`],
          };
          await this.ticketsService.create(ticketData as any);
          this.logger.log(`Auto-created ticket for marketing delivery failure: ${campaignId} -> customer ${customerId}`);
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to handle marketing event ${event.eventType}:`, error);
    }
  }
}
