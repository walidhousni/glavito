/**
 * Knowledge Base Step - Placeholder
 */

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Upload, FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface KnowledgeBaseStepProps {
  data: Record<string, unknown>;
  onDataChange: (data: Record<string, unknown>) => void;
}

export function KnowledgeBaseStep({ data, onDataChange }: KnowledgeBaseStepProps) {
  const t = useTranslations('onboarding.steps.knowledgeBase');
  
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="text-center mb-8">
        <Image src="https://img.icons8.com/?size=96&id=36389" alt={t('ui.buildKnowledgeBase')} width={80} height={80} className="mx-auto mb-4" />
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          {t('ui.buildKnowledgeBase')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">{t('ui.importOrCreate')}</p>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>{t('ui.knowledgeBaseSetup')}</CardTitle>
          <CardDescription>{t('ui.addDocumentation')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" className="w-full justify-start">
            <Upload className="w-4 h-4 mr-2" />
            {t('ui.importFromCsv')}
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <FileText className="w-4 h-4 mr-2" />
            {t('ui.createManually')}
          </Button>
          <p className="text-sm text-gray-500 text-center">{t('ui.skipAndAddLater')}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
