'use client';

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n.config';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  BookOpen,
  User,
  Settings,
  Shield,
  Users,
  HelpCircle,
  ArrowRight,
  Sparkles,
  Rocket,
  Ticket,
  Plug,
} from 'lucide-react';
import { EnhancedHeader } from '@/components/landing/enhanced-header';
import { ComprehensiveFooter } from '@/components/landing/comprehensive-footer';
import type { Locale } from '@/i18n.config';

export default function DocsLandingPage() {
  const locale = useLocale() as Locale;
  const t = useTranslations('docs');

  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    {
      id: 'account-basics',
      title: t('categories.accountBasics.title'),
      description: t('categories.accountBasics.description'),
      icon: User,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      articleCount: 8,
      slug: 'account-basics',
    },
    {
      id: 'authentication',
      title: t('categories.authentication.title'),
      description: t('categories.authentication.description'),
      icon: Shield,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      articleCount: 6,
      slug: 'authentication',
    },
    {
      id: 'team-management',
      title: t('categories.teamManagement.title'),
      description: t('categories.teamManagement.description'),
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      articleCount: 10,
      slug: 'team-management',
    },
    {
      id: 'settings',
      title: t('categories.settings.title'),
      description: t('categories.settings.description'),
      icon: Settings,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
      articleCount: 12,
      slug: 'settings',
    },
    {
      id: 'onboarding',
      title: t('categories.onboarding.title'),
      description: t('categories.onboarding.description'),
      icon: Rocket,
      color: 'text-pink-600',
      bgColor: 'bg-pink-100 dark:bg-pink-900/30',
      articleCount: 7,
      slug: 'onboarding',
    },
    {
      id: 'ticketing',
      title: t('categories.ticketing.title'),
      description: t('categories.ticketing.description'),
      icon: Ticket,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      articleCount: 12,
      slug: 'ticketing',
    },
    {
      id: 'integrations',
      title: t('categories.integrations.title'),
      description: t('categories.integrations.description'),
      icon: Plug,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
      articleCount: 15,
      slug: 'integrations',
    },
  ];

  const popularArticles = [
    {
      id: 'getting-started',
      title: t('popularArticles.gettingStarted.title'),
      description: t('popularArticles.gettingStarted.description'),
      category: 'account-basics',
      slug: 'account-basics/getting-started',
    },
    {
      id: 'create-account',
      title: t('popularArticles.createAccount.title'),
      description: t('popularArticles.createAccount.description'),
      category: 'account-basics',
      slug: 'account-basics/create-account',
    },
    {
      id: 'manage-profile',
      title: t('popularArticles.manageProfile.title'),
      description: t('popularArticles.manageProfile.description'),
      category: 'account-basics',
      slug: 'account-basics/manage-profile',
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <EnhancedHeader locale={locale} />

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>

        <div className="relative max-w-7xl mx-auto px-6 py-20">
          <div className="text-center space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-5 py-2 text-sm font-medium">
              <Sparkles className="w-4 h-4 animate-pulse" />
              {t('hero.badge')}
            </div>

            {/* Title */}
            <div className="space-y-4">
              <h1 className="text-6xl font-bold tracking-tight">{t('hero.title')}</h1>
              <p className="text-xl text-blue-100 max-w-3xl mx-auto">{t('hero.subtitle')}</p>
            </div>

            {/* Search Bar */}
            <div className="max-w-3xl mx-auto">
              <div className="relative group">
                <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6 group-focus-within:text-blue-500 transition-colors" />
                <Input
                  className="pl-14 pr-6 py-6 text-lg bg-white/95 backdrop-blur-md border-0 shadow-2xl rounded-2xl focus:ring-4 focus:ring-white/50 transition-all text-slate-900"
                  placeholder={t('hero.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Categories Grid */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-slate-900 dark:text-white">{t('categories.title')}</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <Link key={category.id} href={`/docs/${category.slug}`}>
                  <Card className="h-full hover:shadow-lg transition-all duration-300 cursor-pointer group border-2 hover:border-blue-500">
                    <CardHeader>
                      <div className={`w-12 h-12 rounded-lg ${category.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                        <Icon className={`w-6 h-6 ${category.color}`} />
                      </div>
                      <CardTitle className="text-xl mb-2">{category.title}</CardTitle>
                      <CardDescription>{category.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">{category.articleCount} {t('categories.articles')}</Badge>
                        <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Popular Articles */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-slate-900 dark:text-white">{t('popularArticles.title')}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {popularArticles.map((article) => (
              <Link key={article.id} href={`/docs/${article.slug}`}>
                <Card className="h-full hover:shadow-lg transition-all duration-300 cursor-pointer group">
                  <CardHeader>
                    <CardTitle className="text-lg mb-2 group-hover:text-blue-600 transition-colors">
                      {article.title}
                    </CardTitle>
                    <CardDescription>{article.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-blue-600 font-medium">
                      {t('popularArticles.readMore')}
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <HelpCircle className="w-6 h-6 text-blue-600" />
                <CardTitle>{t('quickLinks.needHelp.title')}</CardTitle>
              </div>
              <CardDescription>{t('quickLinks.needHelp.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/help-center">{t('quickLinks.needHelp.button')}</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <BookOpen className="w-6 h-6 text-purple-600" />
                <CardTitle>{t('quickLinks.academy.title')}</CardTitle>
              </div>
              <CardDescription>{t('quickLinks.academy.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/academy">{t('quickLinks.academy.button')}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <ComprehensiveFooter locale={locale} />
    </div>
  );
}

