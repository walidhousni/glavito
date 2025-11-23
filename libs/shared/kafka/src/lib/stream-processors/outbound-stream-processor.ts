import { Injectable, Logger } from '@nestjs/common'
import type { DomainEvent } from '@glavito/shared-types'

@Injectable()
export class OutboundStreamProcessor {
  private readonly logger = new Logger(OutboundStreamProcessor.name)

  async process(event: DomainEvent): Promise<DomainEvent[]> {
    try {
      if (event.aggregateType !== 'outbound') return []
      if (event.eventType !== 'outbound.message.requested') return []
      this.logger.debug(`Outbound requested for conversation=${event.eventData?.['conversationId']}`)
      return []
    } catch (err) {
      this.logger.error('Outbound stream processing failed', err as Error)
      throw err
    }
  }
}


