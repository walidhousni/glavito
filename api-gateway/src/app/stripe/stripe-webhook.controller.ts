/**
 * Stripe Webhook Controller
 * Handles Stripe webhook events for payment processing and account updates
 */

import {
  Controller,
  Post,
  Body,
  Headers,
  HttpStatus,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StripeService } from './stripe.service';
import Stripe from 'stripe';

@ApiTags('stripe-webhooks')
@Controller('webhooks/stripe')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(private readonly stripeService: StripeService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Stripe webhook events' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook processed successfully',
  })
  async handleWebhook(
    @Body() body: any,
    @Headers('stripe-signature') signature: string
  ) {
    try {
      this.logger.log('Received Stripe webhook');
      
      if (!signature) {
        this.logger.error('Missing Stripe signature');
        return { error: 'Missing signature' };
      }

      await this.stripeService.handleWebhookEvent(body as Stripe.Event, signature);
      
      this.logger.log('Webhook processed successfully');
      return { received: true };
    } catch (error) {
      this.logger.error(`Webhook processing failed: ${error.message}`);
      return { error: error.message };
    }
  }
}