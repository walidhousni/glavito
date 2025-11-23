import { api } from './config';

export interface ChannelBalance {
  channelType: string;
  balance: number;
  currency: string;
  lastSyncedAt: string;
  syncStatus: 'success' | 'error' | 'pending';
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
}

export interface BalanceHistoryItem {
  date: string;
  balance: number;
  usage: number;
  transactions: number;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  tenantId: string;
  type: 'purchase' | 'refund' | 'usage' | 'adjustment';
  amount: number;
  currency: string;
  description?: string | null;
  referenceId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  wallet?: {
    channelType: string;
  };
}

export const walletClient = {
  async getBalances(): Promise<ChannelBalance[]> {
    const response = await api.get<ChannelBalance[]>('/wallet/balances');
    return response.data;
  },

  async syncBalance(channelType: string): Promise<ChannelBalance> {
    const response = await api.post<ChannelBalance>(`/wallet/sync/${channelType}`);
    return response.data;
  },

  async getHistory(channelType: string, period: '7d' | '30d' | '90d' = '30d'): Promise<BalanceHistoryItem[]> {
    const response = await api.get<BalanceHistoryItem[]>(`/wallet/history/${channelType}`, {
      params: { period },
    });
    return response.data;
  },

  async purchaseCredits(channelType: string, amount: number, referenceId?: string): Promise<ChannelBalance> {
    const response = await api.post<ChannelBalance>('/wallet/purchase', {
      channelType,
      amount,
      referenceId,
    });
    return response.data;
  },

  async initiateTopUp(channelType: string, amount: number, successUrl?: string, cancelUrl?: string): Promise<{ url: string }> {
    const response = await api.post<{ url: string }>('/wallet/top-up', {
      channelType,
      amount,
      successUrl,
      cancelUrl,
    });
    return response.data;
  },

  async getTransactions(channelType?: string, limit = 50): Promise<WalletTransaction[]> {
    const response = await api.get<WalletTransaction[]>('/wallet/transactions', {
      params: {
        ...(channelType ? { channelType } : {}),
        limit,
      },
    });
    return response.data;
  },

  async getUsageBreakdown(channelType?: string, startDate?: string, endDate?: string) {
    const response = await api.get('/wallet/usage/breakdown', {
      params: {
        ...(channelType ? { channelType } : {}),
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
      },
    });
    return response.data;
  },

  async getCreditsSummary(startDate?: string, endDate?: string) {
    const response = await api.get('/wallet/usage/summary', {
      params: {
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
      },
    });
    return response.data;
  },

  // AI Token Methods
  async getAITokenBalance() {
    const response = await api.get<{ balance: number; currency: string }>('/wallet/ai-tokens/balance');
    return response.data;
  },

  async getAITokenTransactions(limit = 50) {
    const response = await api.get('/wallet/ai-tokens/transactions', {
      params: { limit },
    });
    return response.data;
  },

  async getAITokenUsageBreakdown(startDate?: string, endDate?: string) {
    const response = await api.get('/wallet/ai-tokens/usage/breakdown', {
      params: {
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
      },
    });
    return response.data;
  },

  async getAITokenSummary(startDate?: string, endDate?: string) {
    const response = await api.get('/wallet/ai-tokens/usage/summary', {
      params: {
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
      },
    });
    return response.data;
  },
};
