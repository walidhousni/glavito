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
import { StripeService, StripeAccountSetupRequest, PaymentIntentRequest, BillingConfigurationRequest } from './stripe.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('stripe')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

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

  @Post('payment-intent')
  @ApiOperation({ summary: 'Create payment intent' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Payment intent created successfully',
  })
  async createPaymentIntent(
    @Request() req: any,
    @Body() request: PaymentIntentRequest
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
    @Body() request: BillingConfigurationRequest
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
    @Body() body: { returnUrl: string }
  ) {
    const { tenantId } = req.user;
    return this.stripeService.createCustomerPortalSession(tenantId, customerId, body.returnUrl);
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
}