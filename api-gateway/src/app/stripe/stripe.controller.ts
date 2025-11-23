/**
 * Stripe Payment Controller
 * Handles Stripe-related API endpoints for payment processing and account management
 */

import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { StripeService } from './stripe.service';
import type { StripeAccountSetupRequest } from './stripe.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// DTO classes for request bodies (decorated params need class types for metadata)
export class SubscribeDto { priceId!: string; successUrl?: string; cancelUrl?: string }
export class PortalDto { returnUrl?: string }
export class PaymentIntentDto { amount!: number; currency!: string; customerId?: string; description?: string; receiptEmail?: string; metadata?: Record<string, string> }
export class BillingConfigurationDto { currency!: string; taxRate?: number; invoicePrefix?: string; paymentTerms?: number; autoCharge?: boolean; lateFeeRate?: number; reminderDays?: number[] }
export class CustomerPortalDto { returnUrl!: string }
export class CheckoutSessionDto {
  lineItems!: Array<{ amount: number; currency: string; quantity?: number; name?: string; description?: string }>;
  metadata?: Record<string, string>;
  successUrl?: string;
  cancelUrl?: string;
  customerId?: string;
}

@ApiTags('stripe')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stripe')
export class StripeController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
  ) {}

  @Post('account/create')
  @ApiOperation({ summary: 'Create Stripe Connect account' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Stripe account created successfully',
  })
  async createStripeAccount(
    @Request() req: any,
    @Body() request: StripeAccountSetupRequest
  ) {
    const { tenantId } = req.user;
    return this.stripeService.createStripeAccount(tenantId, request);
  }

  @Post('account/link')
  @ApiOperation({ summary: 'Create account onboarding link' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Account link created successfully',
  })
  async createAccountLink(@Request() req: any) {
    const { tenantId } = req.user;
    return this.stripeService.createAccountLink(tenantId);
  }

  @Get('account')
  @ApiOperation({ summary: 'Get Stripe account information' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Stripe account information retrieved successfully',
  })
  async getStripeAccount(@Request() req: any) {
    const { tenantId } = req.user;
    return this.stripeService.getStripeAccount(tenantId);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get payment configuration status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment status retrieved successfully',
  })
  async getPaymentStatus(@Request() req: any) {
    const { tenantId } = req.user;
    return this.stripeService.getPaymentStatus(tenantId);
  }

  // SaaS plans listing for frontend
  @Get('plans')
  @ApiOperation({ summary: 'List available subscription plans (Stripe prices)' })
  async listPlans() {
    return this.stripeService.listPlans();
  }

  // Start Stripe Checkout for subscription
  @Post('subscribe')
  @ApiOperation({ summary: 'Create Stripe Checkout session for subscription' })
  async subscribe(@Request() req: any, @Body() body: SubscribeDto) {
    const { tenantId } = req.user;
    const successUrl = body.successUrl || `${process.env.APP_URL}/billing?success=true`;
    const cancelUrl = body.cancelUrl || `${process.env.APP_URL}/billing?canceled=true`;
    return this.stripeService.createSubscriptionCheckoutSession(tenantId, { priceId: body.priceId, successUrl, cancelUrl });
  }

  // Subscription summary
  @Get('subscription')
  @ApiOperation({ summary: 'Get current subscription summary' })
  async subscription(@Request() req: any) {
    const { tenantId } = req.user;
    return this.stripeService.getSubscriptionSummary(tenantId);
  }

  // List invoices (billing history)
  @Get('invoices')
  @ApiOperation({ summary: 'List recent invoices for tenant' })
  async invoices(@Request() req: any) {
    const { tenantId } = req.user;
    return this.stripeService.listCustomerInvoices(tenantId);
  }

  // Customer portal link (manage payment method, invoices, cancel plan)
  @Post('portal')
  @ApiOperation({ summary: 'Create Stripe Billing Portal session' })
  async portal(@Request() req: any, @Body() body: PortalDto) {
    const { tenantId } = req.user;
    const returnUrl = body.returnUrl || `${process.env.APP_URL}/billing`;
    return this.stripeService.createBillingPortalForTenant(tenantId, returnUrl);
  }

  @Post('payment-intent')
  @ApiOperation({ summary: 'Create payment intent' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Payment intent created successfully',
  })
  async createPaymentIntent(
    @Request() req: any,
    @Body() request: PaymentIntentDto
  ) {
    const { tenantId } = req.user;
    return this.stripeService.createPaymentIntent(tenantId, request);
  }

  @Post('billing/configure')
  @ApiOperation({ summary: 'Setup billing configuration' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Billing configuration setup successfully',
  })
  async setupBillingConfiguration(
    @Request() req: any,
    @Body() request: BillingConfigurationDto
  ) {
    const { tenantId } = req.user;
    await this.stripeService.setupBillingConfiguration(tenantId, request);
    return { success: true, message: 'Billing configuration updated successfully' };
  }

  @Get('billing/configuration')
  @ApiOperation({ summary: 'Get billing configuration' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Billing configuration retrieved successfully',
  })
  async getBillingConfiguration(@Request() req: any) {
    const { tenantId } = req.user;
    return this.stripeService.getBillingConfiguration(tenantId);
  }

  @Post('customer/:customerId/portal')
  @ApiOperation({ summary: 'Create customer portal session' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Customer portal session created successfully',
  })
  async createCustomerPortalSession(
    @Request() req: any,
    @Param('customerId') customerId: string,
    @Body() body: CustomerPortalDto
  ) {
    const { tenantId } = req.user;
    return this.stripeService.createCustomerPortalSession(tenantId, customerId, body.returnUrl);
  }

  // List payment methods
  @Get('payment-methods')
  @ApiOperation({ summary: 'List payment methods for tenant' })
  async listPaymentMethods(@Request() req: any) {
    const { tenantId } = req.user;
    return this.stripeService.listPaymentMethods(tenantId);
  }

  // Attach payment method
  @Post('payment-methods/attach')
  @ApiOperation({ summary: 'Attach a payment method to tenant' })
  async attachPaymentMethod(@Request() req: any, @Body() body: { paymentMethodId: string }) {
    const { tenantId } = req.user;
    return this.stripeService.attachPaymentMethod(tenantId, body.paymentMethodId);
  }

  // Get usage summary
  @Get('usage')
  @ApiOperation({ summary: 'Get usage summary for tenant' })
  async getUsage(@Request() req: any) {
    const { tenantId } = req.user;
    return this.stripeService.getUsageSummary(tenantId, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date());
  }

  @Post('invoice/generate')
  @ApiOperation({ summary: 'Generate invoice for customer' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Invoice generated successfully',
  })
  async generateInvoice(
    @Request() req: any,
    @Body() body: {
      customerId: string;
      items: Array<{
        description: string;
        amount: number;
        quantity?: number;
      }>;
    }
  ) {
    const { tenantId } = req.user;
    return this.stripeService.generateInvoice(tenantId, body.customerId, body.items);
  }

  // Create one-time checkout session (conversational commerce)
  @Post('checkout-session')
  @ApiOperation({ summary: 'Create Stripe Checkout session (one-time payment)' })
  async createCheckoutSession(
    @Request() req: any,
    @Body() body: CheckoutSessionDto
  ) {
    const { tenantId } = req.user;
    return this.stripeService.createCheckoutSessionForOrder(tenantId, {
      lineItems: body.lineItems,
      metadata: body.metadata,
      successUrl: body.successUrl,
      cancelUrl: body.cancelUrl,
      customerId: body.customerId,
    });
  }

  @Post('ai-tokens/purchase')
  @ApiOperation({ summary: 'Create checkout session for AI token purchase' })
  async purchaseAITokens(
    @Request() req: any,
    @Body() body: { tokenAmount: number; successUrl?: string; cancelUrl?: string }
  ) {
    const { tenantId } = req.user;
    const successUrl = body.successUrl || `${this.configService.get('APP_URL')}/wallet?success=true`;
    const cancelUrl = body.cancelUrl || `${this.configService.get('APP_URL')}/wallet?cancelled=true`;
    return this.stripeService.createAITokenCheckoutSession(
      tenantId,
      body.tokenAmount,
      successUrl,
      cancelUrl,
    );
  }
}