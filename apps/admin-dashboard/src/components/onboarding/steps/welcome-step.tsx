'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Zap, Users, MessageSquare, BarChart3 } from 'lucide-react';

interface WelcomeStepProps {
  data: any;
  onComplete: (data: any) => Promise<void>;
  isLoading: boolean;
}

export function WelcomeStep({ data, onComplete, isLoading }: WelcomeStepProps) {
  const t = useTranslations('onboarding.steps.welcome');

  const features = [
    {
      icon: MessageSquare,
      title: t('features.multiChannel.title'),
      description: t('features.multiChannel.description'),
    },
    {
      icon: Zap,
      title: t('features.aiPowered.title'),
      description: t('features.aiPowered.description'),
    },
    {
      icon: Users,
      title: t('features.teamCollaboration.title'),
      description: t('features.teamCollaboration.description'),
    },
    {
      icon: BarChart3,
      title: t('features.analytics.title'),
      description: t('features.analytics.description'),
    },
  ];

  const handleGetStarted = async () => {
    await onComplete({ welcomed: true, timestamp: new Date().toISOString() });
  };

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {t('title')}
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          {t('description')}
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {features.map((feature, index) => (
          <Card key={index} className="border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <feature.icon className="w-5 h-5 text-blue-600" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600">
                {feature.description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* What to Expect */}
      <Card>
        <CardHeader>
          <CardTitle>{t('expectations.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
              <span className="text-gray-800">
                {t('expectations.time')}
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
              <span className="text-gray-800">
                {t('expectations.guidance')}
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
              <span className="text-gray-800">
                {t('expectations.optional')}
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
              <span className="text-gray-800">
                {t('expectations.progress')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Get Started Button */}
      <div className="text-center pt-4">
        <Button
          size="lg"
          onClick={handleGetStarted}
          disabled={isLoading}
          className="px-8"
        >
          {isLoading ? t('loading.initializing') : t('getStarted')}
        </Button>
      </div>
    </div>
  );
}