import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentTenant } from '@glavito/shared-auth';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WalletService } from './wallet.service';
import { StripeService } from '../stripe/stripe.service';

@ApiTags('Wallet')
@Controller('wallet')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly stripeService: StripeService,
  ) {}

  @Get('balances')
  @ApiOperation({ summary: 'Get all channel balances' })
  async getBalances(@CurrentTenant() tenantId: string) {
    return this.walletService.getWalletBalances(tenantId);
  }

  @Post('sync/:channelType')
  @ApiOperation({ summary: 'Force sync balance for a channel' })
  async syncBalance(
    @CurrentTenant() tenantId: string,
    @Param('channelType') channelType: string,
  ) {
    return this.walletService.syncBalance(tenantId, channelType);
  }

  @Get('history/:channelType')
  @ApiOperation({ summary: 'Get balance history for a channel' })
  async getHistory(
    @CurrentTenant() tenantId: string,
    @Param('channelType') channelType: string,
    @Query('period') period: '7d' | '30d' | '90d' = '30d',
  ) {
    return this.walletService.getBalanceHistory(tenantId, channelType, period);
  }

  @Post('purchase')
  @ApiOperation({ summary: 'Purchase/refill credits' })
  async purchaseCredits(
    @CurrentTenant() tenantId: string,
    @Body() body: { channelType: string; amount: number; referenceId?: string },
  ) {
    return this.walletService.purchaseCredits(tenantId, body.channelType, body.amount, body.referenceId);
  }

  @Post('top-up')
  @ApiOperation({ summary: 'Initiate wallet top-up via Stripe' })
  async topUpWallet(
    @CurrentTenant() tenantId: string,
    @Body() body: { channelType: string; amount: number; successUrl?: string; cancelUrl?: string },
  ) {
    return this.stripeService.createCheckoutSessionForOrder(tenantId, {
      lineItems: [{
        amount: Math.round(body.amount * 100), // Convert to cents
        currency: 'usd',
        name: `Wallet Credit - ${body.channelType}`,
        quantity: 1,
      }],
      metadata: {
        type: 'wallet_topup',
        channelType: body.channelType,
        tenantId,
      },
      successUrl: body.successUrl,
      cancelUrl: body.cancelUrl,
    });
  }

  @Get('transactions')
  @ApiOperation({ summary: 'List wallet transactions' })
  async getTransactions(
    @CurrentTenant() tenantId: string,
    @Query('channelType') channelType?: string,
    @Query('limit') limit?: string,
  ) {
    return this.walletService.getTransactions(tenantId, channelType, limit ? parseInt(limit) : 50);
  }

  @Get('usage/breakdown')
  @ApiOperation({ summary: 'Get usage breakdown by channel and message type' })
  async getUsageBreakdown(
    @CurrentTenant() tenantId: string,
    @Query('channelType') channelType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.walletService.getUsageBreakdown(tenantId, channelType, start, end);
  }

  @Get('usage/summary')
  @ApiOperation({ summary: 'Get total credits used and top-up summary' })
  async getCreditsSummary(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.walletService.getCreditsSummary(tenantId, start, end);
  }

  // =============================
  // AI Token Endpoints
  // =============================

  @Get('ai-tokens/balance')
  @ApiOperation({ summary: 'Get AI token balance' })
  async getAITokenBalance(@CurrentTenant() tenantId: string) {
    return this.walletService.getAITokenBalance(tenantId);
  }

  @Get('ai-tokens/transactions')
  @ApiOperation({ summary: 'List AI token transactions' })
  async getAITokenTransactions(
    @CurrentTenant() tenantId: string,
    @Query('limit') limit?: string,
  ) {
    return this.walletService.getAITokenTransactions(tenantId, limit ? parseInt(limit) : 50);
  }

  @Get('ai-tokens/usage/breakdown')
  @ApiOperation({ summary: 'Get AI token usage breakdown by operation type' })
  async getAITokenUsageBreakdown(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.walletService.getAITokenUsageBreakdown(tenantId, start, end);
  }

  @Get('ai-tokens/usage/summary')
  @ApiOperation({ summary: 'Get AI token usage summary' })
  async getAITokenSummary(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.walletService.getAITokenSummary(tenantId, start, end);
  }
}

