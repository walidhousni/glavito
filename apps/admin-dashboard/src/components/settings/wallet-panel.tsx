'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { FaWallet, FaExclamationCircle } from 'react-icons/fa';
import { MdRefresh } from 'react-icons/md';
import { useWallet } from '@/lib/hooks/use-wallet';
import { WalletBalanceCard } from './wallet/wallet-balance-card';
import { AITokenBalanceCard } from './wallet/ai-token-balance-card';
import { WalletHistory } from './wallet/wallet-history';
import { UsageBreakdown } from './wallet/usage-breakdown';
import { AITokenHistory } from './wallet/ai-token-history';

const channelConfig = {
  whatsapp: { name: 'WhatsApp', order: 1 },
  instagram: { name: 'Instagram', order: 2 },
  sms: { name: 'SMS', order: 3 },
  email: { name: 'Email', order: 4 },
};

export function WalletPanel() {
  const { balances, loading, error, lastRefresh, loadBalances } = useWallet();
  const [activeChannel, setActiveChannel] = useState<string>('whatsapp');

  useEffect(() => {
    loadBalances();
  }, [loadBalances]);

  // Ensure balances is always iterable
  const balancesArray = Array.isArray(balances) ? balances : [];

  const sortedBalances = [...balancesArray].sort((a, b) => {
    const orderA = channelConfig[a.channelType as keyof typeof channelConfig]?.order || 999;
    const orderB = channelConfig[b.channelType as keyof typeof channelConfig]?.order || 999;
    return orderA - orderB;
  });

  // Derived channel info if needed later

  const lastRefreshText = lastRefresh
    ? (() => {
        const diffMs = new Date().getTime() - lastRefresh.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        return lastRefresh.toLocaleDateString();
      })()
    : 'Never updated';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50">
              <FaWallet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-2xl font-semibold">Wallet</h2>
          </div>
          <p className="text-sm text-muted-foreground ml-[52px]">
            Manage your AI tokens and channel credits. Balances auto-refresh every 5 minutes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{lastRefreshText}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadBalances()}
            disabled={loading}
            className="h-8 w-8 p-0"
            title="Refresh balances"
          >
            <MdRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="border-0 shadow-sm">
          <FaExclamationCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* AI Tokens Section */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">AI Tokens</CardTitle>
          <CardDescription className="text-xs">
            Purchase and manage tokens for AI-powered features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AITokenBalanceCard />
          </div>
        </CardContent>
      </Card>

      <Separator className="my-6" />

      {/* Channel Wallets Section */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Channel Wallets</CardTitle>
          <CardDescription className="text-xs">
            Manage credits for WhatsApp, Instagram, SMS, and Email channels
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && balancesArray.length === 0 ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <Skeleton className="h-5 w-24 mb-2" />
                    <Skeleton className="h-3 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-4" />
                    <div className="flex gap-2">
                      <Skeleton className="h-9 flex-1" />
                      <Skeleton className="h-9 flex-1" />
                    </div>
              </CardContent>
            </Card>
              ))}
            </div>
        ) : sortedBalances.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {sortedBalances.map((balance) => (
            <WalletBalanceCard key={balance.channelType} balance={balance} />
              ))}
            </div>
        ) : (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center">
                <FaWallet className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  No wallet balances found. Click refresh to sync balances from external APIs.
                </p>
              </CardContent>
            </Card>
        )}
        </CardContent>
      </Card>

      <Separator className="my-6" />

      {/* Usage Breakdown Section */}
      <UsageBreakdown />

      <Separator className="my-6" />

      {/* AI Token History */}
      <AITokenHistory />

      {/* Channel Details Tabs */}
      {sortedBalances.length > 0 && (
        <>
          <Separator className="my-6" />
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Channel Transaction History</CardTitle>
              <CardDescription className="text-xs">
                View detailed transaction history for each channel
              </CardDescription>
            </CardHeader>
            <CardContent>
      <Tabs value={activeChannel} onValueChange={setActiveChannel} className="w-full">
                <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${sortedBalances.length}, 1fr)` }}>
          {sortedBalances.map((balance) => {
            const config = channelConfig[balance.channelType as keyof typeof channelConfig];
            return (
                      <TabsTrigger key={balance.channelType} value={balance.channelType} className="text-xs">
                {config?.name || balance.channelType}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {sortedBalances.map((balance) => {
          const config = channelConfig[balance.channelType as keyof typeof channelConfig];
          return (
            <TabsContent key={balance.channelType} value={balance.channelType} className="mt-6">
              <WalletHistory channelType={balance.channelType} channelName={config?.name || balance.channelType} />
            </TabsContent>
          );
        })}
      </Tabs>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

