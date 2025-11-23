/**
 * Agent KB Intro Step
 */

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Search, BookOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface AgentKBIntroStepProps {
  data: Record<string, unknown>;
  onDataChange: (data: Record<string, unknown>) => void;
}

export function AgentKBIntroStep({ data, onDataChange }: AgentKBIntroStepProps) {
  const t = useTranslations('onboarding.steps.agentKBIntro');
  
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="text-center mb-8">
        <Image src="https://img.icons8.com/?size=96&id=36389" alt={t('title')} width={80} height={80} className="mx-auto mb-4" />
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          {t('title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">{t('subtitle')}</p>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            {t('features.search')}
          </CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder={t('features.search')}
              className="pl-10"
            />
          </div>
          <p className="text-sm text-gray-500 text-center">
            {t('description')}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
