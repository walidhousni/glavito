/**
 * Welcome Step
 * Company information and initial setup
 */

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

interface WelcomeStepProps {
  data: Record<string, unknown>;
  onDataChange: (data: Record<string, unknown>) => void;
}

export function WelcomeStep({ data, onDataChange }: WelcomeStepProps) {
  const t = useTranslations('onboarding.steps.welcome');
  
  const handleChange = (field: string, value: string) => {
    onDataChange({ ...data, [field]: value });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-4"
        >
          <Image
            src="https://img.icons8.com/?size=96&id=3723"
            alt="Welcome"
            width={80}
            height={80}
            className="mx-auto"
          />
        </motion.div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          {t('ui.welcomeTitle')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t('ui.welcomeSubtitle')}
        </p>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image src="https://img.icons8.com/?size=24&id=2969" alt="" width={20} height={20} />
            {t('ui.companyInformation')}
          </CardTitle>
          <CardDescription>
            {t('ui.companyDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">{t('ui.companyName')}</Label>
            <Input
              id="companyName"
              placeholder={t('ui.companyNamePlaceholder')}
              value={(data.companyName as string) || ''}
              onChange={(e) => handleChange('companyName', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="industry">{t('ui.industry')}</Label>
              <Select
                value={(data.industry as string) || ''}
                onValueChange={(value) => handleChange('industry', value)}
              >
                <SelectTrigger id="industry">
                  <SelectValue placeholder={t('ui.selectIndustry')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technology">{t('ui.industries.technology')}</SelectItem>
                  <SelectItem value="retail">{t('ui.industries.retail')}</SelectItem>
                  <SelectItem value="healthcare">{t('ui.industries.healthcare')}</SelectItem>
                  <SelectItem value="finance">{t('ui.industries.finance')}</SelectItem>
                  <SelectItem value="education">{t('ui.industries.education')}</SelectItem>
                  <SelectItem value="services">{t('ui.industries.services')}</SelectItem>
                  <SelectItem value="other">{t('ui.industries.other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companySize">{t('ui.companySize')}</Label>
              <Select
                value={(data.companySize as string) || ''}
                onValueChange={(value) => handleChange('companySize', value)}
              >
                <SelectTrigger id="companySize">
                  <SelectValue placeholder={t('ui.selectSize')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-10">{t('ui.sizes.1-10')}</SelectItem>
                  <SelectItem value="11-50">{t('ui.sizes.11-50')}</SelectItem>
                  <SelectItem value="51-200">{t('ui.sizes.51-200')}</SelectItem>
                  <SelectItem value="201-500">{t('ui.sizes.201-500')}</SelectItem>
                  <SelectItem value="501+">{t('ui.sizes.501+')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">{t('ui.timezone')}</Label>
            <Select
              value={(data.timezone as string) || 'UTC'}
              onValueChange={(value) => handleChange('timezone', value)}
            >
              <SelectTrigger id="timezone">
                <SelectValue placeholder={t('ui.selectTimezone')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="America/New_York">{t('ui.timezones.eastern')}</SelectItem>
                <SelectItem value="America/Chicago">{t('ui.timezones.central')}</SelectItem>
                <SelectItem value="America/Denver">{t('ui.timezones.mountain')}</SelectItem>
                <SelectItem value="America/Los_Angeles">{t('ui.timezones.pacific')}</SelectItem>
                <SelectItem value="Europe/London">{t('ui.timezones.london')}</SelectItem>
                <SelectItem value="Europe/Paris">{t('ui.timezones.centralEuropean')}</SelectItem>
                <SelectItem value="Asia/Tokyo">{t('ui.timezones.tokyo')}</SelectItem>
                <SelectItem value="UTC">{t('ui.timezones.utc')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
