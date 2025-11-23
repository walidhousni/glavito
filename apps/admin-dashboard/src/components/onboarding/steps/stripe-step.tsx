/**
 * Stripe Step
 * Payment setup with Stripe Connect
 */

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { CreditCard, Shield, CheckCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface StripeStepProps {
  data: Record<string, unknown>;
  onDataChange: (data: Record<string, unknown>) => void;
}

export function StripeStep({ data, onDataChange }: StripeStepProps) {
  const t = useTranslations('onboarding.steps.stripe');
  const isConnected = data.stripeConnected as boolean;

  const handleConnect = () => {
    // Simulate Stripe connection
    onDataChange({ ...data, stripeConnected: true });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-4"
        >
          <Image
            src="https://img.icons8.com/?size=96&id=19951"
            alt={t('ui.setupPayments')}
            width={80}
            height={80}
            className="mx-auto"
          />
        </motion.div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          {t('ui.setupPayments')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t('ui.connectStripeAccount')}
        </p>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            {t('ui.stripeConnect')}
          </CardTitle>
          <CardDescription>
            {t('ui.securelyConnect')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isConnected ? (
            <div className="flex items-center justify-center p-8 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">{t('ui.connected')}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('ui.accountConnected')}
                </p>
                <Badge className="mt-4 bg-green-600">{t('ui.active')}</Badge>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg">
                <div className="flex items-start gap-4">
                  <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold mb-2">{t('ui.secureAndEasy')}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('ui.secureDescription')}
                    </p>
                  </div>
                </div>
              </div>

              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600"
                onClick={handleConnect}
              >
                <Image
                  src="https://img.icons8.com/?size=20&id=19951"
                  alt=""
                  width={18}
                  height={18}
                  className="mr-2 brightness-0 invert"
                />
                {t('ui.connectStripeAccountButton')}
              </Button>

              <p className="text-xs text-center text-gray-500">
                {t('ui.redirectMessage')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
