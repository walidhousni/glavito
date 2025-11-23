/**
 * Agent Profile Step
 */

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

interface AgentProfileStepProps {
  data: Record<string, unknown>;
  onDataChange: (data: Record<string, unknown>) => void;
}

export function AgentProfileStep({ data, onDataChange }: AgentProfileStepProps) {
  const t = useTranslations('onboarding.steps.agentProfile');
  
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="text-center mb-8">
        <Image src="https://img.icons8.com/?size=96&id=23264" alt={t('title')} width={80} height={80} className="mx-auto mb-4" />
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          {t('title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">{t('subtitle')}</p>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>{t('profileInfo.title')}</CardTitle>
          <CardDescription>{t('profileInfo.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">{t('displayName')}</Label>
            <Input
              id="displayName"
              placeholder={t('displayNamePlaceholder')}
              value={(data.displayName as string) || ''}
              onChange={(e) => onDataChange({ ...data, displayName: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">{t('profileInfo.bioOptional')}</Label>
            <Textarea
              id="bio"
              placeholder={t('profileInfo.bioPlaceholder')}
              value={(data.bio as string) || ''}
              onChange={(e) => onDataChange({ ...data, bio: e.target.value })}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
