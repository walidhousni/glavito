import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
type CurrencyCode = string;
type ProductSummary = { sku: string; name: string; price: number; currency: CurrencyCode; thumbnailUrl?: string; availability?: 'in_stock' | 'out_of_stock' | 'preorder'; rating?: number };
type Product = ProductSummary & { description?: string; images?: string[]; attributes?: Record<string, string | number | boolean>; categories?: string[] };
interface ProductTool { searchProducts(params: { tenantId: string; query: string; limit?: number; filters?: Record<string, unknown> }): Promise<ProductSummary[]>; getProductInfo(params: { tenantId: string; sku: string }): Promise<Product | null> }

@Injectable()
export class ProductToolAdapter implements ProductTool {
  private readonly logger = new Logger(ProductToolAdapter.name);
  constructor(private readonly db: DatabaseService) {}

  async searchProducts(params: { tenantId: string; query: string; limit?: number; filters?: Record<string, unknown> }): Promise<ProductSummary[]> {
    const { tenantId, query, limit = 10 } = params;
    try {
      const where: any = { tenantId };
      if (query && query.trim()) {
        where.OR = [
          { name: { contains: query, mode: 'insensitive' } },
          { sku: { contains: query, mode: 'insensitive' } },
        ];
      }
      const rows = await (this.db as any)['product'].findMany({ where, take: Math.min(Math.max(limit, 1), 50) });
      return (rows || []).map((r: any) => ({
        sku: r.sku || r.id,
        name: r.name || r.title || String(r.id),
        price: Number(r.price ?? r.unitPrice ?? 0),
        currency: String(r.currency || 'USD'),
        thumbnailUrl: (r.images && Array.isArray(r.images) ? r.images[0] : r.thumbnailUrl) || undefined,
        availability: (r.availability as any) || undefined,
        rating: typeof r.rating === 'number' ? r.rating : undefined,
      } satisfies ProductSummary));
    } catch (e) {
      this.logger.warn(`searchProducts failed: ${String((e as Error)?.message || e)}`);
      return [];
    }
  }

  async getProductInfo(params: { tenantId: string; sku: string }): Promise<Product | null> {
    const { tenantId, sku } = params;
    try {
      const r = await (this.db as any)['product'].findFirst({ where: { tenantId, OR: [{ sku }, { id: sku }] } });
      if (!r) return null;
      return {
        sku: r.sku || r.id,
        name: r.name || r.title || String(r.id),
        price: Number(r.price ?? r.unitPrice ?? 0),
        currency: String(r.currency || 'USD'),
        thumbnailUrl: (r.images && Array.isArray(r.images) ? r.images[0] : r.thumbnailUrl) || undefined,
        availability: (r.availability as any) || undefined,
        rating: typeof r.rating === 'number' ? r.rating : undefined,
        description: r.description || undefined,
        images: Array.isArray(r.images) ? r.images : undefined,
        attributes: (r.attributes as Record<string, unknown>) || undefined,
        categories: Array.isArray(r.categories) ? r.categories : undefined,
      } as Product;
    } catch (e) {
      this.logger.warn(`getProductInfo failed: ${String((e as Error)?.message || e)}`);
      return null;
    }
  }
}


