'use client';

import { useEffect, useState } from 'react';
import { useRouter } from '@/i18n.config';
import { useTranslations, useLocale } from 'next-intl';
import { useAuthStore } from '@/lib/store/auth-store';
import type { Locale } from '@/i18n.config';
import {
  EnhancedHeader,
  HeroSection,
  GlavaiSection,
  PricingSection,
  TestimonialsSection,
  CTASection,
  ComprehensiveFooter,
  WhatsAppChatButton,
  FeaturesOverviewSection,
  IndustryUseCasesSection,
  FeaturesTabsSection,
  IntegrationsShowcaseSection,
  InteractiveDemoSection,
  ROICalculatorSection,
} from '@/components/landing';
import { cmsClient } from '@/lib/cms/client';
import type { HomepagePayload } from '@/lib/cms/types';

export default function HomePage() {
  const router = useRouter();
  const t = useTranslations('landing');
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const locale = useLocale() as Locale;
  const [homepage, setHomepage] = useState<HomepagePayload | null>(null);
  const [cmsLoading, setCmsLoading] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && user) {
      if (!user.onboardingCompleted) {
        router.push('/onboarding');
        return;
      }
      router.push(user.role === 'admin' ? '/dashboard' : '/tickets');
      }
    }
  }, [isAuthenticated, user, isLoading, router]);

  useEffect(() => {
    let cancelled = false;
    const loadHomepage = async () => {
      setCmsLoading(true);
      try {
        const data = await cmsClient.getHomepage(locale);
        if (!cancelled) setHomepage(data);
      } catch {
        if (!cancelled) setHomepage(null);
      } finally {
        if (!cancelled) setCmsLoading(false);
      }
    };
    void loadHomepage();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
          <p className="text-lg font-medium text-gray-800 dark:text-gray-200">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-white dark:bg-slate-950">
      
      {/* Enhanced Header */}
      <EnhancedHeader locale={locale} />

      {/* Hero Section - SleekFlow Style */}
      <HeroSection />

      {/* GLAVAI Section */}
      <GlavaiSection />

      {/* Industry Use Cases Section */}
      <IndustryUseCasesSection />

      {/* Features Overview Section */}
      <FeaturesOverviewSection />

      {/* Interactive Demo Section */}
      <InteractiveDemoSection />

      {/* Features Tabs Section */}
      <FeaturesTabsSection />

      {/* Integrations Showcase Section */}
      <IntegrationsShowcaseSection />

      {/* ROI Calculator Section */}
      <ROICalculatorSection />

      {/* Testimonials Section */}
      <TestimonialsSection />

      {/* Pricing Section */}
      <PricingSection />

      {/* CTA Section */}
      <CTASection />

      {/* Comprehensive Footer */}
      <ComprehensiveFooter locale={locale} />

      {/* Floating WhatsApp Button */}
      <WhatsAppChatButton 
        phoneNumber={process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_PHONE || '1234567890'}
        message={t('whatsappChat.greeting', {
          url: typeof window !== 'undefined' ? window.location.href : 'glavito.com',
        })}
      />
    </div>
  );
}