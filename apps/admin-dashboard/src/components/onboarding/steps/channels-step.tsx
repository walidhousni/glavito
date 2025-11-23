/**
 * Channels Step - Placeholder
 */

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

interface ChannelsStepProps {
  data: Record<string, unknown>;
  onDataChange: (data: Record<string, unknown>) => void;
}

export function ChannelsStep({ data, onDataChange }: ChannelsStepProps) {
  const t = useTranslations('onboarding.steps.channels');
  
  const channels = [
    { key: 'whatsapp', id: 'whatsapp' },
    { key: 'instagram', id: 'instagram' },
    { key: 'email', id: 'email' },
    { key: 'liveChat', id: 'livechat' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="text-center mb-8">
        <Image src="https://img.icons8.com/?size=96&id=16466" alt={t('ui.connectChannels')} width={80} height={80} className="mx-auto mb-4" />
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          {t('ui.connectChannels')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">{t('ui.selectChannels')}</p>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>{t('ui.availableChannels')}</CardTitle>
          <CardDescription>{t('ui.enableChannels')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {channels.map((channel) => (
            <div key={channel.key} className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
              <Checkbox
                checked={(data[channel.id] as boolean) || false}
                onCheckedChange={(checked) => onDataChange({ ...data, [channel.id]: checked })}
              />
              <label className="flex-1 font-medium">
                {t(`ui.${channel.key}`)}
              </label>
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}
