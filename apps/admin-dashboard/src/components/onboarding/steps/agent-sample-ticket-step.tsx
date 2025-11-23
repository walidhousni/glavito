/**
 * Agent Sample Ticket Step
 */

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { MessageSquare } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface AgentSampleTicketStepProps {
  data: Record<string, unknown>;
  onDataChange: (data: Record<string, unknown>) => void;
}

export function AgentSampleTicketStep({ data, onDataChange }: AgentSampleTicketStepProps) {
  const t = useTranslations('onboarding.steps.agentSampleTicket');
  
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="text-center mb-8">
        <Image src="https://img.icons8.com/?size=96&id=85057" alt={t('ui.practiceTitle')} width={80} height={80} className="mx-auto mb-4" />
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          {t('ui.practiceTitle')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">{t('ui.practiceSubtitle')}</p>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            {t('ui.sampleMessageTitle')}
          </CardTitle>
          <CardDescription>{t('ui.practiceDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm">
              &quot;{t('sampleTicket.description')}&quot;
            </p>
          </div>
          <div className="space-y-2">
            <Textarea
              placeholder={t('ui.responsePlaceholder')}
              value={(data.response as string) || ''}
              onChange={(e) => onDataChange({ ...data, response: e.target.value })}
              rows={4}
            />
          </div>
          <Button variant="outline" className="w-full">
            {t('ui.sendResponse')}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
