'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FaSync, FaExclamationCircle, FaCheckCircle, FaClock, FaPlus } from 'react-icons/fa';
import { useWallet } from '@/lib/hooks/use-wallet';
import type { ChannelBalance } from '@/lib/api/wallet-client';
import { PurchaseCreditsDialog } from './purchase-credits-dialog';

interface WalletBalanceCardProps {
  balance: ChannelBalance;
}

const channelConfig = {
  whatsapp: {
    name: 'WhatsApp',
    icon: 'https://img.icons8.com/ios/50/whatsapp.png',
    color: '#25D366',
  },
  instagram: {
    name: 'Instagram',
    icon: 'https://img.icons8.com/ios/50/instagram-new.png',
    color: '#E4405F',
  },
  sms: {
    name: 'SMS',
    icon: 'https://img.icons8.com/ios/50/sms.png',
    color: '#4CAF50',
  },
  email: {
    name: 'Email',
    icon: 'https://img.icons8.com/ios/50/email-open.png',
    color: '#2196F3',
  },
};

export function WalletBalanceCard({ balance }: WalletBalanceCardProps) {
  const { syncBalance, initiateTopUp } = useWallet();
  const [syncing, setSyncing] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);

  const config = channelConfig[balance.channelType as keyof typeof channelConfig] || {
    name: balance.channelType,
    icon: '',
    color: '#666',
  };

  const isLow = balance.balance < 100;
  const isCritical = balance.balance < 10;

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncBalance(balance.channelType);
    } finally {
      setSyncing(false);
    }
  };

  const handlePurchase = async (amount: number) => {
    const url = await initiateTopUp(balance.channelType, amount);
    if (url) {
      window.location.href = url;
    }
    setPurchaseOpen(false);
  };

  const lastSynced = balance.lastSyncedAt
    ? (() => {
        const date = new Date(balance.lastSyncedAt);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      })()
    : 'Never';

  return (
    <>
      <Card className={`border-0 shadow-sm relative ${
        isCritical 
          ? 'border-l-4 border-l-red-500 dark:border-l-red-400' 
          : isLow 
          ? 'border-l-4 border-l-yellow-500 dark:border-l-yellow-400' 
          : ''
      }`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {config.icon && (
                <div className="p-2 rounded-lg" style={{ backgroundColor: `${config.color}15` }}>
                  <img src={config.icon} alt={config.name} className="w-4 h-4" style={{ filter: 'none' }} />
                </div>
              )}
              <div>
                <CardTitle className="text-base font-semibold">{config.name}</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  {balance.syncStatus === 'success' ? (
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <FaCheckCircle className="w-3 h-3" />
                      Synced {lastSynced}
                    </span>
                  ) : balance.syncStatus === 'error' ? (
                    <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                      <FaExclamationCircle className="w-3 h-3" />
                      Sync failed
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                      <FaClock className="w-3 h-3" />
                      Syncing...
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>
            <Badge
              variant={isCritical ? 'destructive' : isLow ? 'secondary' : 'default'}
              className={`text-xs ${
                balance.syncStatus === 'error'
                  ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800'
                  : isCritical 
                  ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800' 
                  : isLow 
                  ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800'
                  : 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800'
              }`}
            >
              {balance.syncStatus === 'error' ? 'Error' : isCritical ? 'Low' : isLow ? 'Warning' : 'Healthy'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-4">
            <div>
              <div className="text-2xl font-semibold" style={{ color: config.color }}>
                {balance.currency} {balance.balance.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Available credits</p>
            </div>

            {balance.errorMessage && (
              <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
                <p className="text-xs text-red-600 dark:text-red-400">{balance.errorMessage}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={syncing}
                className="flex-1 h-8 text-xs"
              >
                <FaSync className={`w-3 h-3 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync'}
              </Button>
              <Button
                size="sm"
                onClick={() => setPurchaseOpen(true)}
                className="flex-1 h-8 text-xs"
                style={{ backgroundColor: config.color }}
              >
                <FaPlus className="w-3 h-3 mr-1.5" />
                Purchase
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <PurchaseCreditsDialog
        open={purchaseOpen}
        onOpenChange={setPurchaseOpen}
        channelType={balance.channelType}
        channelName={config.name}
        onPurchase={handlePurchase}
      />
    </>
  );
}

