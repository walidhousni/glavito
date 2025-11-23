import { Injectable, Inject, Optional } from '@nestjs/common';
import { WorkflowService } from '@glavito/shared-workflow';
import { DatabaseService } from '@glavito/shared-database';
type CurrencyCode = string;
type OrderStatus = 'created' | 'confirmed' | 'processing' | 'fulfilled' | 'cancel_requested' | 'canceled';
type OrderItem = { sku: string; name?: string; quantity: number; unitPrice: number; currency: CurrencyCode };
type OrderRecord = { orderId: string; externalId?: string; customerId: string; items: OrderItem[]; subtotal: number; total: number; currency: CurrencyCode; status: OrderStatus; createdAt: string; updatedAt: string; trackingNumber?: string; metadata?: Record<string, unknown> };
interface OrderTool {
  createOrder(input: { tenantId: string; customerId: string; items: OrderItem[]; shippingAddress?: Record<string, unknown>; billingAddress?: Record<string, unknown>; notes?: string; metadata?: Record<string, unknown> }): Promise<{ orderId: string; status: OrderStatus; paymentUrl?: string }>;
  confirmOrder(params: { tenantId: string; orderId: string }): Promise<{ orderId: string; status: OrderStatus }>;
  cancelOrder(params: { tenantId: string; orderId: string; reason?: string }): Promise<{ orderId: string; status: OrderStatus }>;
  updateOrderInfo(params: { tenantId: string; orderId: string; patch: Partial<OrderRecord> }): Promise<{ orderId: string; updated: boolean }>;
  trackOrder(params: { tenantId: string; orderId?: string; trackingNumber?: string }): Promise<{ status: 'label_created' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception' | 'unknown'; steps: Array<{ time: string; location?: string; description?: string }> }>;
  orderHistory(params: { tenantId: string; customerId: string; limit?: number }): Promise<OrderRecord[]>;
  modifyOrderProducts(params: { tenantId: string; orderId: string; add?: OrderItem[]; removeSkus?: string[]; replace?: OrderItem[] }): Promise<{ orderId: string; status: OrderStatus; total: number }>
}

@Injectable()
export class OrderToolAdapter implements OrderTool {
  constructor(private readonly db: DatabaseService, @Optional() private readonly workflow?: WorkflowService, @Optional() @Inject('EVENT_PUBLISHER') private readonly eventPublisher?: { publishWorkflowEvent?: (e: any) => Promise<void> }) {}

  async createOrder(input: { tenantId: string; customerId: string; items: OrderItem[]; shippingAddress?: Record<string, unknown>; billingAddress?: Record<string, unknown>; notes?: string; metadata?: Record<string, unknown>; }): Promise<{ orderId: string; status: OrderStatus; paymentUrl?: string }> {
    const subtotal = input.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
    const total = subtotal; // taxes/shipping omitted for now
    const created = await (this.db as any)['deal']?.create?.({
      data: {
        tenantId: input.tenantId,
        customerId: input.customerId,
        value: total,
        currency: input.items[0]?.currency || 'USD',
        stage: 'PROPOSAL',
        metadata: { items: input.items, shippingAddress: input.shippingAddress, billingAddress: input.billingAddress, notes: input.notes, ...(input.metadata || {}) },
      }
    }).catch(async () => {
      // fallback to CustomObject if Deal not present
      const type = await (this.db as any).customObjectType.findFirst({ where: { tenantId: input.tenantId, name: 'Order' } });
      const values = { subtotal, total, currency: input.items[0]?.currency || 'USD', items: input.items } as any;
      const rec = await (this.db as any).customObjectRecord.create({ data: { tenantId: input.tenantId, typeId: type?.id, values, references: { customerId: input.customerId } } });
      return { id: rec.id };
    });
    const orderId = String((created as any).id)
    try {
      await this.workflow?.executeWorkflowByTrigger('event', { eventType: 'order.created', tenantId: input.tenantId, orderId, customerId: input.customerId, total, currency: input.items[0]?.currency || 'USD', items: input.items, timestamp: new Date().toISOString() })
    } catch {}
    try {
      await (this.eventPublisher as any)?.publishWorkflowEvent?.({ eventType: 'order.created', tenantId: input.tenantId, timestamp: new Date().toISOString(), data: { tenantId: input.tenantId, orderId, customerId: input.customerId, total, currency: input.items[0]?.currency || 'USD', items: input.items } })
    } catch {}
    return { orderId, status: 'created' };
  }

  async confirmOrder(params: { tenantId: string; orderId: string }): Promise<{ orderId: string; status: OrderStatus }> {
    try {
      await (this.db as any)['deal']?.update?.({ where: { id: params.orderId }, data: { stage: 'WON' } });
      try { await this.workflow?.executeWorkflowByTrigger('event', { eventType: 'order.updated', tenantId: params.tenantId, orderId: params.orderId, status: 'confirmed', timestamp: new Date().toISOString() }) } catch {}
      try { await (this.eventPublisher as any)?.publishWorkflowEvent?.({ eventType: 'order.updated', tenantId: params.tenantId, timestamp: new Date().toISOString(), data: { orderId: params.orderId, status: 'confirmed' } }) } catch {}
      return { orderId: params.orderId, status: 'confirmed' };
    } catch {
      return { orderId: params.orderId, status: 'confirmed' };
    }
  }

  async cancelOrder(params: { tenantId: string; orderId: string; reason?: string }): Promise<{ orderId: string; status: OrderStatus }> {
    try {
      await (this.db as any)['deal']?.update?.({ where: { id: params.orderId }, data: { stage: 'LOST', metadata: { cancelReason: params.reason } } });
      try { await this.workflow?.executeWorkflowByTrigger('event', { eventType: 'order.updated', tenantId: params.tenantId, orderId: params.orderId, status: 'canceled', reason: params.reason, timestamp: new Date().toISOString() }) } catch {}
      try { await (this.eventPublisher as any)?.publishWorkflowEvent?.({ eventType: 'order.updated', tenantId: params.tenantId, timestamp: new Date().toISOString(), data: { orderId: params.orderId, status: 'canceled', reason: params.reason } }) } catch {}
      return { orderId: params.orderId, status: 'canceled' };
    } catch {
      return { orderId: params.orderId, status: 'canceled' };
    }
  }

  async updateOrderInfo(params: { tenantId: string; orderId: string; patch: Partial<OrderRecord> }): Promise<{ orderId: string; updated: boolean }> {
    try {
      await (this.db as any)['deal']?.update?.({ where: { id: params.orderId }, data: { metadata: params.patch } });
      return { orderId: params.orderId, updated: true };
    } catch {
      return { orderId: params.orderId, updated: false };
    }
  }

  async trackOrder(params: { tenantId: string; orderId?: string; trackingNumber?: string }): Promise<{ status: 'label_created' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception' | 'unknown'; steps: { time: string; location?: string; description?: string; }[]; }> {
    return { status: 'unknown', steps: [] };
  }

  async orderHistory(params: { tenantId: string; customerId: string; limit?: number }): Promise<OrderRecord[]> {
    const limit = Math.min(Math.max(params.limit ?? 10, 1), 50);
    const deals = await (this.db as any)['deal']?.findMany?.({ where: { tenantId: params.tenantId, customerId: params.customerId }, take: limit, orderBy: { createdAt: 'desc' } }) || [];
    return deals.map((d: any) => ({
      orderId: String(d.id),
      externalId: undefined,
      customerId: d.customerId,
      items: ((d.metadata as any)?.items || []) as OrderItem[],
      subtotal: Number((d.metadata as any)?.subtotal ?? d.value ?? 0),
      total: Number((d.metadata as any)?.total ?? d.value ?? 0),
      currency: (d.metadata as any)?.currency || 'USD',
      status: ((String(d.stage || '').toUpperCase() === 'WON') ? 'fulfilled' : (String(d.stage || '').toUpperCase() === 'LOST') ? 'canceled' : 'processing') as OrderStatus,
      createdAt: (d.createdAt as Date).toISOString(),
      updatedAt: (d.updatedAt as Date).toISOString(),
      trackingNumber: (d.metadata as any)?.trackingNumber,
      metadata: d.metadata as Record<string, unknown>,
    } satisfies OrderRecord));
  }

  async modifyOrderProducts(params: { tenantId: string; orderId: string; add?: OrderItem[]; removeSkus?: string[]; replace?: OrderItem[]; }): Promise<{ orderId: string; status: OrderStatus; total: number; }> {
    try {
      const d = await (this.db as any)['deal']?.findUnique?.({ where: { id: params.orderId } });
      const current: OrderItem[] = Array.isArray((d?.metadata as any)?.items) ? (d.metadata as any).items : [];
      let items = current;
      if (params.replace) items = params.replace;
      if (params.add?.length) items = items.concat(params.add);
      if (params.removeSkus?.length) items = items.filter(x => !params.removeSkus?.includes(x.sku));
      const total = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
      await (this.db as any)['deal']?.update?.({ where: { id: params.orderId }, data: { value: total, metadata: { ...(d?.metadata || {}), items } } });
      return { orderId: params.orderId, status: 'processing', total };
    } catch {
      return { orderId: params.orderId, status: 'processing', total: 0 };
    }
  }
}


