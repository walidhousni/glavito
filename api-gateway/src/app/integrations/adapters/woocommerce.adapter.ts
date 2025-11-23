import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

export interface WooCommerceConfig {
  siteUrl: string; // https://example.com
  consumerKey: string;
  consumerSecret: string;
  version?: string;
}

@Injectable()
export class WooCommerceAdapter {
  private readonly logger = new Logger(WooCommerceAdapter.name);
  private client: AxiosInstance;

  constructor(config: WooCommerceConfig) {
    const version = config.version || 'wc/v3';
    this.client = axios.create({
      baseURL: `${config.siteUrl}/wp-json/${version}`,
      auth: {
        username: config.consumerKey,
        password: config.consumerSecret,
      },
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/system_status');
      return response.status === 200;
    } catch (error) {
      this.logger.error('WooCommerce connection test failed', error);
      return false;
    }
  }

  // Customers
  async getCustomers(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    role?: string;
  }) {
    const response = await this.client.get('/customers', { params });
    return response.data;
  }

  async getCustomer(customerId: number) {
    const response = await this.client.get(`/customers/${customerId}`);
    return response.data;
  }

  async createCustomer(customer: any) {
    const response = await this.client.post('/customers', customer);
    return response.data;
  }

  async updateCustomer(customerId: number, customer: any) {
    const response = await this.client.put(`/customers/${customerId}`, customer);
    return response.data;
  }

  // Orders
  async getOrders(params?: {
    page?: number;
    per_page?: number;
    status?: string;
    customer?: number;
    after?: string;
    before?: string;
  }) {
    const response = await this.client.get('/orders', { params });
    return response.data;
  }

  async getOrder(orderId: number) {
    const response = await this.client.get(`/orders/${orderId}`);
    return response.data;
  }

  async createOrder(order: any) {
    const response = await this.client.post('/orders', order);
    return response.data;
  }

  async updateOrder(orderId: number, order: any) {
    const response = await this.client.put(`/orders/${orderId}`, order);
    return response.data;
  }

  // Products
  async getProducts(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    status?: string;
    category?: number;
  }) {
    const response = await this.client.get('/products', { params });
    return response.data;
  }

  async getProduct(productId: number) {
    const response = await this.client.get(`/products/${productId}`);
    return response.data;
  }

  async createProduct(product: any) {
    const response = await this.client.post('/products', product);
    return response.data;
  }

  async updateProduct(productId: number, product: any) {
    const response = await this.client.put(`/products/${productId}`, product);
    return response.data;
  }

  // Webhooks
  async createWebhook(topic: string, deliveryUrl: string) {
    const response = await this.client.post('/webhooks', {
      name: `Glavito - ${topic}`,
      topic,
      delivery_url: deliveryUrl,
      secret: require('crypto').randomBytes(32).toString('hex'),
    });
    return response.data;
  }

  async getWebhooks() {
    const response = await this.client.get('/webhooks');
    return response.data;
  }

  async deleteWebhook(webhookId: number) {
    await this.client.delete(`/webhooks/${webhookId}`);
  }

  verifyWebhook(payload: string, signature: string, secret: string): boolean {
    const crypto = require('crypto');
    const hash = crypto.createHmac('sha256', secret).update(payload).digest('base64');
    return hash === signature;
  }
}

