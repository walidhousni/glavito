import { Module, OnModuleInit, Optional } from '@nestjs/common'
import { AnalyticsModule as SharedAnalyticsModule } from '@glavito/shared-analytics'
import { AnalyticsController } from './analytics.controller'
import { AnalyticsService } from './analytics.service'
import { AnalyticsReportingService } from './analytics-reporting.service'
import { FilesModule } from '../files/files.module'
import { HttpModule } from '@nestjs/axios'
// eslint-disable-next-line @nx/enforce-module-boundaries
import { EventPublisherService, KafkaModule, EventStoreService, AnalyticsStreamProcessor } from '@glavito/shared-kafka'
import { DatabaseModule, DatabaseService } from '@glavito/shared-database'
import { AIIntelligenceService } from '@glavito/shared-ai'
import { ConversationsGateway } from '../conversations/conversations.gateway'

@Module({
  imports: [SharedAnalyticsModule, KafkaModule, DatabaseModule, FilesModule, HttpModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsReportingService, AnalyticsService],
  exports: [SharedAnalyticsModule, AnalyticsReportingService, AnalyticsService]
})
export class AnalyticsModule implements OnModuleInit {
  constructor(
    private readonly events: EventPublisherService,
    private readonly processor: AnalyticsStreamProcessor,
    private readonly eventStore: EventStoreService,
    private readonly db: DatabaseService,
    @Optional() private readonly ai?: AIIntelligenceService,
    @Optional() private readonly convGateway?: ConversationsGateway,
  ) {}

  async onModuleInit() {
    await this.events.subscribeToEvents(['ticket-events'], async (event) => {
      try {
        if (!event.eventType.startsWith('ticket.')) return;

        // Map Kafka TicketEvent -> DomainEvent expected by AnalyticsStreamProcessor
        const domainEvent: any = {
          eventId: `${event.eventType}-${event.timestamp}`,
          eventType: event.eventType,
          aggregateId: (event.data?.ticketId as string) || 'unknown',
          aggregateType: 'ticket',
          eventData: event.data || {},
          metadata: { source: 'kafka-ticket-consumer', userId: event.userId },
          timestamp: new Date(event.timestamp),
          version: '1.0',
          tenantId: event.tenantId,
        } as any;

        const out = await this.processor.process(domainEvent);
        if (out && out.length) {
          await this.eventStore.saveEvents(out);
        }
      } catch (e) {
        console.error('analytics consumer error', e)
      }
    })
    // Autopilot worker subscription
    await this.events.subscribeToEvents(['conversation.autopilot.request'], async (evt: any) => {
      try {
        const tenantId = evt?.tenantId
        const data = evt?.data || {}
        const { conversationId, ticketId, content, previousMessages, mode, minConfidence } = data
        let suggestion: string | undefined
        let confidence = 0.75
        if (this.ai && typeof this.ai.analyzeContent === 'function') {
          const result = await this.ai.analyzeContent({
            content: (Array.isArray(previousMessages) ? previousMessages.join('\n') + '\n' : '') + (content || ''),
            analysisTypes: ['response_generation'] as any
          })
          const best = (result?.results as any)?.responseGeneration?.suggestedResponses?.[0]
          suggestion = best?.response
          confidence = best?.confidence ?? confidence
        } else {
          suggestion = content
        }
        // Refined: respect tenant channel templates if available
        let finalResponse = suggestion
        try {
          const tpl = await (this.db as any).knowledgeEntity.findFirst({
            where: { tenantId, type: 'response_template' },
            orderBy: { createdAt: 'desc' }
          })
          if (tpl?.metadata?.prefix) finalResponse = `${tpl.metadata.prefix} ${finalResponse || ''}`.trim()
          if (tpl?.metadata?.suffix) finalResponse = `${finalResponse || ''} ${tpl.metadata.suffix}`.trim()
        } catch { /* noop */ }

        if (mode === 'auto' && confidence >= (minConfidence ?? 0.7)) {
          await this.events.publishTicketEvent({ eventType: 'conversation.autopilot.sent', tenantId, timestamp: new Date().toISOString(), data: { conversationId, ticketId } } as any)
          this.convGateway?.broadcast?.('autopilot.sent', { conversationId, content: finalResponse, confidence }, undefined, conversationId)
        } else {
          await this.events.publishTicketEvent({ eventType: 'conversation.autopilot.drafted', tenantId, timestamp: new Date().toISOString(), data: { conversationId, ticketId } } as any)
          this.convGateway?.broadcast?.('autopilot.drafted', { conversationId, content: finalResponse, confidence }, undefined, conversationId)
        }
      } catch {
        // ignore
      }
    })
  }
}