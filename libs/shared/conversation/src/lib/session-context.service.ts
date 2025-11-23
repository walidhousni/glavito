import { Injectable } from '@nestjs/common';

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
export class SessionContextService {
  private readonly store = new Map<string, SessionSnapshot>();

  private key(tenantId: string, conversationId: string): string {
    return `${tenantId}:${conversationId}`;
  }

  recordInbound(tenantId: string, conversationId: string, messageId: string, channel: string): void {
    const k = this.key(tenantId, conversationId);
    const prev = this.store.get(k);
    this.store.set(k, {
      conversationId,
      tenantId,
      channel,
      lastInboundAt: Date.now(),
      lastInboundMessageId: messageId,
      lastOutboundAt: prev?.lastOutboundAt,
      lastOutboundMessageId: prev?.lastOutboundMessageId,
    });
  }

  recordOutbound(tenantId: string, conversationId: string, messageId: string, channel: string): void {
    const k = this.key(tenantId, conversationId);
    const prev = this.store.get(k);
    this.store.set(k, {
      conversationId,
      tenantId,
      channel,
      lastOutboundAt: Date.now(),
      lastOutboundMessageId: messageId,
      lastInboundAt: prev?.lastInboundAt,
      lastInboundMessageId: prev?.lastInboundMessageId,
    });
  }

  get(tenantId: string, conversationId: string): SessionSnapshot | undefined {
    return this.store.get(this.key(tenantId, conversationId));
  }
}


