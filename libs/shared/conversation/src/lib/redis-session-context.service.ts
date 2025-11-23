import { Injectable } from '@nestjs/common';
import { RedisService } from '@glavito/shared-redis';

interface SessionSnapshot {
  conversationId: string;
  tenantId: string;
  channel: string;
  lastInboundAt?: number;
  lastOutboundAt?: number;
  lastInboundMessageId?: string;
  lastOutboundMessageId?: string;
}

@Injectable()
export class RedisSessionContextService {
  private readonly ttlSeconds: number;

  constructor(private readonly redis: RedisService, ttlSeconds = 24 * 60 * 60) {
    this.ttlSeconds = Math.max(60, ttlSeconds);
  }

  private key(tenantId: string, conversationId: string): string {
    return `sessctx:${tenantId}:${conversationId}`;
  }

  async recordInbound(tenantId: string, conversationId: string, messageId: string, channel: string): Promise<void> {
    const k = this.key(tenantId, conversationId);
    const current = (await this.redis.cacheGet(k)) as SessionSnapshot | null;
    const value: SessionSnapshot = {
      conversationId,
      tenantId,
      channel,
      lastInboundAt: Date.now(),
      lastInboundMessageId: messageId,
      lastOutboundAt: current?.lastOutboundAt,
      lastOutboundMessageId: current?.lastOutboundMessageId,
    };
    await this.redis.cacheSet(k, value, this.ttlSeconds);
  }

  async recordOutbound(tenantId: string, conversationId: string, messageId: string, channel: string): Promise<void> {
    const k = this.key(tenantId, conversationId);
    const current = (await this.redis.cacheGet(k)) as SessionSnapshot | null;
    const value: SessionSnapshot = {
      conversationId,
      tenantId,
      channel,
      lastOutboundAt: Date.now(),
      lastOutboundMessageId: messageId,
      lastInboundAt: current?.lastInboundAt,
      lastInboundMessageId: current?.lastInboundMessageId,
    };
    await this.redis.cacheSet(k, value, this.ttlSeconds);
  }

  async get(tenantId: string, conversationId: string): Promise<SessionSnapshot | undefined> {
    const k = this.key(tenantId, conversationId);
    const data = (await this.redis.cacheGet(k)) as SessionSnapshot | null;
    return data || undefined;
  }
}


