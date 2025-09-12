'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  DollarSign, 
  Shield, 
  CheckCircle,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

interface PaymentSetupStepProps {
  data: Record<string, unknown>;
  onComplete: (data: Record<string, unknown>) => Promise<void>;
  isLoading: boolean;
}

export function PaymentSetupStep({ data, onComplete, isLoading }: PaymentSetupStepProps) {
  const t = useTranslations('onboarding.steps.payment');
  
  const [setupType, setSetupType] = useState<'skip' | 'stripe' | 'manual'>(((data.setupType as string) || 'skip') as 'skip' | 'stripe' | 'manual');
  const [stripeConfig, setStripeConfig] = useState({
    email: (data.stripeAccount as Record<string, unknown>)?.email as string || '',
    country: (data.stripeAccount as Record<string, unknown>)?.country as string || 'US',
    businessType: (data.stripeAccount as Record<string, unknown>)?.businessType as string || 'company',
    businessName: ((data.stripeAccount as Record<string, unknown>)?.businessProfile as Record<string, unknown>)?.name as string || '',
    businessUrl: ((data.stripeAccount as Record<string, unknown>)?.businessProfile as Record<string, unknown>)?.url as string || '',
    productDescription: ((data.stripeAccount as Record<string, unknown>)?.businessProfile as Record<string, unknown>)?.productDescription as string || '',
  });
  const [billingConfig, setBillingConfig] = useState({
    currency: (data.billingConfiguration as Record<string, unknown>)?.currency as string || 'usd',
    taxRate: (data.billingConfiguration as Record<string, unknown>)?.taxRate as number || 0,
    invoicePrefix: (data.billingConfiguration as Record<string, unknown>)?.invoicePrefix as string || 'INV',
    paymentTerms: (data.billingConfiguration as Record<string, unknown>)?.paymentTerms as number || 30,
    autoCharge: (data.billingConfiguration as Record<string, unknown>)?.autoCharge as boolean || false,
    lateFeeRate: (data.billingConfiguration as Record<string, unknown>)?.lateFeeRate as number || 0,
    reminderDays: (data.billingConfiguration as Record<string, unknown>)?.reminderDays as number[] || [7, 3, 1],
  });

  const handleSubmit = async () => {
    if (setupType === 'skip') {
      // For skip, we just mark the step as complete with minimal data
      await onComplete({ setupType: 'skip' });
      return;
    }

    if (setupType === 'stripe') {
      const paymentData = {
        setupType: 'stripe',
        stripeAccount: {
          email: stripeConfig.email,
          country: stripeConfig.country,
          businessType: stripeConfig.businessType as 'individual' | 'company',
          businessProfile: {
            name: stripeConfig.businessName,
            url: stripeConfig.businessUrl,
            productDescription: stripeConfig.productDescription,
          },
        },
        billingConfiguration: billingConfig,
      };

      await onComplete(paymentData);
      return;
    }

    // For manual setup, we just mark it as complete
    await onComplete({ setupType: 'manual' });
  };

  return (
    <div className="space-y-6">
      {/* Payment Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <CreditCard className="w-6 h-6 text-primary" />
            <CardTitle>{t('overview.title')}</CardTitle>
          </div>
          <CardDescription>
            {t('overview.description')}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Setup Options */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card 
          className={`cursor-pointer transition-all ${
            setupType === 'skip' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => setSetupType('skip')}
        >
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-6 h-6 text-gray-600" />
            </div>
            <CardTitle className="text-lg">{t('options.skip.title')}</CardTitle>
            <CardDescription>{t('options.skip.description')}</CardDescription>
          </CardHeader>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${
            setupType === 'stripe' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => setSetupType('stripe')}
        >
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-2">
              <CreditCard className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-lg">{t('options.stripe.title')}</CardTitle>
            <CardDescription>{t('options.stripe.description')}</CardDescription>
            <Badge className="mt-2">{t('recommended')}</Badge>
          </CardHeader>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${
            setupType === 'manual' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => setSetupType('manual')}
        >
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-2">
              <DollarSign className="w-6 h-6 text-amber-600" />
            </div>
            <CardTitle className="text-lg">{t('options.manual.title')}</CardTitle>
            <CardDescription>{t('options.manual.description')}</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Stripe Configuration */}
      {setupType === 'stripe' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('stripe.title')}</CardTitle>
            <CardDescription>{t('stripe.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Business Information */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">{t('stripe.businessInfo.title')}</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">{t('stripe.businessInfo.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={stripeConfig.email}
                    onChange={(e) => setStripeConfig({ ...stripeConfig, email: e.target.value })}
                    placeholder="business@example.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="country">{t('stripe.businessInfo.country')}</Label>
                  <select
                    id="country"
                    value={stripeConfig.country}
                    onChange={(e) => setStripeConfig({ ...stripeConfig, country: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                    <option value="AU">Australia</option>
                  </select>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="business-type">{t('stripe.businessInfo.businessType')}</Label>
                  <select
                    id="business-type"
                    value={stripeConfig.businessType}
                    onChange={(e) => setStripeConfig({ ...stripeConfig, businessType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="company">Company</option>
                    <option value="individual">Individual</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="business-name">{t('stripe.businessInfo.businessName')}</Label>
                  <Input
                    id="business-name"
                    value={stripeConfig.businessName}
                    onChange={(e) => setStripeConfig({ ...stripeConfig, businessName: e.target.value })}
                    placeholder="Your Company Name"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="business-url">{t('stripe.businessInfo.businessUrl')}</Label>
                  <Input
                    id="business-url"
                    type="url"
                    value={stripeConfig.businessUrl}
                    onChange={(e) => setStripeConfig({ ...stripeConfig, businessUrl: e.target.value })}
                    placeholder="https://yourcompany.com"
                  />
                </div>
                <div>
                  <Label htmlFor="product-description">{t('stripe.businessInfo.productDescription')}</Label>
                  <Input
                    id="product-description"
                    value={stripeConfig.productDescription}
                    onChange={(e) => setStripeConfig({ ...stripeConfig, productDescription: e.target.value })}
                    placeholder="Brief description of your business"
                  />
                </div>
              </div>
            </div>

            {/* Billing Configuration */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">{t('stripe.billingConfig.title')}</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="currency">{t('stripe.billingConfig.currency')}</Label>
                  <select
                    id="currency"
                    value={billingConfig.currency}
                    onChange={(e) => setBillingConfig({ ...billingConfig, currency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="usd">USD - US Dollar</option>
                    <option value="eur">EUR - Euro</option>
                    <option value="gbp">GBP - British Pound</option>
                    <option value="cad">CAD - Canadian Dollar</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="tax-rate">{t('stripe.billingConfig.taxRate')} (%)</Label>
                  <Input
                    id="tax-rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={billingConfig.taxRate}
                    onChange={(e) => setBillingConfig({ ...billingConfig, taxRate: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="invoice-prefix">{t('stripe.billingConfig.invoicePrefix')}</Label>
                  <Input
                    id="invoice-prefix"
                    value={billingConfig.invoicePrefix}
                    onChange={(e) => setBillingConfig({ ...billingConfig, invoicePrefix: e.target.value })}
                    placeholder="INV"
                  />
                </div>
                <div>
                  <Label htmlFor="payment-terms">{t('stripe.billingConfig.paymentTerms')} (days)</Label>
                  <Input
                    id="payment-terms"
                    type="number"
                    min="1"
                    value={billingConfig.paymentTerms}
                    onChange={(e) => setBillingConfig({ ...billingConfig, paymentTerms: parseInt(e.target.value) || 30 })}
                    placeholder="30"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="auto-charge"
                  checked={billingConfig.autoCharge}
                  onChange={(e) => setBillingConfig({ ...billingConfig, autoCharge: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="auto-charge">{t('stripe.billingConfig.autoCharge')}</Label>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <Shield className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900">{t('stripe.security.title')}</h4>
                  <p className="text-sm text-gray-600 mt-1">{t('stripe.security.description')}</p>
                  <Button variant="link" size="sm" className="text-primary p-0 h-auto mt-2">
                    {t('stripe.security.learnMore')} <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Setup Info */}
      {setupType === 'manual' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('manual.title')}</CardTitle>
            <CardDescription>{t('manual.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800">{t('manual.note.title')}</h4>
                    <p className="text-sm text-yellow-700 mt-1">{t('manual.note.description')}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium">{t('manual.features.title')}</h4>
                <ul className="space-y-2">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">{t('manual.features.invoicing')}</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">{t('manual.features.tracking')}</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">{t('manual.features.reporting')}</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Continue Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSubmit} 
          disabled={isLoading}
          size="lg"
        >
          {isLoading ? t('saving') : t('continue')}
        </Button>
      </div>
    </div>
  );
}