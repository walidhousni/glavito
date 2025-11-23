import { create } from 'zustand';
import { walletClient, type ChannelBalance, type BalanceHistoryItem, type WalletTransaction } from '@/lib/api/wallet-client';

interface WalletState {
  balances: ChannelBalance[];
  loading: boolean;
  error: string | null;
  lastRefresh: Date | null;
  refreshInterval: NodeJS.Timeout | null;
  loadBalances: () => Promise<void>;
  syncBalance: (channelType: string) => Promise<void>;
  purchaseCredits: (channelType: string, amount: number) => Promise<void>;
  initiateTopUp: (channelType: string, amount: number) => Promise<string>;
  getHistory: (channelType: string, period?: '7d' | '30d' | '90d') => Promise<BalanceHistoryItem[]>;
  getTransactions: (channelType?: string, limit?: number) => Promise<WalletTransaction[]>;
  startAutoRefresh: () => void;
  stopAutoRefresh: () => void;
}

export const useWalletStore = create<WalletState>((set, get) => {
  let refreshInterval: NodeJS.Timeout | null = null;

  const loadBalances = async () => {
    set({ loading: true, error: null });
    try {
      const balances = await walletClient.getBalances();
      // Ensure balances is always an array
      const balancesArray = Array.isArray(balances) ? balances : [];
      set({ balances: balancesArray, loading: false, lastRefresh: new Date() });
    } catch (e: any) {
      console.error('Failed to load wallet balances:', e);
      set({ 
        error: e?.response?.data?.message || e?.message || 'Failed to load balances', 
        loading: false,
        balances: [] // Ensure balances is always an array even on error
      });
    }
  };

  const syncBalance = async (channelType: string) => {
    set({ loading: true, error: null });
    try {
      const updated = await walletClient.syncBalance(channelType);
      const balances = get().balances.map((b) =>
        b.channelType === channelType ? updated : b
      );
      set({ balances, loading: false, lastRefresh: new Date() });
    } catch (e: any) {
      set({ error: e?.message || 'Failed to sync balance', loading: false });
    }
  };

  const purchaseCredits = async (channelType: string, amount: number) => {
    set({ loading: true, error: null });
    try {
      await walletClient.purchaseCredits(channelType, amount);
      await get().loadBalances();
      set({ loading: false, lastRefresh: new Date() });
    } catch (e: any) {
      console.error('Failed to purchase credits:', e);
      set({ error: e?.message || 'Failed to purchase credits', loading: false });
      throw e;
    }
  };

  const initiateTopUp = async (channelType: string, amount: number) => {
    set({ loading: true, error: null });
    try {
      const { url } = await walletClient.initiateTopUp(
        channelType,
        amount,
        `${window.location.origin}/settings/wallet?success=true`,
        `${window.location.origin}/settings/wallet?canceled=true`
      );
      set({ loading: false });
      return url;
    } catch (e: any) {
      console.error('Failed to initiate top-up:', e);
      set({ error: e?.message || 'Failed to initiate top-up', loading: false });
      throw e;
    }
  };

  const getHistory = async (channelType: string, period: '7d' | '30d' | '90d' = '30d') => {
    try {
      return await walletClient.getHistory(channelType, period);
    } catch (e: any) {
      set({ error: e?.message || 'Failed to load history' });
      return [];
    }
  };

  const getTransactions = async (channelType?: string, limit: number = 50) => {
    try {
      return await walletClient.getTransactions(channelType, limit);
    } catch (e: any) {
      set({ error: e?.message || 'Failed to load transactions' });
      return [];
    }
  };

  const startAutoRefresh = () => {
    const stopAutoRefresh = get().stopAutoRefresh;
    stopAutoRefresh(); // Clear any existing interval

    // Initial load
    loadBalances();

    // Set up 5-minute interval
    refreshInterval = setInterval(() => {
      loadBalances();
    }, 5 * 60 * 1000);

    set({ refreshInterval });
  };

  const stopAutoRefresh = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
      set({ refreshInterval: null });
    }
  };

  return {
    balances: [],
    loading: false,
    error: null,
    lastRefresh: null,
    refreshInterval: null,
    loadBalances,
    syncBalance,
    purchaseCredits,
    initiateTopUp,
    getHistory,
    getTransactions,
    startAutoRefresh,
    stopAutoRefresh,
  };
});

