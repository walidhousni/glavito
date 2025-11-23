import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { NodeExecutor, FlowExecutionContext } from '../flow-execution.service';
// Local tokens to avoid cross-lib import at compile time
const ORDER_TOOL_TOKEN = 'AI_ORDER_TOOL';
const PRODUCT_TOOL_TOKEN = 'AI_PRODUCT_TOOL';
const CUSTOMER_TOOL_TOKEN = 'AI_CUSTOMER_TOOL';

// Minimal local interfaces (mirror shared-ai contracts)
interface OrderItem {
  sku: string;
  quantity: number;
  unitPrice: number;
  currency: string;
}
type OrderStatus =
  | 'created'
  | 'confirmed'
  | 'processing'
  | 'fulfilled'
  | 'cancel_requested'
  | 'canceled';
interface OrderTool {
  createOrder(input: { tenantId: string; customerId: string; items: OrderItem[]; [k: string]: unknown }): Promise<{ orderId: string; status: OrderStatus; paymentUrl?: string }>
  trackOrder(params: { tenantId: string; orderId?: string; trackingNumber?: string }): Promise<{ status: string; steps: Array<{ time: string; location?: string; description?: string }> }>
}
interface ProductTool {
  searchProducts(params: { tenantId: string; query: string; limit?: number; filters?: Record<string, unknown> }): Promise<Array<{ sku: string; name: string; price: number; currency: string }>>
  getProductInfo(params: { tenantId: string; sku: string }): Promise<{ sku: string; name: string } | null>
}
interface CustomerTool {
  lookupByPhoneEmail(params: { tenantId: string; phone?: string; email?: string }): Promise<{ id: string } | null>
}

/**
 * AI Tool Call Executor
 * Invokes a domain tool (order/product/customer). Optional providers.
 */
@Injectable()
export class AIToolCallNodeExecutor implements NodeExecutor {
  private readonly logger = new Logger(AIToolCallNodeExecutor.name);
  constructor(
    @Optional() @Inject(ORDER_TOOL_TOKEN) private readonly orderTool?: OrderTool,
    @Optional() @Inject(PRODUCT_TOOL_TOKEN) private readonly productTool?: ProductTool,
    @Optional() @Inject(CUSTOMER_TOOL_TOKEN) private readonly customerTool?: CustomerTool,
  ) {}
  canHandle(kind: string): boolean {
    return kind === 'ai_tool_call';
  }
  async execute(node: any, context: FlowExecutionContext): Promise<any> {
    const cfg = node.config || {};
    const tool = String(cfg.tool || '').toLowerCase();
    const params = (cfg.params || {}) as Record<string, unknown>;
    // Enrich with tenantId by default
    if (!('tenantId' in params)) (params as any).tenantId = context.tenantId;
    try {
      switch (tool) {
        case 'order':
          if (!this.orderTool) throw new Error('order tool unavailable');
          if ('createOrder' in this.orderTool && Array.isArray((params as any).items)) {
            const res = await this.orderTool.createOrder(params as any);
            context.variables['lastOrder'] = res;
            return { outputPath: 'ok', result: res };
          }
          // Fallback: track order
          if ('trackOrder' in this.orderTool) {
            const res = await this.orderTool.trackOrder(params as any);
            context.variables['lastOrderTrack'] = res;
            return { outputPath: 'ok', result: res };
          }
          break;
        case 'product':
          if (!this.productTool) throw new Error('product tool unavailable');
          if ((params as any).sku && 'getProductInfo' in this.productTool) {
            const res = await this.productTool.getProductInfo(params as any);
            context.variables['lastProduct'] = res;
            return { outputPath: 'ok', result: res };
          }
          if ((params as any).query && 'searchProducts' in this.productTool) {
            const res = await this.productTool.searchProducts(params as any);
            context.variables['lastProducts'] = res;
            return { outputPath: 'ok', result: res };
          }
          break;
        case 'customer':
          if (!this.customerTool) throw new Error('customer tool unavailable');
          if ('lookupByPhoneEmail' in this.customerTool) {
            const res = await this.customerTool.lookupByPhoneEmail(params as any);
            context.variables['lastCustomer'] = res;
            return { outputPath: 'ok', result: res };
          }
          break;
        default:
          throw new Error(`Unsupported tool: ${tool}`);
      }
      return { outputPath: 'ok' };
    } catch (e: any) {
      this.logger.warn(`Tool call failed: ${e?.message || e}`);
      return { outputPath: 'error', error: e?.message || String(e) };
    }
  }
}


