import { api } from './config';

export interface PlanDefinition {
  id: string;
  name: string;
  stripePriceId: string;
  interval: 'month' | 'year';
  currency: string;
  unitAmount: number;
  features: string[];
  limits?: {
    agents?: number;
    teams?: number;
    monthlyActiveContacts?: number;
    aiAgentCredits?: number | 'unlimited';
    aiAgents?: number;
    messagingChannels?: number;
    broadcastMessages?: number;
    knowledgeBaseUploads?: number;
    trainingUrls?: number;
    unlimitedAIUsage?: boolean;
  };
  isPopular?: boolean;
}

export interface SubscriptionSummary {
  status: string;
  currentPeriodEnd?: string;
  priceId?: string;
  stripeSubscriptionId?: string;
  planId?: string;
}

export interface InvoiceItem {
  id: string;
  number?: string | null;
  total: number;
  currency: string;
  status: string;
  created: number;
  hostedInvoiceUrl?: string | null;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account' | 'paypal';
  card?: {
    brand?: string;
    last4?: string;
    exp_month?: number;
    exp_year?: number;
  };
  billing_details?: {
    name?: string;
    email?: string;
  };
}

export interface UsageSummary {
  apiCalls: number;
  storage: number;
  messages: number;
  seats: number;
  agents: number;
  teams: number;
  users: number;
  monthlyActiveContacts: number;
  aiAgents: number;
  messagingChannels: number;
  broadcastMessages: number;
  limits: {
    agents: number;
    customers: number;
    tickets: number;
    storage: number;
    apiCalls: number;
    teams?: number;
    users?: number;
    monthlyActiveContacts?: number;
    aiAgents?: number;
    messagingChannels?: number;
    broadcastMessages?: number;
    knowledgeBaseUploads?: number;
    trainingUrls?: number;
  };
}

export const stripeApi = {
  listPlans: async (): Promise<PlanDefinition[]> => {
    const res = await api.get('/stripe/plans');
    return res.data as PlanDefinition[];
  },
  getSubscription: async (): Promise<SubscriptionSummary | null> => {
    const res = await api.get('/stripe/subscription');
    return (res.data || null) as SubscriptionSummary | null;
  },
  createCheckout: async (priceId: string, successUrl?: string, cancelUrl?: string): Promise<{ url: string }> => {
    const res = await api.post('/stripe/subscribe', { priceId, successUrl, cancelUrl });
    return res.data as { url: string };
  },
  createPortal: async (returnUrl?: string): Promise<{ url: string }> => {
    const res = await api.post('/stripe/portal', { returnUrl });
    return res.data as { url: string };
  },
  listInvoices: async (): Promise<InvoiceItem[]> => {
    const res = await api.get('/stripe/invoices');
    return res.data as InvoiceItem[];
  },
  listPaymentMethods: async (): Promise<PaymentMethod[]> => {
    const res = await api.get('/stripe/payment-methods');
    return res.data as PaymentMethod[];
  },
  attachPaymentMethod: async (paymentMethodId: string): Promise<PaymentMethod> => {
    const res = await api.post('/stripe/payment-methods/attach', { paymentMethodId });
    return res.data as PaymentMethod;
  },
  getUsage: async (): Promise<UsageSummary> => {
    const res = await api.get('/stripe/usage');
    return res.data as UsageSummary;
  },
  purchaseAITokens: async (tokenAmount: number, successUrl?: string, cancelUrl?: string): Promise<{ url: string; sessionId: string }> => {
    const res = await api.post('/stripe/ai-tokens/purchase', { tokenAmount, successUrl, cancelUrl });
    return res.data as { url: string; sessionId: string };
  },
};


