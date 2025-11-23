'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n.config';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  ArrowRight,
  User,
  Clock,
  Rocket,
  Ticket,
  Plug,
} from 'lucide-react';
import { EnhancedHeader } from '@/components/landing/enhanced-header';
import { ComprehensiveFooter } from '@/components/landing/comprehensive-footer';
import type { Locale } from '@/i18n.config';
import { DocsBreadcrumb } from '@/components/docs/docs-breadcrumb';
import { DocsSidebar } from '@/components/docs/docs-sidebar';

export default function DocsArticlePage() {
  const params = useParams();
  const locale = useLocale() as Locale;
  const t = useTranslations('docs');
  const slugParam = params?.slug;
  const slug = Array.isArray(slugParam) ? slugParam.join('/') : String(slugParam || '');

  // Determine if this is a category page or article page
  const isCategoryPage = !slug.includes('/') || slug.split('/').length === 1;
  const category = slug.split('/')[0] || '';

  // Get category data
  const getCategoryData = () => {
    const categories: Record<string, any> = {
      'account-basics': {
        title: t('categories.accountBasics.title'),
        description: t('categories.accountBasics.description'),
        icon: User,
        articles: [
          {
            slug: 'getting-started',
            title: t('articles.gettingStarted.title'),
            description: t('articles.gettingStarted.description'),
          },
          {
            slug: 'create-account',
            title: t('articles.createAccount.title'),
            description: t('articles.createAccount.description'),
          },
          {
            slug: 'manage-profile',
            title: t('articles.manageProfile.title'),
            description: t('articles.manageProfile.description'),
          },
          {
            slug: 'update-account-settings',
            title: t('articles.updateAccountSettings.title'),
            description: t('articles.updateAccountSettings.description'),
          },
          {
            slug: 'email-verification',
            title: t('articles.emailVerification.title'),
            description: t('articles.emailVerification.description'),
          },
          {
            slug: 'password-management',
            title: t('articles.passwordManagement.title'),
            description: t('articles.passwordManagement.description'),
          },
          {
            slug: 'sso-setup',
            title: t('articles.ssoSetup.title'),
            description: t('articles.ssoSetup.description'),
          },
          {
            slug: 'organization-settings',
            title: t('articles.organizationSettings.title'),
            description: t('articles.organizationSettings.description'),
          },
        ],
      },
      'onboarding': {
        title: t('categories.onboarding.title'),
        description: t('categories.onboarding.description'),
        icon: Rocket,
        articles: [
          {
            slug: 'overview',
            title: t('articles.onboardingOverview.title'),
            description: t('articles.onboardingOverview.description'),
          },
          {
            slug: 'tenant-admin-onboarding',
            title: t('articles.tenantAdminOnboarding.title'),
            description: t('articles.tenantAdminOnboarding.description'),
          },
          {
            slug: 'agent-onboarding',
            title: t('articles.agentOnboarding.title'),
            description: t('articles.agentOnboarding.description'),
          },
          {
            slug: 'pause-resume',
            title: t('articles.pauseResume.title'),
            description: t('articles.pauseResume.description'),
          },
          {
            slug: 'websocket-updates',
            title: t('articles.websocketUpdates.title'),
            description: t('articles.websocketUpdates.description'),
          },
          {
            slug: 'troubleshooting',
            title: t('articles.onboardingTroubleshooting.title'),
            description: t('articles.onboardingTroubleshooting.description'),
          },
          {
            slug: 'best-practices',
            title: t('articles.onboardingBestPractices.title'),
            description: t('articles.onboardingBestPractices.description'),
          },
        ],
      },
      'ticketing': {
        title: t('categories.ticketing.title'),
        description: t('categories.ticketing.description'),
        icon: Ticket,
        articles: [
          {
            slug: 'overview',
            title: t('articles.ticketingOverview.title'),
            description: t('articles.ticketingOverview.description'),
          },
          {
            slug: 'creating-tickets',
            title: t('articles.creatingTickets.title'),
            description: t('articles.creatingTickets.description'),
          },
          {
            slug: 'conversations',
            title: t('articles.conversations.title'),
            description: t('articles.conversations.description'),
          },
          {
            slug: 'whatsapp-setup',
            title: t('articles.whatsappSetup.title'),
            description: t('articles.whatsappSetup.description'),
          },
          {
            slug: 'instagram-setup',
            title: t('articles.instagramSetup.title'),
            description: t('articles.instagramSetup.description'),
          },
          {
            slug: 'sms-setup',
            title: t('articles.smsSetup.title'),
            description: t('articles.smsSetup.description'),
          },
          {
            slug: 'agent-profiles',
            title: t('articles.agentProfiles.title'),
            description: t('articles.agentProfiles.description'),
          },
          {
            slug: 'routing-assignment',
            title: t('articles.routingAssignment.title'),
            description: t('articles.routingAssignment.description'),
          },
          {
            slug: 'collaboration',
            title: t('articles.collaboration.title'),
            description: t('articles.collaboration.description'),
          },
          {
            slug: 'websocket-realtime',
            title: t('articles.websocketRealtime.title'),
            description: t('articles.websocketRealtime.description'),
          },
          {
            slug: 'ticket-lifecycle',
            title: t('articles.ticketLifecycle.title'),
            description: t('articles.ticketLifecycle.description'),
          },
          {
            slug: 'troubleshooting',
            title: t('articles.ticketingTroubleshooting.title'),
            description: t('articles.ticketingTroubleshooting.description'),
          },
        ],
      },
      'integrations': {
        title: t('categories.integrations.title'),
        description: t('categories.integrations.description'),
        icon: Plug,
        articles: [
          {
            slug: 'overview',
            title: t('articles.integrationsOverview.title'),
            description: t('articles.integrationsOverview.description'),
          },
          {
            slug: 'oauth-connection',
            title: t('articles.oauthConnection.title'),
            description: t('articles.oauthConnection.description'),
          },
          {
            slug: 'crm-sync',
            title: t('articles.crmSync.title'),
            description: t('articles.crmSync.description'),
          },
          {
            slug: 'field-mapping',
            title: t('articles.fieldMapping.title'),
            description: t('articles.fieldMapping.description'),
          },
          {
            slug: 'webhooks',
            title: t('articles.webhooks.title'),
            description: t('articles.webhooks.description'),
          },
          {
            slug: 'sync-management',
            title: t('articles.syncManagement.title'),
            description: t('articles.syncManagement.description'),
          },
          {
            slug: 'salesforce',
            title: t('articles.salesforce.title'),
            description: t('articles.salesforce.description'),
          },
          {
            slug: 'hubspot',
            title: t('articles.hubspot.title'),
            description: t('articles.hubspot.description'),
          },
          {
            slug: 'shopify',
            title: t('articles.shopify.title'),
            description: t('articles.shopify.description'),
          },
          {
            slug: 'stripe',
            title: t('articles.stripe.title'),
            description: t('articles.stripe.description'),
          },
          {
            slug: 'troubleshooting',
            title: t('articles.integrationTroubleshooting.title'),
            description: t('articles.integrationTroubleshooting.description'),
          },
        ],
      },
    };
    return categories[category] || null;
  };

  // Get article content
  const getArticleContent = () => {
    const articleSlug = slug.split('/')[1] || '';
    const articles: Record<string, any> = {
      'getting-started': {
        title: t('articles.gettingStarted.title'),
        content: t.raw('articles.gettingStarted.content'),
      },
      'create-account': {
        title: t('articles.createAccount.title'),
        content: t.raw('articles.createAccount.content'),
      },
      'manage-profile': {
        title: t('articles.manageProfile.title'),
        content: t.raw('articles.manageProfile.content'),
      },
      'update-account-settings': {
        title: t('articles.updateAccountSettings.title'),
        content: t.raw('articles.updateAccountSettings.content'),
      },
      'email-verification': {
        title: t('articles.emailVerification.title'),
        content: t.raw('articles.emailVerification.content'),
      },
      'password-management': {
        title: t('articles.passwordManagement.title'),
        content: t.raw('articles.passwordManagement.content'),
      },
      'sso-setup': {
        title: t('articles.ssoSetup.title'),
        content: t.raw('articles.ssoSetup.content'),
      },
      'organization-settings': {
        title: t('articles.organizationSettings.title'),
        content: t.raw('articles.organizationSettings.content'),
      },
      'overview': {
        title: t('articles.onboardingOverview.title'),
        content: t.raw('articles.onboardingOverview.content'),
      },
      'tenant-admin-onboarding': {
        title: t('articles.tenantAdminOnboarding.title'),
        content: t.raw('articles.tenantAdminOnboarding.content'),
      },
      'agent-onboarding': {
        title: t('articles.agentOnboarding.title'),
        content: t.raw('articles.agentOnboarding.content'),
      },
      'pause-resume': {
        title: t('articles.pauseResume.title'),
        content: t.raw('articles.pauseResume.content'),
      },
      'websocket-updates': {
        title: t('articles.websocketUpdates.title'),
        content: t.raw('articles.websocketUpdates.content'),
      },
      'troubleshooting': {
        title: category === 'onboarding' 
          ? t('articles.onboardingTroubleshooting.title') 
          : category === 'integrations'
          ? t('articles.integrationTroubleshooting.title')
          : t('articles.ticketingTroubleshooting.title'),
        content: category === 'onboarding' 
          ? t.raw('articles.onboardingTroubleshooting.content') 
          : category === 'integrations'
          ? t.raw('articles.integrationTroubleshooting.content')
          : t.raw('articles.ticketingTroubleshooting.content'),
      },
      'best-practices': {
        title: t('articles.onboardingBestPractices.title'),
        content: t.raw('articles.onboardingBestPractices.content'),
      },
      'ticketing-overview': {
        title: t('articles.ticketingOverview.title'),
        content: t.raw('articles.ticketingOverview.content'),
      },
      'creating-tickets': {
        title: t('articles.creatingTickets.title'),
        content: t.raw('articles.creatingTickets.content'),
      },
      'conversations': {
        title: t('articles.conversations.title'),
        content: t.raw('articles.conversations.content'),
      },
      'whatsapp-setup': {
        title: t('articles.whatsappSetup.title'),
        content: t.raw('articles.whatsappSetup.content'),
      },
      'instagram-setup': {
        title: t('articles.instagramSetup.title'),
        content: t.raw('articles.instagramSetup.content'),
      },
      'sms-setup': {
        title: t('articles.smsSetup.title'),
        content: t.raw('articles.smsSetup.content'),
      },
      'agent-profiles': {
        title: t('articles.agentProfiles.title'),
        content: t.raw('articles.agentProfiles.content'),
      },
      'routing-assignment': {
        title: t('articles.routingAssignment.title'),
        content: t.raw('articles.routingAssignment.content'),
      },
      'collaboration': {
        title: t('articles.collaboration.title'),
        content: t.raw('articles.collaboration.content'),
      },
      'websocket-realtime': {
        title: t('articles.websocketRealtime.title'),
        content: t.raw('articles.websocketRealtime.content'),
      },
      'ticket-lifecycle': {
        title: t('articles.ticketLifecycle.title'),
        content: t.raw('articles.ticketLifecycle.content'),
      },
      'integrations-overview': {
        title: t('articles.integrationsOverview.title'),
        content: t.raw('articles.integrationsOverview.content'),
      },
      'oauth-connection': {
        title: t('articles.oauthConnection.title'),
        content: t.raw('articles.oauthConnection.content'),
      },
      'crm-sync': {
        title: t('articles.crmSync.title'),
        content: t.raw('articles.crmSync.content'),
      },
      'field-mapping': {
        title: t('articles.fieldMapping.title'),
        content: t.raw('articles.fieldMapping.content'),
      },
      'webhooks': {
        title: t('articles.webhooks.title'),
        content: t.raw('articles.webhooks.content'),
      },
      'sync-management': {
        title: t('articles.syncManagement.title'),
        content: t.raw('articles.syncManagement.content'),
      },
      'salesforce': {
        title: t('articles.salesforce.title'),
        content: t.raw('articles.salesforce.content'),
      },
      'hubspot': {
        title: t('articles.hubspot.title'),
        content: t.raw('articles.hubspot.content'),
      },
      'shopify': {
        title: t('articles.shopify.title'),
        content: t.raw('articles.shopify.content'),
      },
      'stripe': {
        title: t('articles.stripe.title'),
        content: t.raw('articles.stripe.content'),
      },
    };
    
    // Handle overview article for ticketing and integrations categories
    if (category === 'ticketing' && articleSlug === 'overview') {
      return {
        title: t('articles.ticketingOverview.title'),
        content: t.raw('articles.ticketingOverview.content'),
      };
    }
    if (category === 'integrations' && articleSlug === 'overview') {
      return {
        title: t('articles.integrationsOverview.title'),
        content: t.raw('articles.integrationsOverview.content'),
      };
    }
    
    return articles[articleSlug] || null;
  };

  const categoryData = getCategoryData();
  const articleContent = !isCategoryPage ? getArticleContent() : null;

  if (isCategoryPage && categoryData) {
    // Category page
    const Icon = categoryData.icon;
  return (
      <div className="min-h-screen bg-white dark:bg-slate-950">
        <EnhancedHeader locale={locale} />
        <div className="max-w-7xl mx-auto px-6 py-8">
          <DocsBreadcrumb items={[{ label: t('breadcrumb.docs'), href: '/docs' }, { label: categoryData.title }]} />
          
          <div className="mt-8 mb-12">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Icon className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-white">{categoryData.title}</h1>
                <p className="text-lg text-slate-600 dark:text-slate-400 mt-2">{categoryData.description}</p>
              </div>
        </div>
      </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categoryData.articles.map((article: any) => (
              <Link key={article.slug} href={`/docs/${category}/${article.slug}`}>
                <Card className="h-full hover:shadow-lg transition-all duration-300 cursor-pointer group">
          <CardHeader>
                    <CardTitle className="text-lg mb-2 group-hover:text-blue-600 transition-colors">
                      {article.title}
                    </CardTitle>
                    <CardDescription>{article.description}</CardDescription>
          </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-blue-600 font-medium">
                      {t('common.readArticle')}
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
          </CardContent>
        </Card>
              </Link>
            ))}
          </div>
        </div>
        <ComprehensiveFooter locale={locale} />
      </div>
    );
  }

  if (articleContent) {
    // Article page
    const content = Array.isArray(articleContent.content) ? articleContent.content : [];
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950">
        <EnhancedHeader locale={locale} />
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex gap-8">
            {/* Sidebar */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <DocsSidebar category={category} currentSlug={slug.split('/')[1]} />
            </aside>

            {/* Main Content */}
            <main className="flex-1 max-w-4xl">
              <DocsBreadcrumb
                items={[
                  { label: t('breadcrumb.docs'), href: '/docs' },
                  { label: categoryData?.title || '', href: `/docs/${category}` },
                  { label: articleContent.title },
                ]}
              />

              <article className="mt-8">
                <div className="mb-8">
                  <Button variant="ghost" asChild className="mb-6">
                    <Link href={`/docs/${category}`}>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      {t('common.backToCategory')}
                    </Link>
                  </Button>
                  <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">{articleContent.title}</h1>
                  <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {t('common.readingTime', { minutes: 5 })}
                    </div>
                    <Badge variant="secondary">{categoryData?.title || category}</Badge>
                  </div>
                </div>

                <div className="prose prose-slate dark:prose-invert max-w-none">
                  {content.map((section: any, index: number) => (
                    <div key={index} className="mb-8">
                      {section.type === 'heading' && (
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">
                          {section.text}
                        </h2>
                      )}
                      {section.type === 'paragraph' && (
                        <p className="text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">{section.text}</p>
                      )}
                      {section.type === 'list' && (
                        <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300 mb-4">
                          {section.items?.map((item: string | { title?: string; description?: string }, itemIndex: number) => {
                            if (typeof item === 'string') {
                              return <li key={itemIndex}>{item}</li>;
                            }
                            return (
                              <li key={itemIndex} className="mb-2">
                                {item.title && <strong className="font-semibold">{item.title}: </strong>}
                                {item.description && <span>{item.description}</span>}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                      {section.type === 'steps' && (
                        <ol className="list-decimal list-inside space-y-3 text-slate-700 dark:text-slate-300 mb-4">
                          {section.items?.map((item: string, itemIndex: number) => (
                            <li key={itemIndex} className="mb-2">{item}</li>
                          ))}
                        </ol>
                      )}
                      {section.type === 'note' && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 my-4 rounded-r">
                          <p className="text-blue-900 dark:text-blue-100">{section.text}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Navigation */}
                <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex justify-between items-center">
                    <Button variant="outline" asChild>
                      <Link href={`/docs/${category}`}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        {t('common.backToCategory')}
                      </Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href="/docs">
                        {t('common.backToDocs')}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </article>
            </main>
          </div>
        </div>
        <ComprehensiveFooter locale={locale} />
      </div>
    );
  }

  // Fallback for unknown pages
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <EnhancedHeader locale={locale} />
      <div className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h1 className="text-4xl font-bold mb-4 text-slate-900 dark:text-white">{t('notFound.title')}</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8">{t('notFound.description')}</p>
        <Button asChild>
          <Link href="/docs">{t('notFound.backToDocs')}</Link>
        </Button>
      </div>
      <ComprehensiveFooter locale={locale} />
    </div>
  );
}
