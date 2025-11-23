'use client';

import { MessageCircle, Download } from 'lucide-react';
import { Link } from '@/i18n.config';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useTranslations } from 'next-intl';
import type { Locale } from '@/i18n.config';

interface ComprehensiveFooterProps {
  locale: Locale;
}

export function ComprehensiveFooter({ locale }: ComprehensiveFooterProps) {
  const t = useTranslations('landing');

  return (
    <footer className="relative z-10 bg-slate-950 text-white overflow-hidden">
      <div className="container mx-auto px-4 py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Company Info */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Glavito</span>
            </div>
            <p className="text-gray-400 mb-6 leading-relaxed">
              {t('footer.tagline')}
            </p>
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                {t('footer.metaPartner')}
              </Badge>
            </div>
            
            {/* Mobile App Download */}
            <div className="space-y-3">
              <h4 className="font-semibold text-white">{t('footer.downloadApp')}</h4>
              <div className="flex gap-3">
                <a href="#" className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
                  <div className="w-5 h-5 bg-gradient-to-r from-blue-500 to-purple-500 rounded flex items-center justify-center">
                    <Download className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-sm">{t('footer.getOnAppStore')}</span>
                </a>
                <a href="#" className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
                  <div className="w-5 h-5 bg-gradient-to-r from-green-500 to-emerald-500 rounded flex items-center justify-center">
                    <Download className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-sm">{t('footer.getOnGooglePlay')}</span>
                </a>
              </div>
            </div>
          </div>

          {/* Products */}
          <div>
            <h3 className="font-semibold text-white mb-4">{t('footer.products.title')}</h3>
            <ul className="space-y-3">
              <li><Link href="/products/team-management" className="text-gray-400 hover:text-white transition-colors">{t('footer.products.teamManagement')}</Link></li>
              <li><Link href="/products/whatsapp-automation" className="text-gray-400 hover:text-white transition-colors">{t('footer.products.whatsappAutomation')}</Link></li>
              <li><Link href="/products/integrations" className="text-gray-400 hover:text-white transition-colors">{t('footer.products.integrations')}</Link></li>
              <li><Link href="/products/ai-agent" className="text-gray-400 hover:text-white transition-colors">{t('footer.products.aiAgent')}</Link></li>
              <li><Link href="/products/call-center" className="text-gray-400 hover:text-white transition-colors">{t('footer.products.callCenter')}</Link></li>
            </ul>
          </div>

          {/* Glavito vs Competitors */}
          <div>
            <h3 className="font-semibold text-white mb-4">{t('footer.glavitoVsCompetitors.title')}</h3>
            <ul className="space-y-3">
              <li><Link href="/comparison/manychat" className="text-gray-400 hover:text-white transition-colors">{t('footer.glavitoVsCompetitors.vsManyChat')}</Link></li>
              <li><Link href="/comparison/wati" className="text-gray-400 hover:text-white transition-colors">{t('footer.glavitoVsCompetitors.vsWati')}</Link></li>
              <li><Link href="/comparison/aisensy" className="text-gray-400 hover:text-white transition-colors">{t('footer.glavitoVsCompetitors.vsAiSensy')}</Link></li>
              <li><Link href="/comparison/callbell" className="text-gray-400 hover:text-white transition-colors">{t('footer.glavitoVsCompetitors.vsCallbell')}</Link></li>
              <li><Link href="/comparison/interakt" className="text-gray-400 hover:text-white transition-colors">{t('footer.glavitoVsCompetitors.vsInterakt')}</Link></li>
              <li><Link href="/comparison/360dialog" className="text-gray-400 hover:text-white transition-colors">{t('footer.glavitoVsCompetitors.vs360Dialog')}</Link></li>
              <li><Link href="/comparison/respond-io" className="text-gray-400 hover:text-white transition-colors">{t('footer.glavitoVsCompetitors.vsRespondIo')}</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold text-white mb-4">{t('footer.resources.title')}</h3>
            <ul className="space-y-3 mb-6">
              <li><Link href="/blog" className="text-gray-400 hover:text-white transition-colors">{t('footer.resources.blog')}</Link></li>
              <li><Link href="/academy" className="text-gray-400 hover:text-white transition-colors">{t('footer.resources.academy')}</Link></li>
              <li><Link href="/affiliates" className="text-gray-400 hover:text-white transition-colors">{t('footer.resources.affiliates')}</Link></li>
              <li><Link href="/help" className="text-gray-400 hover:text-white transition-colors">{t('footer.resources.helpCenter')}</Link></li>
              <li><Link href="/developers" className="text-gray-400 hover:text-white transition-colors">{t('footer.resources.developers')}</Link></li>
              <li><Link href="/build-in-public" className="text-gray-400 hover:text-white transition-colors">{t('footer.resources.buildInPublic')}</Link></li>
              <li><Link href="/join-us" className="text-gray-400 hover:text-white transition-colors">{t('footer.resources.joinUs')}</Link></li>
              <li><Link href="/contact" className="text-gray-400 hover:text-white transition-colors">{t('footer.resources.contact')}</Link></li>
            </ul>

            {/* Company */}
            <h3 className="font-semibold text-white mb-4">{t('footer.company.title')}</h3>
            <ul className="space-y-3">
              <li><Link href="/about" className="text-gray-400 hover:text-white transition-colors">{t('footer.company.about')}</Link></li>
              <li><Link href="/careers" className="text-gray-400 hover:text-white transition-colors">{t('footer.company.careers')}</Link></li>
              <li><Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">{t('footer.company.privacy')}</Link></li>
              <li><Link href="/terms" className="text-gray-400 hover:text-white transition-colors">{t('footer.company.terms')}</Link></li>
              <li><Link href="/refund" className="text-gray-400 hover:text-white transition-colors">{t('footer.company.refund')}</Link></li>
            </ul>
          </div>
        </div>

        {/* Contact Information */}
        <div className="border-t border-gray-800 pt-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold text-white mb-2">{t('footer.contact.addressLabel')}</h4>
              <p className="text-gray-400 text-sm">{t('footer.contact.address')}</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">{t('footer.contact.generalInquiries')}</h4>
              <p className="text-gray-400 text-sm">{t('footer.contact.phone')}</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">{t('footer.contact.technicalSupport')}</h4>
              <p className="text-gray-400 text-sm">{t('footer.contact.supportPhone')}</p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-400 text-sm">{t('footer.copyright')}</p>
          <div className="flex items-center gap-6">
            <LanguageSwitcher currentLocale={locale} />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </footer>
  );
}
