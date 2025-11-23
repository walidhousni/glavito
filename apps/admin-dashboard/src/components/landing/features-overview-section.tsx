'use client';

import { motion } from 'framer-motion';
import { Link } from '@/i18n.config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, MessageSquare, Users, Workflow, Ticket, BarChart2, GitBranch } from 'lucide-react';
import { useTranslations } from 'next-intl';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5 }
  },
};

const staggerChildren = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1
    }
  }
};

interface FeatureItem {
  title: string;
  description: string;
  href: string;
  gradient: string;
  bgGradient: string;
  icon: typeof MessageSquare;
  highlights: string[];
}

export function FeaturesOverviewSection() {
  const t = useTranslations('landing');

  function toStringArray(value: unknown): string[] {
    if (Array.isArray(value)) return value as string[];
    if (typeof value === 'string') return value.length ? [value] : [];
    return [];
  }

  const features: FeatureItem[] = [
    {
      title: t('featuresOverview.items.ticketing.title'),
      description: t('featuresOverview.items.ticketing.description'),
      icon: Ticket,
      href: '/features/ticketing',
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20',
      highlights: toStringArray(t.raw('featuresOverview.items.ticketing.highlights')),
    },
    {
      title: t('featuresOverview.items.crm.title'),
      description: t('featuresOverview.items.crm.description'),
      icon: Users,
      href: '/features/crm',
      gradient: 'from-green-500 to-emerald-500',
      bgGradient: 'from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20',
      highlights: toStringArray(t.raw('featuresOverview.items.crm.highlights')),
    },
    {
      title: t('featuresOverview.items.workflows.title'),
      description: t('featuresOverview.items.workflows.description'),
      icon: GitBranch,
      href: '/features/workflows',
      gradient: 'from-purple-500 to-pink-500',
      bgGradient: 'from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20',
      highlights: toStringArray(t.raw('featuresOverview.items.workflows.highlights')),
    },
  ];

  return (
    <section className="relative z-10 py-24 bg-white dark:bg-slate-950">
      <div className="container mx-auto px-4">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeUp}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
            {t('featuresOverview.title')}
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-300 leading-relaxed">
            {t('featuresOverview.subtitle')}
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerChildren}
          className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto"
        >
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <motion.div key={idx} variants={fadeUp}>
                <Link href={feature.href}>
                  <Card className="h-full hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border-slate-200 dark:border-slate-800 group cursor-pointer overflow-hidden bg-white dark:bg-slate-900">
                    <CardHeader className="relative pb-0">
                      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${feature.bgGradient} rounded-bl-full opacity-50 transition-opacity group-hover:opacity-100`} />
                      <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${feature.bgGradient} mb-6 group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className={`w-7 h-7 text-slate-700 dark:text-white`} />
                      </div>
                      <CardTitle className="text-2xl font-bold mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {feature.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed min-h-[80px]">
                        {feature.description}
                      </p>
                      <div className="flex flex-wrap gap-2 mb-8">
                        {(feature.highlights ?? []).map((highlight, hIdx) => (
                          <span
                            key={hIdx}
                            className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                          >
                            {highlight}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {t('featuresOverview.learnMore')}
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

