import { useState, useEffect, useCallback } from 'react';
import { stripeApi } from '@/lib/api/stripe-client';
import type { PlanDefinition, SubscriptionSummary, InvoiceItem, PaymentMethod, UsageSummary } from '@/lib/api/stripe-client';
import { useToast } from '@/hooks/use-toast';

interface UseBillingReturn {
  // State
  plans: PlanDefinition[];
  subscription: SubscriptionSummary | null;
  invoices: InvoiceItem[];
  paymentMethods: PaymentMethod[];
  usage: UsageSummary | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  loadPlans: () => Promise<void>;
  loadSubscription: () => Promise<void>;
  loadInvoices: () => Promise<void>;
  loadPaymentMethods: () => Promise<void>;
  loadUsage: () => Promise<void>;
  subscribeToPlan: (priceId: string) => Promise<void>;
  openBillingPortal: () => Promise<void>;
  attachPaymentMethod: (paymentMethodId: string) => Promise<void>;
  refreshAll: () => Promise<void>;
}

export function useBilling(): UseBillingReturn {
  const { toast } = useToast();
  const [plans, setPlans] = useState<PlanDefinition[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await stripeApi.listPlans();
      setPlans(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load plans';
      setError(message);
      toast({
        title: 'Failed to load plans',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadSubscription = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await stripeApi.getSubscription();
      setSubscription(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load subscription';
      setError(message);
      // Don't show toast for subscription errors as it might not exist yet
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await stripeApi.listInvoices();
      setInvoices(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load invoices';
      setError(message);
      toast({
        title: 'Failed to load invoices',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadPaymentMethods = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await stripeApi.listPaymentMethods();
      setPaymentMethods(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load payment methods';
      setError(message);
      // Don't show toast for payment methods errors as they might not exist yet
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsage = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await stripeApi.getUsage();
      setUsage(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load usage';
      setError(message);
      // Don't show toast for usage errors
    } finally {
      setLoading(false);
    }
  }, []);

  const subscribeToPlan = useCallback(async (priceId: string) => {
    try {
      setLoading(true);
      setError(null);
      const successUrl = `${window.location.origin}/dashboard/admin-settings?tab=billing&success=true`;
      const cancelUrl = `${window.location.origin}/dashboard/admin-settings?tab=billing&canceled=true`;
      const { url } = await stripeApi.createCheckout(priceId, successUrl, cancelUrl);
      window.location.href = url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start checkout';
      setError(message);
      toast({
        title: 'Checkout failed',
        description: message,
        variant: 'destructive',
      });
      setLoading(false);
    }
  }, [toast]);

  const openBillingPortal = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const returnUrl = `${window.location.origin}/dashboard/admin-settings?tab=billing`;
      const { url } = await stripeApi.createPortal(returnUrl);
      window.location.href = url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to open billing portal';
      setError(message);
      toast({
        title: 'Failed to open billing portal',
        description: message,
        variant: 'destructive',
      });
      setLoading(false);
    }
  }, [toast]);

  const attachPaymentMethod = useCallback(async (paymentMethodId: string) => {
    try {
      setLoading(true);
      setError(null);
      await stripeApi.attachPaymentMethod(paymentMethodId);
      await loadPaymentMethods();
      toast({
        title: 'Payment method added',
        description: 'Your payment method has been successfully added.',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to attach payment method';
      setError(message);
      toast({
        title: 'Failed to add payment method',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast, loadPaymentMethods]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      loadPlans(),
      loadSubscription(),
      loadInvoices(),
      loadPaymentMethods(),
      loadUsage(),
    ]);
  }, [loadPlans, loadSubscription, loadInvoices, loadPaymentMethods, loadUsage]);

  useEffect(() => {
    refreshAll();
  }, []); // Load on mount

  return {
    plans,
    subscription,
    invoices,
    paymentMethods,
    usage,
    loading,
    error,
    loadPlans,
    loadSubscription,
    loadInvoices,
    loadPaymentMethods,
    loadUsage,
    subscribeToPlan,
    openBillingPortal,
    attachPaymentMethod,
    refreshAll,
  };
}

