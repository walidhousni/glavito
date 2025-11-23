import { useEffect } from 'react';
import { useWalletStore } from '@/lib/store/wallet-store';
import type { ChannelBalance, BalanceHistoryItem, WalletTransaction } from '@/lib/api/wallet-client';

interface UseWalletReturn {
  balances: ChannelBalance[];
  loading: boolean;
  error: string | null;
  lastRefresh: Date | null;
  refreshInterval: unknown;
  loadBalances: () => Promise<void>;
  syncBalance: (channelType: string) => Promise<void>;
  purchaseCredits: (channelType: string, amount: number, referenceId?: string) => Promise<void>;
  initiateTopUp: (channelType: string, amount: number) => Promise<string>;
  getHistory: (channelType: string, period?: '7d' | '30d' | '90d') => Promise<BalanceHistoryItem[]>;
  getTransactions: (channelType?: string, limit?: number) => Promise<WalletTransaction[]>;
  startAutoRefresh: () => void;
  stopAutoRefresh: () => void;
}

export function useWallet(): UseWalletReturn {
  // Select only what we need to avoid effect loops
  const startAutoRefresh = useWalletStore((s) => s.startAutoRefresh);
  const stopAutoRefresh = useWalletStore((s) => s.stopAutoRefresh);
  const store = useWalletStore();

  useEffect(() => {
    // Start auto-refresh on mount (runs once)
    startAutoRefresh();
    // Cleanup on unmount
    return () => {
      stopAutoRefresh();
    };
  }, [startAutoRefresh, stopAutoRefresh]);

  return store as unknown as UseWalletReturn;
}

