/*
  Typed tool contracts for AI-assisted actions across commerce/CRM.
  These are framework-agnostic interfaces intended to be implemented
  by adapter providers in the application layer (e.g. api-gateway).
*/

// ---------- Domain Types ----------

export type CurrencyCode = string; // e.g., "USD"

export interface ProductSummary {
  sku: string;
  name: string;
  price: number;
  currency: CurrencyCode;
  thumbnailUrl?: string;
  availability?: 'in_stock' | 'out_of_stock' | 'preorder';
  rating?: number;
}

export interface Product extends ProductSummary {
  description?: string;
  images?: string[];
  attributes?: Record<string, string | number | boolean>;
  categories?: string[];
}

export interface OrderItem {
  sku: string;
  name?: string;
  quantity: number;
  unitPrice: number;
  currency: CurrencyCode;
}

export type OrderStatus =
  | 'created'
  | 'confirmed'
  | 'processing'
  | 'fulfilled'
  | 'cancel_requested'
  | 'canceled';

export interface OrderRecord {
  orderId: string;
  externalId?: string; // connector-native id
  customerId: string;
  items: OrderItem[];
  subtotal: number;
  total: number;
  currency: CurrencyCode;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  trackingNumber?: string;
  metadata?: Record<string, unknown>;
}

export interface CustomerProfileLite {
  id: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  tags?: string[];
}

// ---------- Tool Interfaces ----------

export interface OrderTool {
  createOrder(input: {
    tenantId: string;
    customerId: string;
    items: OrderItem[];
    shippingAddress?: Record<string, unknown>;
    billingAddress?: Record<string, unknown>;
    notes?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ orderId: string; status: OrderStatus; paymentUrl?: string }>

  confirmOrder(params: { tenantId: string; orderId: string }): Promise<{ orderId: string; status: OrderStatus }>

  cancelOrder(params: { tenantId: string; orderId: string; reason?: string }): Promise<{ orderId: string; status: OrderStatus }>

  updateOrderInfo(params: { tenantId: string; orderId: string; patch: Partial<OrderRecord> }): Promise<{ orderId: string; updated: boolean }>

  trackOrder(params: { tenantId: string; orderId?: string; trackingNumber?: string }): Promise<{
    status: 'label_created' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception' | 'unknown'
    steps: Array<{ time: string; location?: string; description?: string }>
  }>

  orderHistory(params: { tenantId: string; customerId: string; limit?: number }): Promise<OrderRecord[]>

  modifyOrderProducts(params: {
    tenantId: string;
    orderId: string;
    add?: OrderItem[];
    removeSkus?: string[];
    replace?: OrderItem[];
  }): Promise<{ orderId: string; status: OrderStatus; total: number }>
}

export interface ProductTool {
  searchProducts(params: { tenantId: string; query: string; limit?: number; filters?: Record<string, unknown> }): Promise<ProductSummary[]>
  getProductInfo(params: { tenantId: string; sku: string }): Promise<Product | null>
}

export interface CustomerTool {
  lookupByPhoneEmail(params: { tenantId: string; phone?: string; email?: string }): Promise<CustomerProfileLite | null>
  recentOrders(params: { tenantId: string; customerId: string; limit?: number }): Promise<OrderRecord[]>
}

// ---------- Tokens (optional helpers) ----------

export const ORDER_TOOL_TOKEN = 'AI_ORDER_TOOL';
export const PRODUCT_TOOL_TOKEN = 'AI_PRODUCT_TOOL';
export const CUSTOMER_TOOL_TOKEN = 'AI_CUSTOMER_TOOL';


