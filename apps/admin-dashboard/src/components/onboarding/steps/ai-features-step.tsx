/**
 * AI Features Step - Placeholder
 */

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

interface AIFeaturesStepProps {
  data: Record<string, unknown>;
  onDataChange: (data: Record<string, unknown>) => void;
}

export function AIFeaturesStep({ data, onDataChange }: AIFeaturesStepProps) {
  const t = useTranslations('onboarding.steps.aiFeatures');
  
  const features = [
    { key: 'autoPilotResponses', id: 'auto-pilot-responses' },
    { key: 'sentimentAnalysis', id: 'sentiment-analysis' },
    { key: 'smartRouting', id: 'smart-routing' },
    { key: 'leadScoring', id: 'lead-scoring' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="text-center mb-8">
        <Image src="https://img.icons8.com/?size=96&id=FQrA6ic36VQu" alt={t('ui.aiPoweredFeatures')} width={80} height={80} className="mx-auto mb-4" />
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          {t('ui.aiPoweredFeatures')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">{t('ui.enableIntelligentAutomation')}</p>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>{t('ui.aiConfiguration')}</CardTitle>
          <CardDescription>{t('ui.chooseFeatures')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {features.map((feature) => (
            <div key={feature.key} className="flex items-center justify-between p-4 border rounded-lg">
              <Label htmlFor={feature.id} className="flex-1">
                {t(`ui.${feature.key}`)}
              </Label>
              <Switch
                id={feature.id}
                checked={(data[feature.id] as boolean) || false}
                onCheckedChange={(checked) => onDataChange({ ...data, [feature.id]: checked })}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}
