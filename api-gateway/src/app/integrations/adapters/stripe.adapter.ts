import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';

export interface StripeConfig {
  apiKey: string;
  apiVersion?: string;
}

@Injectable()
export class StripeAdapter {
  private readonly logger = new Logger(StripeAdapter.name);
  private stripe: Stripe;

  constructor(config: StripeConfig) {
    this.stripe = new Stripe(config.apiKey, {
      apiVersion: '2024-11-20.acacia',
      typescript: true,
    });
  }

  /**
   * Test connection to Stripe
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.stripe.balance.retrieve();
      return true;
    } catch (error) {
      this.logger.error('Stripe connection test failed', error);
      return false;
    }
  }

  /**
   * Get account balance
   */
  async getBalance() {
    return this.stripe.balance.retrieve();
  }

  /**
   * List customers with pagination
   */
  async getCustomers(params?: {
    limit?: number;
    starting_after?: string;
    ending_before?: string;
    email?: string;
  }) {
    return this.stripe.customers.list(params);
  }

  /**
   * Get a single customer
   */
  async getCustomer(customerId: string) {
    return this.stripe.customers.retrieve(customerId);
  }

  /**
   * Create a new customer
   */
  async createCustomer(params: Stripe.CustomerCreateParams) {
    return this.stripe.customers.create(params);
  }

  /**
   * Update existing customer
   */
  async updateCustomer(customerId: string, params: Stripe.CustomerUpdateParams) {
    return this.stripe.customers.update(customerId, params);
  }

  /**
   * Delete a customer
   */
  async deleteCustomer(customerId: string) {
    return this.stripe.customers.del(customerId);
  }

  /**
   * Search customers
   */
  async searchCustomers(query: string) {
    return this.stripe.customers.search({ query });
  }

  /**
   * List payment intents
   */
  async getPaymentIntents(params?: {
    limit?: number;
    customer?: string;
    starting_after?: string;
  }) {
    return this.stripe.paymentIntents.list(params);
  }

  /**
   * Get a single payment intent
   */
  async getPaymentIntent(paymentIntentId: string) {
    return this.stripe.paymentIntents.retrieve(paymentIntentId);
  }

  /**
   * Create a payment intent
   */
  async createPaymentIntent(params: Stripe.PaymentIntentCreateParams) {
    return this.stripe.paymentIntents.create(params);
  }

  /**
   * Update payment intent
   */
  async updatePaymentIntent(
    paymentIntentId: string,
    params: Stripe.PaymentIntentUpdateParams
  ) {
    return this.stripe.paymentIntents.update(paymentIntentId, params);
  }

  /**
   * Cancel payment intent
   */
  async cancelPaymentIntent(paymentIntentId: string) {
    return this.stripe.paymentIntents.cancel(paymentIntentId);
  }

  /**
   * List charges
   */
  async getCharges(params?: {
    limit?: number;
    customer?: string;
    starting_after?: string;
  }) {
    return this.stripe.charges.list(params);
  }

  /**
   * Get a single charge
   */
  async getCharge(chargeId: string) {
    return this.stripe.charges.retrieve(chargeId);
  }

  /**
   * Create a refund
   */
  async createRefund(params: Stripe.RefundCreateParams) {
    return this.stripe.refunds.create(params);
  }

  /**
   * List subscriptions
   */
  async getSubscriptions(params?: {
    limit?: number;
    customer?: string;
    status?: Stripe.Subscription.Status;
    starting_after?: string;
  }) {
    return this.stripe.subscriptions.list(params);
  }

  /**
   * Get a single subscription
   */
  async getSubscription(subscriptionId: string) {
    return this.stripe.subscriptions.retrieve(subscriptionId);
  }

  /**
   * Create a subscription
   */
  async createSubscription(params: Stripe.SubscriptionCreateParams) {
    return this.stripe.subscriptions.create(params);
  }

  /**
   * Update subscription
   */
  async updateSubscription(
    subscriptionId: string,
    params: Stripe.SubscriptionUpdateParams
  ) {
    return this.stripe.subscriptions.update(subscriptionId, params);
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string) {
    return this.stripe.subscriptions.cancel(subscriptionId);
  }

  /**
   * List invoices
   */
  async getInvoices(params?: {
    limit?: number;
    customer?: string;
    subscription?: string;
    status?: Stripe.Invoice.Status;
    starting_after?: string;
  }) {
    return this.stripe.invoices.list(params);
  }

  /**
   * Get a single invoice
   */
  async getInvoice(invoiceId: string) {
    return this.stripe.invoices.retrieve(invoiceId);
  }

  /**
   * List products
   */
  async getProducts(params?: { limit?: number; active?: boolean }) {
    return this.stripe.products.list(params);
  }

  /**
   * Get a single product
   */
  async getProduct(productId: string) {
    return this.stripe.products.retrieve(productId);
  }

  /**
   * List prices
   */
  async getPrices(params?: {
    limit?: number;
    product?: string;
    active?: boolean;
  }) {
    return this.stripe.prices.list(params);
  }

  /**
   * Create a webhook endpoint
   */
  async createWebhookEndpoint(params: Stripe.WebhookEndpointCreateParams) {
    return this.stripe.webhookEndpoints.create(params);
  }

  /**
   * List webhook endpoints
   */
  async getWebhookEndpoints() {
    return this.stripe.webhookEndpoints.list();
  }

  /**
   * Delete webhook endpoint
   */
  async deleteWebhookEndpoint(webhookEndpointId: string) {
    return this.stripe.webhookEndpoints.del(webhookEndpointId);
  }

  /**
   * Construct webhook event (verify signature)
   */
  constructWebhookEvent(payload: string, signature: string, secret: string) {
    return this.stripe.webhooks.constructEvent(payload, signature, secret);
  }

  /**
   * Get payment method
   */
  async getPaymentMethod(paymentMethodId: string) {
    return this.stripe.paymentMethods.retrieve(paymentMethodId);
  }

  /**
   * List payment methods for customer
   */
  async getCustomerPaymentMethods(customerId: string, type?: string) {
    return this.stripe.customers.listPaymentMethods(customerId, { type: type as any });
  }

  /**
   * Attach payment method to customer
   */
  async attachPaymentMethod(paymentMethodId: string, customerId: string) {
    return this.stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
  }

  /**
   * Detach payment method
   */
  async detachPaymentMethod(paymentMethodId: string) {
    return this.stripe.paymentMethods.detach(paymentMethodId);
  }
}

