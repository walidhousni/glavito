/**
 * Team Step - Placeholder
 */

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface TeamStepProps {
  data: Record<string, unknown>;
  onDataChange: (data: Record<string, unknown>) => void;
}

export function TeamStep({ data, onDataChange }: TeamStepProps) {
  const t = useTranslations('onboarding.steps.team');
  
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="text-center mb-8">
        <Image src="https://img.icons8.com/?size=96&id=34287" alt={t('ui.inviteYourTeam')} width={80} height={80} className="mx-auto mb-4" />
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          {t('ui.inviteYourTeam')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">{t('ui.addTeamMembers')}</p>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>{t('ui.teamInvitations')}</CardTitle>
          <CardDescription>{t('ui.inviteViaEmail')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('ui.emailAddress')}</Label>
            <div className="flex gap-2">
              <Input placeholder={t('ui.emailPlaceholder')} />
              <Button><UserPlus className="w-4 h-4" /></Button>
            </div>
          </div>
          <p className="text-sm text-gray-500">{t('ui.skipAndInviteLater')}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
