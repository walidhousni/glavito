import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

export interface ShopifyConfig {
  shop: string; // myshop.myshopify.com
  accessToken: string;
  apiVersion?: string;
}

export interface ShopifyCustomer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  created_at: string;
  updated_at: string;
  orders_count: number;
  total_spent: string;
  tags?: string;
  note?: string;
}

export interface ShopifyOrder {
  id: number;
  email: string;
  created_at: string;
  updated_at: string;
  number: number;
  note?: string;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  currency: string;
  financial_status: string;
  fulfillment_status?: string;
  customer: ShopifyCustomer;
  line_items: any[];
  shipping_address?: any;
  billing_address?: any;
}

export interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  created_at: string;
  handle: string;
  updated_at: string;
  published_at: string;
  status: string;
  variants: any[];
  options: any[];
  images: any[];
}

@Injectable()
export class ShopifyAdapter {
  private readonly logger = new Logger(ShopifyAdapter.name);
  private client: AxiosInstance;

  constructor(private config: ShopifyConfig) {
    const apiVersion = config.apiVersion || '2024-01';
    this.client = axios.create({
      baseURL: `https://${config.shop}/admin/api/${apiVersion}`,
      headers: {
        'X-Shopify-Access-Token': config.accessToken,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Test connection to Shopify
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/shop.json');
      return response.status === 200;
    } catch (error) {
      this.logger.error('Shopify connection test failed', error);
      return false;
    }
  }

  /**
   * Get shop information
   */
  async getShop() {
    const response = await this.client.get('/shop.json');
    return response.data.shop;
  }

  /**
   * Fetch customers with pagination
   */
  async getCustomers(params?: {
    limit?: number;
    since_id?: number;
    created_at_min?: string;
    updated_at_min?: string;
  }): Promise<ShopifyCustomer[]> {
    const response = await this.client.get('/customers.json', { params });
    return response.data.customers;
  }

  /**
   * Get a single customer by ID
   */
  async getCustomer(customerId: number): Promise<ShopifyCustomer> {
    const response = await this.client.get(`/customers/${customerId}.json`);
    return response.data.customer;
  }

  /**
   * Search customers by email or phone
   */
  async searchCustomers(query: string): Promise<ShopifyCustomer[]> {
    const response = await this.client.get('/customers/search.json', {
      params: { query },
    });
    return response.data.customers;
  }

  /**
   * Create a new customer
   */
  async createCustomer(customer: Partial<ShopifyCustomer>): Promise<ShopifyCustomer> {
    const response = await this.client.post('/customers.json', { customer });
    return response.data.customer;
  }

  /**
   * Update existing customer
   */
  async updateCustomer(
    customerId: number,
    customer: Partial<ShopifyCustomer>
  ): Promise<ShopifyCustomer> {
    const response = await this.client.put(`/customers/${customerId}.json`, {
      customer,
    });
    return response.data.customer;
  }

  /**
   * Fetch orders with pagination
   */
  async getOrders(params?: {
    limit?: number;
    since_id?: number;
    created_at_min?: string;
    updated_at_min?: string;
    status?: 'open' | 'closed' | 'cancelled' | 'any';
  }): Promise<ShopifyOrder[]> {
    const response = await this.client.get('/orders.json', { params });
    return response.data.orders;
  }

  /**
   * Get a single order by ID
   */
  async getOrder(orderId: number): Promise<ShopifyOrder> {
    const response = await this.client.get(`/orders/${orderId}.json`);
    return response.data.order;
  }

  /**
   * Get orders for a specific customer
   */
  async getCustomerOrders(customerId: number): Promise<ShopifyOrder[]> {
    const response = await this.client.get(`/customers/${customerId}/orders.json`);
    return response.data.orders;
  }

  /**
   * Fetch products with pagination
   */
  async getProducts(params?: {
    limit?: number;
    since_id?: number;
    created_at_min?: string;
    updated_at_min?: string;
    status?: 'active' | 'archived' | 'draft';
  }): Promise<ShopifyProduct[]> {
    const response = await this.client.get('/products.json', { params });
    return response.data.products;
  }

  /**
   * Get a single product by ID
   */
  async getProduct(productId: number): Promise<ShopifyProduct> {
    const response = await this.client.get(`/products/${productId}.json`);
    return response.data.product;
  }

  /**
   * Create a webhook subscription
   */
  async createWebhook(topic: string, address: string) {
    const response = await this.client.post('/webhooks.json', {
      webhook: {
        topic,
        address,
        format: 'json',
      },
    });
    return response.data.webhook;
  }

  /**
   * List all webhooks
   */
  async getWebhooks() {
    const response = await this.client.get('/webhooks.json');
    return response.data.webhooks;
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId: number) {
    await this.client.delete(`/webhooks/${webhookId}.json`);
  }

  /**
   * Verify webhook signature
   */
  verifyWebhook(data: string, hmacHeader: string, secret: string): boolean {
    const crypto = require('crypto');
    const hash = crypto.createHmac('sha256', secret).update(data, 'utf8').digest('base64');
    return hash === hmacHeader;
  }

  /**
   * Get customer count
   */
  async getCustomerCount(): Promise<number> {
    const response = await this.client.get('/customers/count.json');
    return response.data.count;
  }

  /**
   * Get order count
   */
  async getOrderCount(params?: { status?: string }): Promise<number> {
    const response = await this.client.get('/orders/count.json', { params });
    return response.data.count;
  }

  /**
   * Get product count
   */
  async getProductCount(params?: { status?: string }): Promise<number> {
    const response = await this.client.get('/products/count.json', { params });
    return response.data.count;
  }
}

