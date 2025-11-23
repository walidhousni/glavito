/**
 * Complete Step
 * Success screen with confetti animation
 */

'use client';

import React, { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Rocket } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface CompleteStepProps {
  data: Record<string, unknown>;
  onDataChange: (data: Record<string, unknown>) => void;
}

export function CompleteStep({ data, onDataChange }: CompleteStepProps) {
  const t = useTranslations('onboarding.steps.complete');

  useEffect(() => {
    // Mark as viewed
    onDataChange({ ...data, viewed: true });
  }, [data, onDataChange]);

  const stats = [
    { icon: 'https://img.icons8.com/?size=48&id=16466', key: 'channelsConnected', value: '3' },
    { icon: 'https://img.icons8.com/?size=48&id=34287', key: 'teamMembers', value: '5' },
    { icon: 'https://img.icons8.com/?size=48&id=FQrA6ic36VQu', key: 'aiEnabled', value: '✓' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-8"
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="relative inline-block mb-6">
          <motion.div
            animate={{
              rotate: [0, 10, -10, 10, 0],
              scale: [1, 1.1, 1.1, 1.1, 1],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              repeatDelay: 2,
            }}
          >
            <Image
              src="https://img.icons8.com/?size=128&id=82751"
              alt={t('ui.allSet')}
              width={120}
              height={120}
              className="mx-auto"
            />
          </motion.div>
          <motion.div
            className="absolute -top-4 -right-4"
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 360],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          >
            <Rocket className="w-8 h-8 text-purple-600" />
          </motion.div>
        </div>

        <h2 className="text-4xl font-bold bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
          {t('ui.allSet')}
        </h2>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
          {t('ui.workspaceReady')}
        </p>
      </motion.div>

      <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
        <CardContent className="p-8">
          <div className="grid grid-cols-3 gap-6">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="text-center"
              >
                <Image
                  src={stat.icon}
                  alt={t(`ui.stats.${stat.key}`)}
                  width={40}
                  height={40}
                  className="mx-auto mb-2"
                />
                <div className="text-2xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t(`ui.stats.${stat.key}`)}
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="space-y-4"
      >
        <p className="text-lg text-gray-600 dark:text-gray-400">
          {t('ui.clickFinish', { default: 'Click "Finish" below to complete setup' })}
        </p>
        <p className="text-sm text-gray-500">
          {t('ui.accessSettingsLater')}
        </p>
      </motion.div>
    </motion.div>
  );
}
