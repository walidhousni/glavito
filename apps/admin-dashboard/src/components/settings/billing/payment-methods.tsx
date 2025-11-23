'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Icon } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useBilling } from '@/lib/hooks/use-billing';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { stripeApi } from '@/lib/api/stripe-client';
import { loadStripe } from '@stripe/stripe-js';

const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

export function PaymentMethods() {
  const t = useTranslations('settings.billing.paymentMethods');
  const { paymentMethods, loading, error, loadPaymentMethods, attachPaymentMethod, openBillingPortal } = useBilling();

  const [showAddCardDialog, setShowAddCardDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadPaymentMethods();
  }, [loadPaymentMethods]);

  const getCardIcon = (brand?: string) => {
    const brandMap: Record<string, keyof typeof import('@/lib/icons').icons> = {
      visa: 'creditCard',
      mastercard: 'creditCard',
      amex: 'creditCard',
      discover: 'creditCard',
    };
    return brandMap[brand?.toLowerCase() || ''] || 'creditCard';
  };

  const handleSetDefault = async (methodId: string) => {
    // Redirect to Stripe portal to manage payment methods
    try {
      await openBillingPortal();
    } catch (err) {
      toast({
        title: 'Failed to open billing portal',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteMethod = async () => {
    if (!selectedMethod) return;

    // Redirect to Stripe portal to delete payment methods
    try {
      await openBillingPortal();
    } catch (err) {
      toast({
        title: 'Failed to open billing portal',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
    
    setShowDeleteDialog(false);
    setSelectedMethod(null);
  };

  const handleAddCard = async () => {
    if (!STRIPE_PUBLISHABLE_KEY) {
      toast({
        title: 'Stripe not configured',
        description: 'Payment method management is not available. Please contact support.',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);
    try {
      // Redirect to Stripe portal to add payment method
      await openBillingPortal();
    } catch (err) {
      toast({
        title: 'Failed to open billing portal',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">{t('title')}</h3>
          <p className="text-sm text-muted-foreground">
            Manage your payment methods and billing information
          </p>
        </div>
        <Button onClick={handleAddCard} disabled={processing || !STRIPE_PUBLISHABLE_KEY}>
          {processing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Icon name="plus" className="w-4 h-4 mr-2" />
              Add Payment Method
            </>
          )}
        </Button>
      </div>

      {/* Payment Methods List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {paymentMethods.map((method) => (
          <Card
            key={method.id}
            className={cn(
              'relative',
              // Check if this is the default payment method (first one or marked as default)
              paymentMethods.indexOf(method) === 0 && 'ring-2 ring-primary'
            )}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center">
                    <Icon name={getCardIcon(method.card?.brand)} className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base capitalize">
                        {method.card?.brand || method.type}
                      </CardTitle>
                      {paymentMethods.indexOf(method) === 0 && (
                        <Badge variant="secondary" className="text-xs">
                          Default
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-sm">
                      •••• •••• •••• {method.card?.last4 || '****'}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {method.card?.exp_month && method.card?.exp_year && (
                <div className="text-sm text-muted-foreground">
                  Expires {method.card.exp_month}/{method.card.exp_year}
                </div>
              )}

              {method.billing_details?.name && (
                <div className="text-sm">
                  <div className="font-medium">{method.billing_details.name}</div>
                  {method.billing_details.email && (
                    <div className="text-muted-foreground">{method.billing_details.email}</div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t">
                {paymentMethods.indexOf(method) !== 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleSetDefault(method.id)}
                  >
                    Set as Default
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => {
                    setSelectedMethod(method.id);
                    setShowDeleteDialog(true);
                  }}
                >
                  <Icon name="trash" className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Empty State */}
        {paymentMethods.length === 0 && !loading && (
          <Card className="col-span-2">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Icon name="creditCard" className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No payment methods</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add a payment method to start your subscription
              </p>
              <Button onClick={handleAddCard} disabled={!STRIPE_PUBLISHABLE_KEY}>
                <Icon name="plus" className="w-4 h-4 mr-2" />
                Add Payment Method
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Security Notice */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <CardContent className="flex items-start gap-3 pt-6">
          <Icon name="shield" className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">Secure Payment Processing</h4>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              All payment information is encrypted and processed securely by Stripe. We never store your full card details on our servers.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Add Card Dialog - Simplified, redirects to Stripe portal */}
      <Dialog open={showAddCardDialog} onOpenChange={setShowAddCardDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Payment Method</DialogTitle>
            <DialogDescription>
              You&apos;ll be redirected to Stripe&apos;s secure portal to add a payment method.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCardDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCard} disabled={processing}>
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Redirecting...
                </>
              ) : (
                'Continue to Stripe'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Payment Method</DialogTitle>
            <DialogDescription>
              You&apos;ll be redirected to Stripe&apos;s billing portal to manage payment methods safely.
              {selectedMethod === paymentMethods[0]?.id && (
                <span className="block mt-2 text-yellow-600 dark:text-yellow-400">
                  ⚠️ This is your default payment method. Set another as default first.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteMethod}
            >
              Go to Billing Portal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

