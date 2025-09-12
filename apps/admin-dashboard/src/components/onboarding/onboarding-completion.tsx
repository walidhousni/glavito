'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ArrowRight, Users, FileText, BarChart3, BookOpen } from 'lucide-react';
import { CompletionResult } from '@glavito/shared-types';
import { DashboardPreview } from './dashboard-preview';

interface OnboardingCompletionProps {
  result: CompletionResult;
  onGoToDashboard: () => void;
}

export function OnboardingCompletion({ result, onGoToDashboard }: OnboardingCompletionProps) {
  const t = useTranslations('onboarding.completion');

  const nextSteps = [
    {
      icon: BarChart3,
      title: t('nextSteps.dashboard'),
      description: t('description'),
      action: onGoToDashboard,
      primary: true,
    },
    {
      icon: Users,
      title: t('nextSteps.inviteTeam'),
      description: t('nextSteps.inviteTeam'),
      action: () => window.location.href = '/team/invite',
      primary: false,
    },
    {
      icon: FileText,
      title: t('nextSteps.createTicket'),
      description: t('nextSteps.createTicket'),
      action: () => window.location.href = '/tickets/new',
      primary: false,
    },
    {
      icon: BookOpen,
      title: t('nextSteps.documentation'),
      description: t('nextSteps.documentation'),
      action: () => window.open('/docs', '_blank'),
      primary: false,
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center gap-3">
          <div className="h-7 w-7 rounded-md bg-black"></div>
          <span className="text-lg font-semibold tracking-tight">Glavito</span>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <section className="lg:col-span-7 xl:col-span-6">
          <div className="mb-8">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-7 h-7 text-green-600" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-prose">{t('description')}</p>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{t('summary.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">{result.summary.totalTime}</div>
                  <div className="text-sm text-muted-foreground">{t('summary.totalTime', { minutes: result.summary.totalTime })}</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">{result.summary.stepsCompleted}</div>
                  <div className="text-sm text-muted-foreground">{t('summary.stepsCompleted', { completed: result.summary.stepsCompleted })}</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">{result.summary.featuresEnabled.length}</div>
                  <div className="text-sm text-muted-foreground">{t('summary.featuresEnabled')}</div>
                </div>
              </div>

              {result.summary.featuresEnabled.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium text-foreground mb-3">{t('summary.featuresEnabled')}</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.summary.featuresEnabled.map((feature, index) => (
                      <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">{feature}</span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{t('nextSteps.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {nextSteps.map((step, index) => (
                  <div key={index} className={`p-4 border rounded-lg cursor-pointer transition-colors ${step.primary ? 'border-blue-200 bg-blue-50 hover:bg-blue-100' : 'border-gray-200 hover:bg-gray-50'}`} onClick={step.action}>
                    <div className="flex items-start space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${step.primary ? 'bg-blue-100' : 'bg-gray-100'}`}>
                        <step.icon className={`w-5 h-5 ${step.primary ? 'text-blue-600' : 'text-gray-600'}`} />
                      </div>
                      <div className="flex-1">
                        <h4 className={`font-medium mb-1 ${step.primary ? 'text-blue-900' : 'text-foreground'}`}>{step.title}</h4>
                        <p className={`text-sm ${step.primary ? 'text-blue-700' : 'text-muted-foreground'}`}>{step.description}</p>
                      </div>
                      <ArrowRight className={`w-4 h-4 ${step.primary ? 'text-blue-600' : 'text-gray-400'}`} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="text-center">
            <Button size="lg" onClick={onGoToDashboard} className="px-8">
              {t('nextSteps.dashboard')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </section>

        <aside className="hidden lg:block lg:col-span-5 xl:col-span-6">
          <div className="sticky top-8 rounded-xl border bg-muted/30 p-6 h-[calc(100vh-6rem)]">
            <DashboardPreview variant="completion" />
          </div>
        </aside>
      </main>
    </div>
  );
}