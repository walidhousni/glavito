import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import type {
  DomainEvent,
  EventStoreRecord,
  EventSnapshot
} from '@glavito/shared-types';

@Injectable()
export class EventStoreService {
  private readonly logger = new Logger(EventStoreService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async saveEvent(event: DomainEvent): Promise<void> {
    try {
      await (this.databaseService as any)['eventStore'].create({
        data: {
          eventId: event.eventId,
          eventType: event.eventType,
          eventVersion: event.version,
          aggregateId: event.aggregateId,
          aggregateType: event.aggregateType,
          aggregateVersion: await this.getNextAggregateVersion(event.aggregateId, event.aggregateType),
          eventData: event.eventData as unknown as any,
          metadata: event.metadata as unknown as any,
          causationId: event.causationId,
          correlationId: event.correlationId,
          timestamp: event.timestamp
        }
      });

      this.logger.debug(`Saved event ${event.eventType} for aggregate ${event.aggregateId}`);
    } catch (error) {
      this.logger.error(`Failed to save event ${event.eventId}:`, error);
      throw error;
    }
  }

  async saveEvents(events: DomainEvent[]): Promise<void> {
    if (events.length === 0) return;

    try {
      // Group events by aggregate to ensure proper versioning
      const eventsByAggregate = new Map<string, DomainEvent[]>();
      
      for (const event of events) {
        const key = `${event.aggregateType}-${event.aggregateId}`;
        if (!eventsByAggregate.has(key)) {
          eventsByAggregate.set(key, []);
        }
        eventsByAggregate.get(key)!.push(event);
      }

      // Save events in transaction to ensure consistency
      await this.databaseService['$transaction'](async (tx: any) => {
        for (const [aggregateKey, aggregateEvents] of Array.from(eventsByAggregate.entries())) {
          const [aggregateType, aggregateId] = aggregateKey.split('-', 2);
          let currentVersion = await this.getCurrentAggregateVersion(aggregateId, aggregateType, tx);

          for (const event of aggregateEvents) {
            currentVersion++;
            await (tx as any)['eventStore'].create({
              data: {
                eventId: event.eventId,
                eventType: event.eventType,
                eventVersion: event.version,
                aggregateId: event.aggregateId,
                aggregateType: event.aggregateType,
                aggregateVersion: currentVersion,
            eventData: event.eventData as unknown as any,
            metadata: event.metadata as unknown as any,
                causationId: event.causationId,
                correlationId: event.correlationId,
                timestamp: event.timestamp
              }
            });
          }
        }
      });

      this.logger.debug(`Saved batch of ${events.length} events`);
    } catch (error) {
      this.logger.error('Failed to save event batch:', error);
      throw error;
    }
  }

  async getEvents(
    aggregateId: string,
    aggregateType: string,
    fromVersion?: number
  ): Promise<EventStoreRecord[]> {
    try {
      const events = await (this.databaseService as any)['eventStore'].findMany({
        where: {
          aggregateId,
          aggregateType,
          ...(fromVersion && { aggregateVersion: { gte: fromVersion } })
        },
        orderBy: {
          aggregateVersion: 'asc'
        }
      });

      return events.map(this.mapToEventStoreRecord);
    } catch (error) {
      this.logger.error(`Failed to get events for ${aggregateType}:${aggregateId}:`, error);
      throw error;
    }
  }

  async getEventsByType(
    eventType: string,
    tenantId?: string,
    limit?: number,
    offset?: number
  ): Promise<EventStoreRecord[]> {
    try {
      const events = await (this.databaseService as any)['eventStore'].findMany({
        where: {
          eventType,
          ...(tenantId && { 
            metadata: {
              path: ['tenantId'],
              equals: tenantId
            }
          })
        },
        orderBy: {
          timestamp: 'desc'
        },
        take: limit,
        skip: offset
      });

      return events.map(this.mapToEventStoreRecord);
    } catch (error) {
      this.logger.error(`Failed to get events by type ${eventType}:`, error);
      throw error;
    }
  }

  async getEventsByCorrelationId(correlationId: string): Promise<EventStoreRecord[]> {
    try {
      const events = await (this.databaseService as any)['eventStore'].findMany({
        where: {
          correlationId
        },
        orderBy: {
          timestamp: 'asc'
        }
      });

      return events.map(this.mapToEventStoreRecord);
    } catch (error) {
      this.logger.error(`Failed to get events by correlation ID ${correlationId}:`, error);
      throw error;
    }
  }

  async getEventsAfterTimestamp(
    timestamp: Date,
    tenantId?: string,
    limit?: number
  ): Promise<EventStoreRecord[]> {
    try {
      const events = await (this.databaseService as any)['eventStore'].findMany({
        where: {
          timestamp: {
            gt: timestamp
          },
          ...(tenantId && {
            metadata: {
              path: ['tenantId'],
              equals: tenantId
            }
          })
        },
        orderBy: {
          timestamp: 'asc'
        },
        take: limit
      });

      return events.map(this.mapToEventStoreRecord);
    } catch (error) {
      this.logger.error(`Failed to get events after timestamp ${timestamp}:`, error);
      throw error;
    }
  }

  async saveSnapshot(snapshot: EventSnapshot): Promise<void> {
    try {
      // For now, we'll store snapshots as special events
      // In a production system, you might want a separate snapshots table
      await (this.databaseService as any)['eventStore'].create({
        data: {
          eventId: `snapshot-${snapshot.aggregateId}-${snapshot.version}`,
          eventType: 'aggregate.snapshot',
          eventVersion: '1.0',
          aggregateId: snapshot.aggregateId,
          aggregateType: snapshot.aggregateType,
          aggregateVersion: snapshot.version,
          eventData: snapshot.data as unknown as any,
          metadata: {
            isSnapshot: true,
            snapshotVersion: snapshot.version
          } as unknown as any,
          timestamp: snapshot.timestamp
        }
      });

      this.logger.debug(`Saved snapshot for ${snapshot.aggregateType}:${snapshot.aggregateId} at version ${snapshot.version}`);
    } catch (error) {
      this.logger.error(`Failed to save snapshot for ${snapshot.aggregateId}:`, error);
      throw error;
    }
  }

  async getLatestSnapshot(
    aggregateId: string,
    aggregateType: string
  ): Promise<EventSnapshot | null> {
    try {
      const snapshot = await (this.databaseService as any)['eventStore'].findFirst({
        where: {
          aggregateId,
          aggregateType,
          eventType: 'aggregate.snapshot'
        },
        orderBy: {
          aggregateVersion: 'desc'
        }
      });

      if (!snapshot) return null;

      return {
        aggregateId: snapshot.aggregateId,
        aggregateType: snapshot.aggregateType,
        version: snapshot.aggregateVersion,
        data: snapshot.eventData,
        timestamp: snapshot.timestamp
      };
    } catch (error) {
      this.logger.error(`Failed to get snapshot for ${aggregateType}:${aggregateId}:`, error);
      throw error;
    }
  }

  async replayEvents(
    aggregateId: string,
    aggregateType: string,
    fromVersion?: number
  ): Promise<DomainEvent[]> {
    try {
      const events = await this.getEvents(aggregateId, aggregateType, fromVersion);
      
      return events
        .filter(event => event.eventType !== 'aggregate.snapshot')
        .map(this.mapToDomainEvent);
    } catch (error) {
      this.logger.error(`Failed to replay events for ${aggregateType}:${aggregateId}:`, error);
      throw error;
    }
  }

  async getAggregateVersion(aggregateId: string, aggregateType: string): Promise<number> {
    try {
      const result = await (this.databaseService as any)['eventStore'].findFirst({
        where: {
          aggregateId,
          aggregateType
        },
        orderBy: {
          aggregateVersion: 'desc'
        },
        select: {
          aggregateVersion: true
        }
      });

      return result?.aggregateVersion || 0;
    } catch (error) {
      this.logger.error(`Failed to get aggregate version for ${aggregateType}:${aggregateId}:`, error);
      throw error;
    }
  }

  async getEventStatistics(tenantId?: string): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByAggregate: Record<string, number>;
    oldestEvent: Date | null;
    newestEvent: Date | null;
  }> {
    try {
      const whereClause = tenantId ? {
        metadata: {
          path: ['tenantId'],
          equals: tenantId
        }
      } : {};

      const [totalEvents, eventsByType, eventsByAggregate, oldestEvent, newestEvent] = await Promise.all([
        (this.databaseService as any)['eventStore'].count({ where: whereClause }),
        (this.databaseService as any)['eventStore'].groupBy({
          by: ['eventType'],
          where: whereClause,
          _count: true
        }),
        (this.databaseService as any)['eventStore'].groupBy({
          by: ['aggregateType'],
          where: whereClause,
          _count: true
        }),
        (this.databaseService as any)['eventStore'].findFirst({
          where: whereClause,
          orderBy: { timestamp: 'asc' },
          select: { timestamp: true }
        }),
        (this.databaseService as any)['eventStore'].findFirst({
          where: whereClause,
          orderBy: { timestamp: 'desc' },
          select: { timestamp: true }
        })
      ]);

      return {
        totalEvents,
        eventsByType: Object.fromEntries(
          eventsByType.map((item: any) => [item.eventType, item._count])
        ),
        eventsByAggregate: Object.fromEntries(
          eventsByAggregate.map((item: any) => [item.aggregateType, item._count])
        ),
        oldestEvent: oldestEvent?.timestamp || null,
        newestEvent: newestEvent?.timestamp || null
      };
    } catch (error) {
      this.logger.error('Failed to get event statistics:', error);
      throw error;
    }
  }

  private async getNextAggregateVersion(
    aggregateId: string,
    aggregateType: string,
    tx?: any
  ): Promise<number> {
    const currentVersion = await this.getCurrentAggregateVersion(aggregateId, aggregateType, tx);
    return currentVersion + 1;
  }

  private async getCurrentAggregateVersion(
    aggregateId: string,
    aggregateType: string,
    tx?: any
  ): Promise<number> {
    const prisma = tx || this.databaseService;
    
    const result = await (prisma as any)['eventStore'].findFirst({
      where: {
        aggregateId,
        aggregateType
      },
      orderBy: {
        aggregateVersion: 'desc'
      },
      select: {
        aggregateVersion: true
      }
    });

    return result?.aggregateVersion || 0;
  }

  private mapToEventStoreRecord(event: any): EventStoreRecord {
    return {
      eventId: event.eventId,
      eventType: event.eventType,
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      aggregateVersion: event.aggregateVersion,
      eventData: event.eventData,
      metadata: event.metadata,
      timestamp: event.timestamp,
      causationId: event.causationId,
      correlationId: event.correlationId
    };
  }

  private mapToDomainEvent(record: EventStoreRecord): DomainEvent {
    return {
      eventId: record.eventId,
      eventType: record.eventType,
      aggregateId: record.aggregateId,
      aggregateType: record.aggregateType,
      eventData: record.eventData,
      metadata: record.metadata,
      timestamp: record.timestamp,
      version: '1.0', // Could be stored in metadata
      tenantId: (record.metadata as any).tenantId || '',
      causationId: record.causationId,
      correlationId: record.correlationId
    };
  }
}