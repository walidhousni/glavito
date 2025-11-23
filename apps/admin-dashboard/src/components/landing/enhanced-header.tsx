'use client';

import { ChevronDown, Menu, Sparkles, MessageSquare, Users, Workflow } from 'lucide-react';
import { Link } from '@/i18n.config';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useTranslations } from 'next-intl';
import type { Locale } from '@/i18n.config';
import { Badge } from '@/components/ui/badge';
import { GlavaiLogo } from '@/components/glavai/glavai-theme';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface EnhancedHeaderProps {
  locale: Locale;
}

export function EnhancedHeader({ locale }: EnhancedHeaderProps) {
  const t = useTranslations('landing');

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-950/60">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity group">
            <GlavaiLogo size="md" variant="icon" />
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Glavito</span>
              <Badge variant="secondary" className="hidden sm:flex text-[10px] px-1.5 py-0.5 h-5 font-bold bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300">
                <Sparkles className="w-2.5 h-2.5 mr-1" />
                AI
              </Badge>
            </div>
          </Link>
            
          {/* Desktop Navigation - SleekFlow Style */}
          <nav className="hidden lg:flex items-center gap-1">
            {/* Features Dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-full hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-all">
                Features
                <ChevronDown className="h-3.5 w-3.5 opacity-50 group-hover:rotate-180 transition-transform duration-200" />
              </button>
              <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-slate-950 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 p-2 transform origin-top-left scale-95 group-hover:scale-100">
                <Link href="/features/ticketing" className="block p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors group/item">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center group-hover/item:bg-blue-100 dark:group-hover/item:bg-blue-900/40 transition-colors">
                      <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900 dark:text-white text-sm mb-0.5">Omnichannel Ticketing</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Unified support across all channels</div>
                    </div>
                  </div>
                </Link>
                <Link href="/features/crm" className="block p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors group/item">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center group-hover/item:bg-green-100 dark:group-hover/item:bg-green-900/40 transition-colors">
                      <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900 dark:text-white text-sm mb-0.5">CRM & Sales</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Lead management and sales pipelines</div>
                    </div>
                  </div>
                </Link>
                <Link href="/features/workflows" className="block p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors group/item">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center group-hover/item:bg-purple-100 dark:group-hover/item:bg-purple-900/40 transition-colors">
                      <Workflow className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900 dark:text-white text-sm mb-0.5">Workflows & Automation</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Visual workflow builder with n8n</div>
                    </div>
                  </div>
                </Link>
              </div>
            </div>

            <Link href="#pricing" className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-full hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-all">
              {t('nav.pricing')}
            </Link>

            {/* Resources Dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-full hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-all">
                {t('nav.resources')}
                <ChevronDown className="h-3.5 w-3.5 opacity-50 group-hover:rotate-180 transition-transform duration-200" />
              </button>
              <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-slate-950 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 p-2 transform origin-top-left scale-95 group-hover:scale-100">
                <Link href="/faq" className="block p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                  <div className="font-semibold text-slate-900 dark:text-white text-sm">FAQ</div>
                </Link>
                <Link href="/docs" className="block p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                  <div className="font-semibold text-slate-900 dark:text-white text-sm">Documentation</div>
                </Link>
                <Link href="/academy" className="block p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                  <div className="font-semibold text-slate-900 dark:text-white text-sm">Academy</div>
                </Link>
              </div>
            </div>
          </nav>

          {/* Right Side Actions - Simplified */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher currentLocale={locale} />
            
            <div className="hidden md:flex items-center gap-3">
              <Link href="/auth/login" className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
                {t('nav.login')}
              </Link>
              <Link href="/auth/register">
                <Button className="h-10 px-6 text-sm font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105">
                  {t('nav.getStarted')}
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <Sheet>
              <SheetTrigger asChild>
                <button className="lg:hidden p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <Menu className="h-5 w-5 text-slate-700 dark:text-slate-200" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:w-80 p-0">
                <div className="flex flex-col h-full bg-white dark:bg-slate-950">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <GlavaiLogo size="sm" variant="icon" />
                      <span className="text-lg font-bold text-slate-900 dark:text-white">Glavito</span>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="flex flex-col gap-6">
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Features</h4>
                        <Link href="/features/ticketing" className="block text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium">Omnichannel Ticketing</Link>
                        <Link href="/features/crm" className="block text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium">CRM & Sales</Link>
                        <Link href="/features/workflows" className="block text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium">Workflows & Automation</Link>
                      </div>
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Resources</h4>
                        <Link href="/faq" className="block text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium">FAQ</Link>
                        <Link href="/docs" className="block text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium">Documentation</Link>
                        <Link href="/academy" className="block text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium">Academy</Link>
                      </div>
                      <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                        <Link href="/auth/login" className="block w-full py-3 text-center font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white mb-3">
                          {t('nav.login')}
                        </Link>
                        <Link href="/auth/register">
                          <Button className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg">
                            {t('nav.getStarted')}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
