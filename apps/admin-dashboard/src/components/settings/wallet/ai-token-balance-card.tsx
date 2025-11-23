'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FaBrain, FaPlus, FaSpinner } from 'react-icons/fa';
import { walletClient } from '@/lib/api/wallet-client';
import { stripeApi } from '@/lib/api/stripe-client';
import { useToast } from '@/hooks/use-toast';
import { PurchaseAITokensDialog } from './purchase-ai-tokens-dialog';

interface AITokenBalance {
  balance: number;
  currency: string;
}

export function AITokenBalanceCard() {
  const [balance, setBalance] = useState<AITokenBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const { toast } = useToast();

  const loadBalance = async () => {
    try {
      setLoading(true);
      const data = await walletClient.getAITokenBalance();
      setBalance(data);
    } catch (error: any) {
      console.error('Failed to load AI token balance:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to load AI token balance',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLow = balance ? balance.balance < 100 : false;
  const isCritical = balance ? balance.balance < 10 : false;

  const handlePurchase = async (tokenAmount: number) => {
    try {
      const { url } = await stripeApi.purchaseAITokens(
        tokenAmount,
        `${window.location.origin}/dashboard/settings/wallet?success=true`,
        `${window.location.origin}/dashboard/settings/wallet?cancelled=true`,
      );
      window.location.href = url;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to initiate purchase',
        variant: 'destructive',
      });
    }
  };

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
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/50">
                <FaBrain className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">AI Tokens</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  AI-powered features
                </CardDescription>
              </div>
            </div>
            <Badge
              variant={isCritical ? 'destructive' : isLow ? 'secondary' : 'default'}
              className={`text-xs ${
                isCritical 
                  ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800' 
                  : isLow 
                  ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800'
                  : 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800'
              }`}
            >
              {isCritical ? 'Low' : isLow ? 'Warning' : 'Healthy'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-4">
            <div>
              {loading ? (
                <div className="flex items-center gap-2 py-2">
                  <FaSpinner className="w-5 h-5 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Loading...</span>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-semibold text-purple-600 dark:text-purple-400">
                    {balance?.balance != null ? balance.balance.toLocaleString() : '0'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Available tokens
                  </p>
                </>
              )}
            </div>

            <Button
              size="sm"
              onClick={() => setPurchaseOpen(true)}
              className="w-full bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white"
            >
              <FaPlus className="w-3.5 h-3.5 mr-1.5" />
              Purchase
            </Button>
          </div>
        </CardContent>
      </Card>

      <PurchaseAITokensDialog
        open={purchaseOpen}
        onOpenChange={setPurchaseOpen}
        onPurchase={handlePurchase}
      />
    </>
  );
}

