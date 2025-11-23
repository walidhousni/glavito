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

interface PurchaseAITokensDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPurchase: (tokenAmount: number) => Promise<void>;
}

const TOKEN_PACKAGES = [
  { amount: 100, price: 1.0, popular: false },
  { amount: 500, price: 4.5, popular: true },
  { amount: 1000, price: 8.0, popular: false },
  { amount: 5000, price: 35.0, popular: false },
  { amount: 10000, price: 60.0, popular: false },
];

export function PurchaseAITokensDialog({
  open,
  onOpenChange,
  onPurchase,
}: PurchaseAITokensDialogProps) {
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = selectedPackage || parseInt(customAmount, 10);
    if (!amount || amount < 50) return;

    setLoading(true);
    try {
      await onPurchase(amount);
    } catch (error) {
      // Error handling is done in parent
    } finally {
      setLoading(false);
    }
  };

  const selectedPrice = selectedPackage
    ? TOKEN_PACKAGES.find((p) => p.amount === selectedPackage)?.price || 0
    : customAmount
    ? parseFloat(customAmount) * 0.01
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Purchase AI Tokens</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Buy AI tokens to power your AI features. Tokens are used for AI analysis, auto-resolve, insights, and more.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium">Select Package</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {TOKEN_PACKAGES.map((pkg) => (
                  <button
                    key={pkg.amount}
                    type="button"
                    onClick={() => {
                      setSelectedPackage(pkg.amount);
                      setCustomAmount('');
                    }}
                    className={`p-3 border rounded-lg text-left transition-all ${
                      selectedPackage === pkg.amount
                        ? 'border-purple-600 dark:border-purple-500 bg-purple-50 dark:bg-purple-950/50 shadow-sm'
                        : 'border-border hover:bg-accent hover:border-border/80'
                    } ${pkg.popular ? 'ring-2 ring-purple-500 dark:ring-purple-400' : ''}`}
                  >
                    <div className="font-semibold text-sm">{pkg.amount.toLocaleString()} tokens</div>
                    <div className="text-xs text-muted-foreground mt-0.5">${pkg.price.toFixed(2)}</div>
                    {pkg.popular && (
                      <div className="text-xs text-purple-600 dark:text-purple-400 mt-1 font-medium">Most Popular</div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background dark:bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <div>
              <Label htmlFor="customAmount" className="text-sm font-medium">Custom Amount</Label>
              <Input
                id="customAmount"
                type="number"
                min="50"
                placeholder="Enter token amount (min 50)"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setSelectedPackage(null);
                }}
                className="mt-2 h-10"
              />
              {customAmount && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  ${(parseFloat(customAmount) * 0.01).toFixed(2)} ($0.01 per token)
                  {parseFloat(customAmount) < 50 && <span className="text-red-500 ml-2">Minimum 50 tokens ($0.50)</span>}
                </p>
              )}
            </div>

            {selectedPrice > 0 && (
              <div className="p-3 bg-muted/50 dark:bg-muted/30 rounded-lg border border-border/50">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-semibold">${selectedPrice.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || (!selectedPackage && (!customAmount || parseInt(customAmount) < 50))}
              className="h-9 bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white"
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

