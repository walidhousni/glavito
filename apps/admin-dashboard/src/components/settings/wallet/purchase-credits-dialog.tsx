'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FaSpinner } from 'react-icons/fa';
import { useToast } from '@/hooks/use-toast';

interface PurchaseCreditsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelType: string;
  channelName: string;
  onPurchase: (amount: number) => Promise<void | string>;
}

export function PurchaseCreditsDialog({
  open,
  onOpenChange,
  channelType,
  channelName,
  onPurchase,
}: PurchaseCreditsDialogProps) {
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid amount greater than 0',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const result = await onPurchase(numAmount);
      if (typeof result === 'string') {
        // Redirect handled by parent or here if needed, but parent does it in my previous edit.
        // Actually, if parent does redirect, this component might unmount or redirect happens.
        // Let's just show success toast if no redirect or before redirect.
        toast({
          title: 'Redirecting to payment...',
          description: `Initiating purchase of $${numAmount} credits for ${channelName}`,
        });
      } else {
        toast({
          title: 'Credits purchased',
          description: `Successfully purchased $${numAmount} credits for ${channelName}`,
        });
        setAmount('');
        onOpenChange(false);
      }
    } catch (error: any) {
      toast({
        title: 'Purchase failed',
        description: error?.message || 'Failed to purchase credits. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Purchase Credits</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Add credits to your {channelName} wallet. Credits will be added immediately after payment confirmation.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm font-medium">Amount (USD)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                required
                disabled={loading}
                className="h-10"
              />
            </div>
            <div className="p-3 bg-muted/50 dark:bg-muted/30 rounded-lg border border-border/50">
              <p className="text-xs text-muted-foreground">
                You will be redirected to the payment page to complete your purchase.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              disabled={loading}
              className="h-9"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="h-9"
            >
              {loading ? (
                <>
                  <FaSpinner className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Continue to Payment'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

