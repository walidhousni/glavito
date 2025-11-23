/**
 * Agent Notifications Step
 */

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface AgentNotificationsStepProps {
  data: Record<string, unknown>;
  onDataChange: (data: Record<string, unknown>) => void;
}

export function AgentNotificationsStep({ data, onDataChange }: AgentNotificationsStepProps) {
  const t = useTranslations('onboarding.steps.agentNotifications');
  
  const preferences = [
    { id: 'email', key: 'email' },
    { id: 'inApp', key: 'inApp' },
    { id: 'push', key: 'push' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="text-center mb-8">
        <Image src="https://img.icons8.com/?size=96&id=9730" alt={t('title')} width={80} height={80} className="mx-auto mb-4" />
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          {t('title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">{t('subtitle')}</p>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            {t('title')}
          </CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {preferences.map((pref) => (
            <div key={pref.id} className="flex items-start justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <Label htmlFor={pref.id} className="font-medium">
                  {t(`preferences.${pref.key}.label`)}
                </Label>
                <p className="text-sm text-gray-500 mt-1">
                  {t(`preferences.${pref.key}.description`)}
                </p>
              </div>
              <Switch
                id={pref.id}
                checked={(data[pref.id] as boolean) || false}
                onCheckedChange={(checked) => onDataChange({ ...data, [pref.id]: checked })}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}
