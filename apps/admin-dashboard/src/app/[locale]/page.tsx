'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n.config';
import { Link } from '@/i18n.config';
import { motion } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/lib/store/auth-store';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSwitcher } from '@/components/language-switcher';
import type { Locale } from '@/i18n.config';
import { AnimatedHeadline } from '@/components/animated-headline';
import { SiteFooter } from '@/components/site-footer';
import { TiltCard } from '@/components/tilt-card';
import {
  MessageCircle,
  Mail,
  Instagram,
  Bot,
  BarChart3,
  Workflow,
  Megaphone,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export default function HomePage() {
  const router = useRouter();
  const t = useTranslations('landing');
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const locale = useLocale() as Locale;

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (!user.onboardingCompleted) {
        router.push('/onboarding');
        return;
      }
      router.push(user.role === 'admin' ? '/dashboard' : '/tickets');
    }
  }, [isAuthenticated, user, isLoading, router]);

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
    <div className="relative min-h-screen overflow-hidden bg-grid-pattern bg-gradient-to-b from-white via-blue-50/40 to-purple-50/40 dark:from-gray-950 dark:via-gray-900 dark:to-gray-900">
      {/* Animated blobs */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl animate-blob" />
      <div className="pointer-events-none absolute top-1/3 -right-24 h-72 w-72 rounded-full bg-purple-500/20 blur-3xl animate-blob" style={{ animationDelay: '1.5s' }} />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl animate-blob" style={{ animationDelay: '3s' }} />

      {/* Nav */}
      <header className="relative z-10">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600" />
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Glavito</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600 dark:text-gray-300">
            <a href="#features" className="hover:text-gray-900 dark:hover:text-white">{t('nav.features')}</a>
            <a href="#solutions" className="hover:text-gray-900 dark:hover:text-white">{t('nav.solutions')}</a>
            <a href="#pricing" className="hover:text-gray-900 dark:hover:text-white">{t('nav.pricing')}</a>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSwitcher currentLocale={locale} />
            <ThemeToggle />
            <Link href="/auth/login" className="text-sm text-gray-700 dark:text-gray-200 hover:underline">
              {t('nav.login')}
            </Link>
            <Link href="/auth/register">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                {t('nav.getStarted')}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10">
        <div className="container mx-auto px-4 pt-10 pb-16 md:pt-16 md:pb-24">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/60 bg-white/70 px-3 py-1 text-xs text-blue-700 backdrop-blur dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-200">
                <MessageCircle className="h-3.5 w-3.5" />
                <span>{t('badges.unifiedInbox')}</span>
              </div>
              <h1 className="mt-4 text-4xl md:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                {t('hero.title')}{' '}
                <AnimatedHeadline
                  className="align-middle"
                  words={[
                    t('hero.highlight'),
                    t('badges.unifiedInbox'),
                    t('features.items.automations.title'),
                    t('features.items.analytics.title'),
                  ]}
                />
              </h1>
              <p className="mt-6 text-lg md:text-xl text-gray-600 dark:text-gray-300">
                {t('hero.subtitle')}
              </p>
              <div className="mt-8 flex items-center justify-center gap-3">
                <Link href="/auth/register">
                  <Button size="lg" className="shadow-lg shadow-blue-600/20 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    {t('hero.primaryCta')}
                  </Button>
                </Link>
                <Link href="/auth/login">
                  <Button size="lg" variant="outline">
                    {t('hero.secondaryCta')}
                  </Button>
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Badge variant="secondary">{t('badges.whatsapp')}</Badge>
                <Badge variant="secondary">{t('badges.email')}</Badge>
                <Badge variant="secondary">{t('badges.instagram')}</Badge>
                <Badge variant="secondary">{t('badges.instagramDm')}</Badge>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10">
        <div className="container mx-auto px-4 pb-16 md:pb-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="text-center max-w-2xl mx-auto"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">{t('features.title')}</h2>
            <p className="mt-3 text-gray-600 dark:text-gray-300">{t('features.subtitle')}</p>
          </motion.div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: MessageCircle, title: t('features.items.multiChannel.title'), desc: t('features.items.multiChannel.desc') },
              { icon: Bot, title: t('features.items.agentAI.title'), desc: t('features.items.agentAI.desc') },
              { icon: ShieldCheck, title: t('features.items.crm.title'), desc: t('features.items.crm.desc') },
              { icon: Megaphone, title: t('features.items.marketing.title'), desc: t('features.items.marketing.desc') },
              { icon: Workflow, title: t('features.items.automations.title'), desc: t('features.items.automations.desc') },
              { icon: BarChart3, title: t('features.items.analytics.title'), desc: t('features.items.analytics.desc') },
            ].map((f, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: idx * 0.05 }}
              >
                <TiltCard className="p-0">
                  <Card className="h-full glass">
                    <CardHeader>
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-600/90 to-purple-600/90 text-white flex items-center justify-center mb-3 floating">
                        <f.icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-lg">{f.title}</CardTitle>
                      <CardDescription>{f.desc}</CardDescription>
                    </CardHeader>
                  </Card>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Solutions */}
      <section id="solutions" className="relative z-10">
        <div className="container mx-auto px-4 pb-16 md:pb-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="text-center max-w-2xl mx-auto"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">{t('solutions.title')}</h2>
            <p className="mt-3 text-gray-600 dark:text-gray-300">{t('solutions.subtitle')}</p>
          </motion.div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { icon: ShieldCheck, title: t('solutions.operations.title'), desc: t('solutions.operations.desc') },
              { icon: MessageCircle, title: t('solutions.whatsapp.title'), desc: t('solutions.whatsapp.desc') },
              { icon: Workflow, title: t('solutions.automation.title'), desc: t('solutions.automation.desc') },
            ].map((s, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: idx * 0.05 }}
              >
                <Card className="h-full border border-gray-200/60 dark:border-gray-800/60 bg-white/70 dark:bg-gray-900/60 backdrop-blur">
                  <CardHeader>
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-600/90 to-purple-600/90 text-white flex items-center justify-center mb-3">
                      <s.icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg">{s.title}</CardTitle>
                    <CardDescription>{s.desc}</CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trusted by */}
      <section className="relative z-10">
        <div className="container mx-auto px-4 pb-12 md:pb-16">
          <div className="glass rounded-xl p-4 md:p-6">
            <p className="text-center text-xs md:text-sm text-gray-500 dark:text-gray-400">
              {t('trusted.title')}
            </p>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4 opacity-80">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-8 rounded bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-700 animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section id="solutions" className="relative z-10">
        <div className="container mx-auto px-4 pb-16 md:pb-24">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6 }}
            >
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {t('integrations.title')}
              </h3>
              <p className="mt-3 text-gray-600 dark:text-gray-300">{t('integrations.subtitle')}</p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Badge className="gap-1"><MessageCircle className="h-4 w-4" /> WhatsApp</Badge>
                <Badge className="gap-1" variant="secondary"><Mail className="h-4 w-4" /> Email</Badge>
                <Badge className="gap-1"><Instagram className="h-4 w-4" /> Instagram</Badge>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6 }}
            >
              <Card className="border-0 shadow-xl shadow-blue-500/10">
                <CardContent className="p-6">
                  <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-6 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('integrations.preview')}</p>
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <div className="rounded-lg bg-blue-50 dark:bg-blue-950/40 p-4">
                        <MessageCircle className="h-6 w-6 text-blue-600 dark:text-blue-400 mx-auto" />
                        <div className="mt-2 text-xs text-blue-700 dark:text-blue-300">WhatsApp</div>
                      </div>
                      <div className="rounded-lg bg-violet-50 dark:bg-violet-950/40 p-4">
                        <Instagram className="h-6 w-6 text-violet-600 dark:text-violet-400 mx-auto" />
                        <div className="mt-2 text-xs text-violet-700 dark:text-violet-300">Instagram</div>
                      </div>
                      <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 p-4">
                        <Mail className="h-6 w-6 text-emerald-600 dark:text-emerald-400 mx-auto" />
                        <div className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">Email</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative z-10">
        <div className="container mx-auto px-4 pb-16 md:pb-24">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: t('stats.csat'), value: '4.8/5' },
              { label: t('stats.avgResponse'), value: '6m' },
              { label: t('stats.channels'), value: '7+' },
              { label: t('stats.automations'), value: '∞' },
            ].map((s) => (
              <div key={s.label} className="glass rounded-xl p-5 text-center">
                <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {s.value}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative z-10">
        <div className="container mx-auto px-4 pb-16 md:pb-24">
          <div className="grid gap-6 md:grid-cols-3">
            {(t.raw('testimonials.items') as { quote: string; role: string }[]).map((item, i) => (
              <TiltCard key={i} className="p-0">
                <div className="glass rounded-xl p-6 h-full">
                  <p className="text-sm text-gray-700 dark:text-gray-300">“{item.quote}”</p>
                  <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">{item.role}</div>
                </div>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative z-10">
        <div className="container mx-auto px-4 pb-16 md:pb-24">
          <div className="max-w-3xl mx-auto">
            <div className="space-y-4">
              {(t.raw('faq.items') as { q: string; a: string }[]).map((f, i) => (
                <div key={i} className="glass rounded-xl p-5">
                  <div className="font-medium">{f.q}</div>
                  <div className="text-sm mt-2 text-gray-600 dark:text-gray-400">{f.a}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative z-10">
        <div className="container mx-auto px-4 pb-16 md:pb-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="text-center max-w-2xl mx-auto"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">{t('pricing.title')}</h2>
            <p className="mt-3 text-gray-600 dark:text-gray-300">{t('pricing.subtitle')}</p>
          </motion.div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { tier: 'starter' },
              { tier: 'growth' },
              { tier: 'pro', featured: true },
              { tier: 'enterprise' },
            ].map(({ tier, featured }, idx) => (
              <motion.div
                key={tier}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: idx * 0.05 }}
              >
                <Card className={`h-full ${featured ? 'border-blue-300 shadow-blue-300/20 shadow-xl' : 'border-gray-200/60 dark:border-gray-800/60'} bg-white/80 dark:bg-gray-900/70 backdrop-blur`}>
                  <CardHeader>
                    <CardTitle className="flex items-baseline justify-between">
                      <span>{t(`pricing.tiers.${tier}.name`)}</span>
                      <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{t(`pricing.tiers.${tier}.price`)}</span>
                    </CardTitle>
                    <CardDescription>{t(`pricing.tiers.${tier}.desc`)}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(t.raw(`pricing.tiers.${tier}.features`) as string[]).map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                        <span>{f}</span>
                      </div>
                    ))}
                    <div className="pt-3">
                      <Link href="/auth/register">
                        <Button className={`w-full ${featured ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700' : ''}`} variant={featured ? 'default' : 'outline'}>
                          {t('pricing.cta')}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="relative z-10">
        <div className="container mx-auto px-4 pb-16 md:pb-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="text-center max-w-2xl mx-auto"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{t('steps.title')}</h2>
            <p className="mt-3 text-gray-600 dark:text-gray-300">{t('steps.subtitle')}</p>
          </motion.div>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[ 'signup', 'connect', 'automate' ].map((key, idx) => (
              <motion.div key={key}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
              >
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>{t(`steps.${key}.title`)}</CardTitle>
                    <CardDescription>{t(`steps.${key}.desc`)}</CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="relative z-10">
        <div className="container mx-auto px-4 pb-24">
          <Card className="border-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white overflow-hidden">
            <CardContent className="p-8 md:p-12 relative">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5 }}
                className="relative z-10"
              >
                <h3 className="text-2xl md:text-3xl font-bold">{t('cta.title')}</h3>
                <p className="mt-2 text-white/90">{t('cta.subtitle')}</p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link href="/auth/register">
                    <Button size="lg" className="bg-white text-blue-700 hover:bg-white/90">
                      {t('cta.primary')}
                    </Button>
                  </Link>
                  <Link href="/auth/login">
                    <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/20">
                      {t('cta.secondary')}
                    </Button>
                  </Link>
                </div>
              </motion.div>
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
              <div className="pointer-events-none absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <SiteFooter />
    </div>
  );
}