'use client';

import React from 'react';

import { useTranslations } from 'next-intl';
import { Menu, Bell, Search, Layers, Sparkles, Loader2 } from 'lucide-react';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';
import { useTheme } from '@/components/theme-provider';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { searchApi } from '@/lib/api/search-client';

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const t = useTranslations();
  const tt = useTranslations('tickets');
  const locale = useLocale() as 'en' | 'ar' | 'fr';
  const { brand } = useTheme();
  const router = useRouter();
  const [q, setQ] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [results, setResults] = React.useState<{ tickets: Array<{ id: string; subject?: string }>; customers: Array<{ id: string; firstName?: string; lastName?: string; email?: string; company?: string }>; knowledge: { articles: Array<{ id: string; title: string }>; faqs: Array<{ id: string; title: string }> } } | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const debounceRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const run = async (query: string) => {
    if (!query || query.trim().length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }
    try {
      setLoading(true);
      const data = await searchApi.federated(query);
      setResults(data);
      setOpen(true);
    } catch {
      setResults(null);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const onChange = (value: string) => {
    setQ(value);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => run(value), 200);
  };

  const goTicket = (id: string) => {
    setOpen(false);
    router.push(`/${locale}/tickets/${id}`);
  };
  const goCustomer = (id: string) => {
    setOpen(false);
    router.push(`/${locale}/dashboard/customers?customerId=${id}`);
  };
  const goKnowledgeArticle = (id: string) => {
    setOpen(false);
    router.push(`/${locale}/dashboard/knowledge?articleId=${id}`);
  };
  const goKnowledgeFaq = (id: string) => {
    setOpen(false);
    router.push(`/${locale}/dashboard/knowledge?faqId=${id}`);
  };

  return (
    <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200/60 dark:border-slate-700/60 px-4 py-4 lg:px-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            onClick={onMenuToggle}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="hidden md:flex items-center gap-3 text-primary">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-sm">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              {brand?.name || 'Glavito'}
            </span>
            <span className="inline-flex items-center rounded-full bg-gradient-to-r from-blue-500/10 to-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60">
              <Sparkles className="mr-1.5 h-3 w-3" /> AI
            </span>
          </div>
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="search"
              placeholder={t('common.search')}
              className="pl-10 w-80 h-11 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-slate-200/60 dark:border-slate-700/60 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 rounded-xl shadow-sm hover:shadow-md"
              value={q}
              ref={inputRef}
              onChange={(e) => onChange(e.target.value)}
              role="combobox"
              aria-expanded={open ? 'true' : 'false'}
              aria-controls="global-search-results"
              aria-autocomplete="list"
            />
            {open && (
              <div className="absolute mt-3 w-[32rem] rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-xl" role="listbox" id="global-search-results">
                <div className="max-h-96 overflow-auto p-4 text-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 dark:text-white">{t('search.title')}</span>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin text-blue-500" /> : null}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">{t('search.tickets')}</div>
                    {results?.tickets?.length ? (
                      <div className="space-y-2">
                        {results.tickets.map((t) => (
                          <div key={t.id} className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl px-3 py-2 transition-colors duration-200" onMouseDown={() => goTicket(t.id)} role="option" aria-selected="false">
                            <div className="font-medium text-slate-900 dark:text-white">{t.subject || t.id}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-slate-500 dark:text-slate-400 text-sm">{t('search.noResults')}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">{t('search.customers')}</div>
                    {results?.customers?.length ? (
                      <div className="space-y-2">
                        {results.customers.map((c) => (
                          <div key={c.id} className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl px-3 py-2 transition-colors duration-200" onMouseDown={() => goCustomer(c.id)} role="option" aria-selected="false">
                            <div className="font-medium text-slate-900 dark:text-white">{(c.firstName || '') + ' ' + (c.lastName || '')}</div>
                            {c.email && <div className="text-xs text-slate-500 dark:text-slate-400">{c.email}</div>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-slate-500 dark:text-slate-400 text-sm">{t('search.noResults')}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">{t('search.knowledge')}</div>
                    {results?.knowledge?.articles?.length ? (
                      <div className="space-y-2">
                        {results.knowledge.articles.map((a) => (
                          <div key={a.id} className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl px-3 py-2 transition-colors duration-200" onMouseDown={() => goKnowledgeArticle(a.id)} role="option" aria-selected="false">
                            <div className="font-medium text-slate-900 dark:text-white">{a.title}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-slate-500 dark:text-slate-400 text-sm">{t('search.noResults')}</div>
                    )}
                    {results?.knowledge?.faqs?.length ? (
                      <div className="space-y-2 mt-3">
                        {results.knowledge.faqs.map((f) => (
                          <div key={f.id} className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl px-3 py-2 transition-colors duration-200" onMouseDown={() => goKnowledgeFaq(f.id)} role="option" aria-selected="false">
                            <div className="font-medium text-slate-900 dark:text-white">{f.title}</div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {brand?.logoUrl && (
            <Image src={brand.logoUrl} alt="logo" width={96} height={24} className="hidden sm:block h-7 w-auto" unoptimized />
          )}
          <Button
            variant="outline"
            size="sm"
            className="hidden md:flex items-center gap-2 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl px-4 py-2 shadow-sm hover:shadow-md transition-all duration-200"
            onClick={() => router.push(`/${locale}/dashboard/tickets?new=true`)}
          >
            <span className="text-lg font-semibold">+</span>
            {tt('createDialog.title')}
          </Button>
          <LanguageSwitcher currentLocale={locale} />
          <ThemeToggle />
          <Button variant="ghost" size="icon" className="relative hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
            <Bell className="h-5 w-5" />
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs font-bold rounded-full"
            >
              3
            </Badge>
          </Button>
        </div>
      </div>
    </header>
  );
}