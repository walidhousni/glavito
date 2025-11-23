/**
 * Agent Tour Step
 */

'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

interface AgentTourStepProps {
  data: Record<string, unknown>;
  onDataChange: (data: Record<string, unknown>) => void;
}

export function AgentTourStep({ data, onDataChange }: AgentTourStepProps) {
  const t = useTranslations('onboarding.steps.agentTour');
  
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="text-center mb-8">
        <Image src="https://img.icons8.com/?size=96&id=31906" alt={t('ui.dashboardTour')} width={80} height={80} className="mx-auto mb-4" />
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          {t('ui.dashboardTour')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">{t('ui.exploreWorkspace')}</p>
      </div>

      <Card className="border-0 shadow-lg">
        <CardContent className="p-8 text-center">
          <div className="space-y-6">
            <Image src="https://img.icons8.com/?size=64&id=31906" alt={t('ui.dashboardTour')} width={64} height={64} className="mx-auto" />
            <p className="text-lg">
              {t('ui.tourDescription')}
            </p>
            <p className="text-sm text-gray-500">
              {t('ui.skipMessage')}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
