"use client";
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SubscriptionManager } from './billing/subscription-manager';
import { UsageDashboard } from './billing/usage-dashboard';
import { PaymentMethods } from './billing/payment-methods';
import { InvoiceList } from './billing/invoice-list';

export function BillingPanel() {
  const [activeTab, setActiveTab] = useState('subscription');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="subscription">Subscription</TabsTrigger>
        <TabsTrigger value="usage">Usage & Limits</TabsTrigger>
        <TabsTrigger value="payment">Payment Methods</TabsTrigger>
        <TabsTrigger value="invoices">Invoices</TabsTrigger>
      </TabsList>

      <TabsContent value="subscription" className="mt-6">
        <SubscriptionManager />
      </TabsContent>

      <TabsContent value="usage" className="mt-6">
        <UsageDashboard />
      </TabsContent>

      <TabsContent value="payment" className="mt-6">
        <PaymentMethods />
      </TabsContent>

      <TabsContent value="invoices" className="mt-6">
        <InvoiceList />
      </TabsContent>
    </Tabs>
  );
}


