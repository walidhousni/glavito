'use client';

import React from 'react';
import { Link } from '@/i18n.config';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { BookOpen } from 'lucide-react';

interface DocsSidebarProps {
  category: string;
  currentSlug?: string;
}

export function DocsSidebar({ category, currentSlug }: DocsSidebarProps) {
  const t = useTranslations('docs');

  const getCategoryArticles = () => {
    if (category === 'account-basics') {
      return [
        { slug: 'getting-started', title: t('articles.gettingStarted.title') },
        { slug: 'create-account', title: t('articles.createAccount.title') },
        { slug: 'manage-profile', title: t('articles.manageProfile.title') },
        { slug: 'update-account-settings', title: t('articles.updateAccountSettings.title') },
        { slug: 'email-verification', title: t('articles.emailVerification.title') },
        { slug: 'password-management', title: t('articles.passwordManagement.title') },
        { slug: 'sso-setup', title: t('articles.ssoSetup.title') },
        { slug: 'organization-settings', title: t('articles.organizationSettings.title') },
      ];
    }
    if (category === 'onboarding') {
      return [
        { slug: 'overview', title: t('articles.onboardingOverview.title') },
        { slug: 'tenant-admin-onboarding', title: t('articles.tenantAdminOnboarding.title') },
        { slug: 'agent-onboarding', title: t('articles.agentOnboarding.title') },
        { slug: 'pause-resume', title: t('articles.pauseResume.title') },
        { slug: 'websocket-updates', title: t('articles.websocketUpdates.title') },
        { slug: 'troubleshooting', title: t('articles.onboardingTroubleshooting.title') },
        { slug: 'best-practices', title: t('articles.onboardingBestPractices.title') },
      ];
    }
    if (category === 'ticketing') {
      return [
        { slug: 'overview', title: t('articles.ticketingOverview.title') },
        { slug: 'creating-tickets', title: t('articles.creatingTickets.title') },
        { slug: 'conversations', title: t('articles.conversations.title') },
        { slug: 'whatsapp-setup', title: t('articles.whatsappSetup.title') },
        { slug: 'instagram-setup', title: t('articles.instagramSetup.title') },
        { slug: 'sms-setup', title: t('articles.smsSetup.title') },
        { slug: 'agent-profiles', title: t('articles.agentProfiles.title') },
        { slug: 'routing-assignment', title: t('articles.routingAssignment.title') },
        { slug: 'collaboration', title: t('articles.collaboration.title') },
        { slug: 'websocket-realtime', title: t('articles.websocketRealtime.title') },
        { slug: 'ticket-lifecycle', title: t('articles.ticketLifecycle.title') },
        { slug: 'troubleshooting', title: t('articles.ticketingTroubleshooting.title') },
      ];
    }
    if (category === 'integrations') {
      return [
        { slug: 'overview', title: t('articles.integrationsOverview.title') },
        { slug: 'oauth-connection', title: t('articles.oauthConnection.title') },
        { slug: 'crm-sync', title: t('articles.crmSync.title') },
        { slug: 'field-mapping', title: t('articles.fieldMapping.title') },
        { slug: 'webhooks', title: t('articles.webhooks.title') },
        { slug: 'sync-management', title: t('articles.syncManagement.title') },
        { slug: 'salesforce', title: t('articles.salesforce.title') },
        { slug: 'hubspot', title: t('articles.hubspot.title') },
        { slug: 'shopify', title: t('articles.shopify.title') },
        { slug: 'stripe', title: t('articles.stripe.title') },
        { slug: 'troubleshooting', title: t('articles.integrationTroubleshooting.title') },
      ];
    }
    return [];
  };

  const articles = getCategoryArticles();

  return (
    <div className="sticky top-8">
      <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-slate-900 dark:text-white">
            {t('sidebar.inThisSection')}
          </h3>
        </div>
        <nav className="space-y-1">
          {articles.map((article) => {
            const href = `/docs/${category}/${article.slug}`;
            const isActive = currentSlug === article.slug;
            return (
              <Link
                key={article.slug}
                href={href}
                className={cn(
                  'block px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                )}
              >
                {article.title}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

