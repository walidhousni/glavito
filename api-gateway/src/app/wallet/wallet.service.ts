import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import { WhatsAppAdapter, InstagramAdapter, SMSAdapter, EmailAdapter } from '@glavito/shared-conversation';
import { calculateMessageCost, calculateRefund, CHANNEL_PRICING } from './pricing.config';

export interface ChannelBalance {
  channelType: string;
  balance: number;
  currency: string;
  lastSyncedAt: Date;
  syncStatus: string;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
}

export interface BalanceHistoryItem {
  date: string;
  balance: number;
  usage: number;
  transactions: number;
}

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly db: DatabaseService,
    private readonly whatsappAdapter: WhatsAppAdapter,
    private readonly instagramAdapter: InstagramAdapter,
    private readonly smsAdapter: SMSAdapter,
    private readonly emailAdapter: EmailAdapter,
  ) {}

  /**
   * Get all channel balances for a tenant with caching
   */
  async getWalletBalances(tenantId: string): Promise<ChannelBalance[]> {
    const channels = ['whatsapp', 'instagram', 'sms', 'email'];
    const balances: ChannelBalance[] = [];

    for (const channelType of channels) {
      try {
        const wallet = await this.db.channelWallet.findUnique({
          where: {
            tenantId_channelType: {
              tenantId,
              channelType,
            },
          },
        });

        // Check if cache is still valid
        const now = new Date();
        const lastSynced = wallet?.lastSyncedAt ? new Date(wallet.lastSyncedAt) : null;
        const cacheAge = lastSynced ? now.getTime() - lastSynced.getTime() : Infinity;

        if (wallet && cacheAge < this.CACHE_TTL_MS && wallet.syncStatus === 'success') {
          // Use cached balance
          balances.push({
            channelType,
            balance: Number(wallet.balance),
            currency: wallet.currency,
            lastSyncedAt: wallet.lastSyncedAt.toISOString() as any,
            syncStatus: wallet.syncStatus,
            errorMessage: wallet.errorMessage,
            metadata: wallet.metadata as Record<string, unknown> || {},
          });
        } else {
          // Sync balance from external API
          const synced = await this.syncBalance(tenantId, channelType);
          balances.push(synced);
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to get balance for ${channelType}`, errorMessage);
        // Return last known balance or default
        const wallet = await this.db.channelWallet.findUnique({
          where: {
            tenantId_channelType: {
              tenantId,
              channelType,
            },
          },
        });
        balances.push({
          channelType,
          balance: wallet ? Number(wallet.balance) : 0,
          currency: wallet?.currency || 'USD',
          lastSyncedAt: (wallet?.lastSyncedAt || new Date()).toISOString() as any,
          syncStatus: 'error',
          errorMessage: err instanceof Error ? err.message : String(err),
          metadata: wallet?.metadata as Record<string, unknown> || {},
        });
      }
    }

    return balances;
  }

  /**
   * Force sync balance from external API
   */
  async syncBalance(tenantId: string, channelType: string): Promise<ChannelBalance> {
    let balanceData: { balance: number; currency: string; metadata?: Record<string, unknown> };
    let errorMessage: string | null = null;

    try {
      // Fetch balance from appropriate adapter
      switch (channelType) {
        case 'whatsapp':
          balanceData = await this.whatsappAdapter.getBalance();
          break;
        case 'instagram':
          balanceData = await this.instagramAdapter.getBalance();
          break;
        case 'sms':
          balanceData = await this.smsAdapter.getBalance();
          break;
        case 'email':
          balanceData = await this.emailAdapter.getBalance();
          break;
        default:
          throw new Error(`Unsupported channel type: ${channelType}`);
      }

      // Upsert wallet record
      const wallet = await this.db.channelWallet.upsert({
        where: {
          tenantId_channelType: {
            tenantId,
            channelType,
          },
        },
        create: {
          tenantId,
          channelType,
          balance: balanceData.balance,
          currency: balanceData.currency,
          lastSyncedAt: new Date(),
          syncStatus: 'success',
          metadata: (balanceData.metadata || {}) as any,
        },
        update: {
          balance: balanceData.balance,
          currency: balanceData.currency,
          lastSyncedAt: new Date(),
          syncStatus: 'success',
          errorMessage: null,
          metadata: (balanceData.metadata || {}) as any,
        },
      });

      return {
        channelType,
        balance: Number(wallet.balance),
        currency: wallet.currency,
        lastSyncedAt: wallet.lastSyncedAt.toISOString() as any,
        syncStatus: wallet.syncStatus,
        errorMessage: wallet.errorMessage,
        metadata: wallet.metadata as Record<string, unknown> || {},
      };
    } catch (err: unknown) {
      errorMessage = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Failed to sync balance for ${channelType}`, errorMessage);

      // Update wallet with error status
      const wallet = await this.db.channelWallet.upsert({
        where: {
          tenantId_channelType: {
            tenantId,
            channelType,
          },
        },
        create: {
          tenantId,
          channelType,
          balance: 0,
          currency: 'USD',
          lastSyncedAt: new Date(),
          syncStatus: 'error',
          errorMessage,
          metadata: {},
        },
        update: {
          lastSyncedAt: new Date(),
          syncStatus: 'error',
          errorMessage,
        },
      });

      return {
        channelType,
        balance: Number(wallet.balance),
        currency: wallet.currency,
        lastSyncedAt: wallet.lastSyncedAt.toISOString() as any,
        syncStatus: wallet.syncStatus,
        errorMessage: wallet.errorMessage,
        metadata: wallet.metadata as Record<string, unknown> || {},
      };
    }
  }

  /**
   * Get balance history for a channel
   */
  async getBalanceHistory(
    tenantId: string,
    channelType: string,
    period: '7d' | '30d' | '90d' = '30d',
  ): Promise<BalanceHistoryItem[]> {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const wallet = await this.db.channelWallet.findUnique({
      where: {
        tenantId_channelType: {
          tenantId,
          channelType,
        },
      },
    });

    if (!wallet) {
      return [];
    }

    // Get transactions for the period
    const transactions = await this.db.channelWalletTransaction.findMany({
      where: {
        walletId: wallet.id,
        createdAt: {
          gte: startDate,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Group by date
    const dailyMap = new Map<string, { balance: number; usage: number; transactions: number }>();

    let runningBalance = Number(wallet.balance);
    for (const tx of transactions.reverse()) {
      const date = new Date(tx.createdAt).toISOString().split('T')[0];
      const amount = Number(tx.amount);

      if (tx.type === 'usage') {
        runningBalance += amount; // Usage is negative, so add to get previous balance
      } else if (tx.type === 'purchase' || tx.type === 'adjustment') {
        runningBalance -= amount; // Subtract to get previous balance
      }

      const existing = dailyMap.get(date) || { balance: runningBalance, usage: 0, transactions: 0 };
      if (tx.type === 'usage') {
        existing.usage += Math.abs(amount);
      }
      existing.transactions += 1;
      existing.balance = runningBalance;
      dailyMap.set(date, existing);
    }

    // Fill in missing dates with current balance
    const result: BalanceHistoryItem[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const dateStr = date.toISOString().split('T')[0];
      const dayData = dailyMap.get(dateStr) || {
        balance: Number(wallet.balance),
        usage: 0,
        transactions: 0,
      };
      result.push({
        date: dateStr,
        ...dayData,
      });
    }

    return result;
  }

  /**
   * Purchase/refill credits
   */
  async purchaseCredits(
    tenantId: string,
    channelType: string,
    amount: number,
    referenceId?: string,
  ): Promise<ChannelBalance> {
    this.logger.log(`Purchasing ${amount} credits for tenant ${tenantId} channel ${channelType}`);
    const wallet = await this.db.channelWallet.findUnique({
      where: {
        tenantId_channelType: {
          tenantId,
          channelType,
        },
      },
    });

    if (!wallet) {
      this.logger.warn(`Wallet not found for tenant ${tenantId} channel ${channelType}`);
      throw new NotFoundException(`Wallet not found for channel ${channelType}`);
    }

    // Record transaction
    await this.db.channelWalletTransaction.create({
      data: {
        walletId: wallet.id,
        tenantId,
        type: 'purchase',
        amount,
        currency: wallet.currency,
        description: `Credit purchase for ${channelType}`,
        referenceId,
        metadata: {},
      },
    });

    // Update balance
    const updated = await this.db.channelWallet.update({
      where: {
        id: wallet.id,
      },
      data: {
        balance: {
          increment: amount,
        },
      },
    });

    this.logger.log(`Successfully purchased credits. New balance: ${updated.balance}`);

    return {
      channelType,
      balance: Number(updated.balance),
      currency: updated.currency,
      lastSyncedAt: updated.lastSyncedAt,
      syncStatus: updated.syncStatus,
      errorMessage: updated.errorMessage,
      metadata: updated.metadata as Record<string, unknown> || {},
    };
  }

  /**
   * Record credit usage with message context
   */
  async recordUsage(
    tenantId: string,
    channelType: string,
    amount: number,
    description?: string,
    messageId?: string,
    messageType?: string,
  ): Promise<void> {
    const wallet = await this.db.channelWallet.findUnique({
      where: {
        tenantId_channelType: {
          tenantId,
          channelType,
        },
      },
    });

    if (!wallet) {
      // Create wallet if it doesn't exist
      await this.db.channelWallet.create({
        data: {
          tenantId,
          channelType,
          balance: 0,
          currency: 'USD',
          lastSyncedAt: new Date(),
          syncStatus: 'success',
          metadata: {},
        },
      });
      return;
    }

    // Record usage transaction (negative amount)
    await this.db.channelWalletTransaction.create({
      data: {
        walletId: wallet.id,
        tenantId,
        type: 'usage',
        amount: -Math.abs(amount),
        currency: wallet.currency,
        description: description || `Credit usage for ${channelType}`,
        metadata: {
          messageId,
          messageType,
          channelType,
        } as any,
      },
    });

    // Update balance
    await this.db.channelWallet.update({
      where: {
        id: wallet.id,
      },
      data: {
        balance: {
          decrement: Math.abs(amount),
        },
      },
    });
  }

  /**
   * Get transactions for a wallet
   */
  async getTransactions(
    tenantId: string,
    channelType?: string,
    limit = 50,
  ) {
    const wallet = channelType
      ? await this.db.channelWallet.findUnique({
          where: {
            tenantId_channelType: {
              tenantId,
              channelType,
            },
          },
        })
      : null;

    return this.db.channelWalletTransaction.findMany({
      where: {
        tenantId,
        ...(wallet ? { walletId: wallet.id } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      include: {
        wallet: {
          select: {
            channelType: true,
          },
        },
      },
    });
  }

  /**
   * Get usage breakdown by channel, message type, and delivery status
   */
  async getUsageBreakdown(
    tenantId: string,
    channelType?: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const whereClause: any = {
      tenantId,
      type: 'usage',
      ...(channelType ? {
        wallet: {
          channelType,
        },
      } : {}),
      ...(startDate || endDate ? {
        createdAt: {
          ...(startDate ? { gte: startDate } : {}),
          ...(endDate ? { lte: endDate } : {}),
        },
      } : {}),
    };

    // Get all usage transactions
    const transactions = await this.db.channelWalletTransaction.findMany({
      where: whereClause,
      include: {
        wallet: {
          select: {
            channelType: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Get messages from MessageAdvanced to correlate with delivery status
    const messageWhere: any = {
      senderType: 'agent', // Only outbound messages
      ...(channelType ? { channel: channelType } : {}),
      ...(startDate || endDate ? {
        createdAt: {
          ...(startDate ? { gte: startDate } : {}),
          ...(endDate ? { lte: endDate } : {}),
        },
      } : {}),
    };

    const messages = await this.db.messageAdvanced.findMany({
      where: messageWhere,
      select: {
        id: true,
        channel: true,
        messageType: true,
        metadata: true,
        createdAt: true,
      },
    });

    // Build breakdown by channel
    const breakdown: Record<string, {
      channelType: string;
      total: {
        outbound: number;
        delivered: number;
        failed: number;
        inbound: number;
      };
      byType: Record<string, {
        outbound: number;
        delivered: number;
        failed: number;
        cost: number;
        carrierFee: number;
        totalCost: number;
      }>;
      totals: {
        quantity: number;
        cost: number;
        carrierFee: number;
        totalCost: number;
      };
    }> = {};

    // Process transactions to get costs
    for (const tx of transactions) {
      const channel = tx.wallet.channelType;
      if (!breakdown[channel]) {
        breakdown[channel] = {
          channelType: channel,
          total: { outbound: 0, delivered: 0, failed: 0, inbound: 0 },
          byType: {},
          totals: { quantity: 0, cost: 0, carrierFee: 0, totalCost: 0 },
        };
      }

      const cost = Math.abs(Number(tx.amount));
      breakdown[channel].totals.quantity += 1;
      breakdown[channel].totals.cost += cost;
      breakdown[channel].totals.totalCost += cost;
    }

    // Process messages to get delivery status breakdown
    for (const msg of messages) {
      const channel = msg.channel.toLowerCase();
      if (!breakdown[channel]) {
        breakdown[channel] = {
          channelType: channel,
          total: { outbound: 0, delivered: 0, failed: 0, inbound: 0 },
          byType: {},
          totals: { quantity: 0, cost: 0, carrierFee: 0, totalCost: 0 },
        };
      }

      const messageType = msg.messageType || 'text';
      const metadata = (msg.metadata || {}) as any;
      const deliveryStatus = metadata.deliveryStatus || metadata.status || 'sent';
      const hasAttachments = false; // Could check MessageAttachment table if needed

      if (!breakdown[channel].byType[messageType]) {
        breakdown[channel].byType[messageType] = {
          outbound: 0,
          delivered: 0,
          failed: 0,
          cost: 0,
          carrierFee: 0,
          totalCost: 0,
        };
      }

      const cost = calculateMessageCost(channel, messageType, hasAttachments);
      const pricing = CHANNEL_PRICING[channel];
      const carrierFee = pricing?.carrierFee || 0;

      breakdown[channel].total.outbound += 1;
      breakdown[channel].byType[messageType].outbound += 1;
      breakdown[channel].byType[messageType].cost += cost;
      breakdown[channel].byType[messageType].carrierFee += carrierFee;
      breakdown[channel].byType[messageType].totalCost += cost + carrierFee;

      if (deliveryStatus === 'delivered' || deliveryStatus === 'read') {
        breakdown[channel].total.delivered += 1;
        breakdown[channel].byType[messageType].delivered += 1;
      } else if (deliveryStatus === 'failed' || deliveryStatus === 'undeliverable') {
        breakdown[channel].total.failed += 1;
        breakdown[channel].byType[messageType].failed += 1;
        // Apply refund for failed messages
        const refund = calculateRefund(channel, cost);
        breakdown[channel].byType[messageType].totalCost -= refund;
        breakdown[channel].totals.totalCost -= refund;
      }
    }

    // Get inbound messages count
    const inboundMessages = await this.db.messageAdvanced.findMany({
      where: {
        senderType: 'customer',
        ...(channelType ? { channel: channelType } : {}),
        ...(startDate || endDate ? {
          createdAt: {
            ...(startDate ? { gte: startDate } : {}),
            ...(endDate ? { lte: endDate } : {}),
          },
        } : {}),
      },
      select: {
        channel: true,
      },
    });

    for (const msg of inboundMessages) {
      const channel = msg.channel.toLowerCase();
      if (breakdown[channel]) {
        breakdown[channel].total.inbound += 1;
      }
    }

    return Object.values(breakdown);
  }

  /**
   * Get total credits used and top-up summary
   */
  async getCreditsSummary(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const whereClause: any = {
      tenantId,
      ...(startDate || endDate ? {
        createdAt: {
          ...(startDate ? { gte: startDate } : {}),
          ...(endDate ? { lte: endDate } : {}),
        },
      } : {}),
    };

    const [usageTransactions, purchaseTransactions] = await Promise.all([
      this.db.channelWalletTransaction.findMany({
        where: {
          ...whereClause,
          type: 'usage',
        },
        select: {
          amount: true,
        },
      }),
      this.db.channelWalletTransaction.findMany({
        where: {
          ...whereClause,
          type: 'purchase',
        },
        select: {
          amount: true,
        },
      }),
    ]);

    const totalCreditsUsed = Math.abs(
      usageTransactions.reduce((sum, tx) => {
        const amount = Number(tx.amount) || 0;
        return sum + amount;
      }, 0)
    );
    const totalCreditsTopUp = purchaseTransactions.reduce(
      (sum, tx) => {
        const amount = Number(tx.amount) || 0;
        return sum + amount;
      },
      0
    );

    return {
      totalCreditsUsed: isNaN(totalCreditsUsed) ? 0 : totalCreditsUsed,
      totalCreditsTopUp: isNaN(totalCreditsTopUp) ? 0 : totalCreditsTopUp,
      netBalance: isNaN(totalCreditsTopUp - totalCreditsUsed) ? 0 : totalCreditsTopUp - totalCreditsUsed,
    };
  }

  // =============================
  // AI Token Wallet Management
  // =============================

  /**
   * Get AI token balance for tenant
   */
  async getAITokenBalance(tenantId: string): Promise<{ balance: number; currency: string }> {
    const wallet = await (this.db as any).aITokenWallet.findUnique({
      where: { tenantId },
    });

    if (!wallet) {
      // Create wallet if it doesn't exist
      const newWallet = await (this.db as any).aITokenWallet.create({
        data: {
          tenantId,
          balance: 0,
          currency: 'USD',
          lastSyncedAt: new Date(),
          metadata: {},
        },
      });
      return {
        balance: Number(newWallet.balance),
        currency: newWallet.currency,
      };
    }

    return {
      balance: Number(wallet.balance),
      currency: wallet.currency,
    };
  }

  /**
   * Deduct AI tokens for usage
   */
  async deductAITokens(
    tenantId: string,
    amount: number,
    operationType: string,
    operationId: string,
    description?: string,
  ): Promise<{ success: boolean; balance: number; error?: string }> {
    try {
      const wallet = await (this.db as any).aITokenWallet.findUnique({
        where: { tenantId },
      });

      if (!wallet) {
        return {
          success: false,
          balance: 0,
          error: 'AI token wallet not found',
        };
      }

      const currentBalance = Number(wallet.balance);
      if (currentBalance < amount) {
        return {
          success: false,
          balance: currentBalance,
          error: 'Insufficient AI tokens',
        };
      }

      // Create usage transaction (negative amount)
      await (this.db as any).aITokenTransaction.create({
        data: {
          walletId: wallet.id,
          tenantId,
          type: 'usage',
          amount: -Math.abs(amount),
          currency: wallet.currency,
          description: description || `AI tokens used for ${operationType}`,
          operationType,
          operationId,
          metadata: {},
        },
      });

      // Update balance
      const updated = await (this.db as any).aITokenWallet.update({
        where: { id: wallet.id },
        data: {
          balance: {
            decrement: Math.abs(amount),
          },
          lastSyncedAt: new Date(),
        },
      });

      return {
        success: true,
        balance: Number(updated.balance),
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to deduct AI tokens: ${errorMessage}`);
      return {
        success: false,
        balance: 0,
        error: errorMessage,
      };
    }
  }

  /**
   * Get AI token transactions
   */
  async getAITokenTransactions(tenantId: string, limit = 50) {
    const wallet = await (this.db as any).aITokenWallet.findUnique({
      where: { tenantId },
    });

    if (!wallet) {
      return [];
    }

    return (this.db as any).aITokenTransaction.findMany({
      where: {
        tenantId,
        walletId: wallet.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Get AI token usage breakdown
   */
  async getAITokenUsageBreakdown(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const whereClause: any = {
      tenantId,
      type: 'usage',
      ...(startDate || endDate ? {
        createdAt: {
          ...(startDate ? { gte: startDate } : {}),
          ...(endDate ? { lte: endDate } : {}),
        },
      } : {}),
    };

    const transactions = await (this.db as any).aITokenTransaction.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Group by operation type
    const breakdown: Record<string, {
      operationType: string;
      count: number;
      totalTokens: number;
    }> = {};

    for (const tx of transactions) {
      const opType = tx.operationType || 'unknown';
      if (!breakdown[opType]) {
        breakdown[opType] = {
          operationType: opType,
          count: 0,
          totalTokens: 0,
        };
      }
      breakdown[opType].count += 1;
      breakdown[opType].totalTokens += Math.abs(Number(tx.amount));
    }

    return Object.values(breakdown);
  }

  /**
   * Add AI tokens (for purchases, refunds, bonuses)
   */
  async addAITokens(
    tenantId: string,
    amount: number,
    type: 'purchase' | 'refund' | 'bonus' | 'adjustment',
    description?: string,
    referenceId?: string,
  ): Promise<{ balance: number; transactionId: string }> {
    const wallet = await (this.db as any).aITokenWallet.findUnique({
      where: { tenantId },
    });

    if (!wallet) {
      // Create wallet if it doesn't exist
      const newWallet = await (this.db as any).aITokenWallet.create({
        data: {
          tenantId,
          balance: 0,
          currency: 'USD',
          lastSyncedAt: new Date(),
          metadata: {},
        },
      });
      const transaction = await (this.db as any).aITokenTransaction.create({
        data: {
          walletId: newWallet.id,
          tenantId,
          type,
          amount,
          currency: newWallet.currency,
          description: description || `AI tokens ${type}`,
          referenceId,
          metadata: {},
        },
      });
      const updated = await (this.db as any).aITokenWallet.update({
        where: { id: newWallet.id },
        data: {
          balance: { increment: amount },
          lastSyncedAt: new Date(),
        },
      });
      return {
        balance: Number(updated.balance),
        transactionId: transaction.id,
      };
    }

    // Create transaction
    const transaction = await (this.db as any).aITokenTransaction.create({
      data: {
        walletId: wallet.id,
        tenantId,
        type,
        amount,
        currency: wallet.currency,
        description: description || `AI tokens ${type}`,
        referenceId,
        metadata: {},
      },
    });

    // Update balance
    const updated = await (this.db as any).aITokenWallet.update({
      where: { id: wallet.id },
      data: {
        balance: {
          increment: amount,
        },
        lastSyncedAt: new Date(),
      },
    });

    return {
      balance: Number(updated.balance),
      transactionId: transaction.id,
    };
  }

  /**
   * Get AI token summary (used, purchased, balance)
   */
  async getAITokenSummary(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const whereClause: any = {
      tenantId,
      ...(startDate || endDate ? {
        createdAt: {
          ...(startDate ? { gte: startDate } : {}),
          ...(endDate ? { lte: endDate } : {}),
        },
      } : {}),
    };

    const [usageTransactions, purchaseTransactions, wallet] = await Promise.all([
      (this.db as any).aITokenTransaction.findMany({
        where: {
          ...whereClause,
          type: 'usage',
        },
        select: {
          amount: true,
        },
      }),
      (this.db as any).aITokenTransaction.findMany({
        where: {
          ...whereClause,
          type: { in: ['purchase', 'bonus', 'refund'] },
        },
        select: {
          amount: true,
        },
      }),
      (this.db as any).aITokenWallet.findUnique({
        where: { tenantId },
        select: { balance: true, currency: true },
      }),
    ]);

    const totalTokensUsed = Math.abs(
      usageTransactions.reduce((sum: number, tx: any) => {
        const amount = Number(tx.amount) || 0;
        return sum + amount;
      }, 0)
    );

    const totalTokensPurchased = purchaseTransactions.reduce(
      (sum: number, tx: any) => {
        const amount = Number(tx.amount) || 0;
        return sum + amount;
      },
      0
    );

    return {
      currentBalance: wallet ? Number(wallet.balance) : 0,
      currency: wallet?.currency || 'USD',
      totalTokensUsed: isNaN(totalTokensUsed) ? 0 : totalTokensUsed,
      totalTokensPurchased: isNaN(totalTokensPurchased) ? 0 : totalTokensPurchased,
      netBalance: isNaN(totalTokensPurchased - totalTokensUsed) ? 0 : totalTokensPurchased - totalTokensUsed,
    };
  }
}

