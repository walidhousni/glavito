import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
type CurrencyCode = string;
type OrderStatus = 'created' | 'confirmed' | 'processing' | 'fulfilled' | 'cancel_requested' | 'canceled';
type OrderItem = { sku: string; name?: string; quantity: number; unitPrice: number; currency: CurrencyCode };
type OrderRecord = { orderId: string; externalId?: string; customerId: string; items: OrderItem[]; subtotal: number; total: number; currency: CurrencyCode; status: OrderStatus; createdAt: string; updatedAt: string; trackingNumber?: string; metadata?: Record<string, unknown> };
type CustomerProfileLite = { id: string; email?: string; phone?: string; firstName?: string; lastName?: string; company?: string; tags?: string[] };
interface CustomerTool { lookupByPhoneEmail(params: { tenantId: string; phone?: string; email?: string }): Promise<CustomerProfileLite | null>; recentOrders(params: { tenantId: string; customerId: string; limit?: number }): Promise<OrderRecord[]> }

@Injectable()
export class CustomerToolAdapter implements CustomerTool {
  constructor(private readonly db: DatabaseService) {}

  async lookupByPhoneEmail(params: { tenantId: string; phone?: string; email?: string }): Promise<CustomerProfileLite | null> {
    const { tenantId, phone, email } = params;
    const where: any = { tenantId };
    if (email) where.email = email;
    if (phone) where.phone = phone;
    const c = await this.db.customer.findFirst({ where });
    if (!c) return null;
    return { id: c.id, email: c.email || undefined, phone: c.phone || undefined, firstName: (c as any).firstName || undefined, lastName: (c as any).lastName || undefined, company: c.company || undefined, tags: c.tags as string[] | undefined };
  }

  async recentOrders(params: { tenantId: string; customerId: string; limit?: number }): Promise<OrderRecord[]> {
    const limit = Math.min(Math.max(params.limit ?? 5, 1), 20);
    const deals = await (this.db as any)['deal']?.findMany?.({ where: { tenantId: params.tenantId, customerId: params.customerId }, take: limit, orderBy: { createdAt: 'desc' } }) || [];
    return deals.map((d: any) => ({
      orderId: String(d.id),
      externalId: undefined,
      customerId: d.customerId,
      items: ((d.metadata as any)?.items || []) as OrderItem[],
      subtotal: Number((d.metadata as any)?.subtotal ?? d.value ?? 0),
      total: Number((d.metadata as any)?.total ?? d.value ?? 0),
      currency: (d.metadata as any)?.currency || 'USD',
      status: (d.stage === 'won' ? 'fulfilled' : d.stage === 'lost' ? 'canceled' : 'processing') as any,
      createdAt: (d.createdAt as Date).toISOString(),
      updatedAt: (d.updatedAt as Date).toISOString(),
      trackingNumber: (d.metadata as any)?.trackingNumber,
      metadata: d.metadata as Record<string, unknown>,
    }));
  }
}


