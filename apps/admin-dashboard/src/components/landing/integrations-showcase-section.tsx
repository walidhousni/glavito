'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { integrationIcons } from '@/lib/icons/landing-icons';
import { Badge } from '@/components/ui/badge';
import { Zap, ArrowRight, CheckCircle2 } from 'lucide-react';

interface Integration {
  name: string;
  category: string;
  icon: string;
  time: string;
  features: string[];
  color: string;
}

export function IntegrationsShowcaseSection() {
  const t = useTranslations('landing.integrations');
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const integrations: Integration[] = [
    {
      name: 'Shopify',
      category: t('categories.ecommerce'),
      icon: integrationIcons.shopify.url,
      time: '2 min',
      features: [t('features.orderSync'), t('features.customerData')],
      color: 'bg-green-500'
    },
    {
      name: 'WooCommerce',
      category: t('categories.ecommerce'),
      icon: integrationIcons.woocommerce.url,
      time: '3 min',
      features: [t('features.productCatalog'), t('features.inventory')],
      color: 'bg-purple-500'
    },
    {
      name: 'Meta Business',
      category: t('categories.channels'),
      icon: integrationIcons.meta.url,
      time: '1 min',
      features: [t('features.whatsappAPI'), t('features.messaging')],
      color: 'bg-blue-500'
    },
    {
      name: 'Stripe',
      category: t('categories.payments'),
      icon: integrationIcons.stripe.url,
      time: '2 min',
      features: [t('features.paymentTracking'), t('features.subscriptions')],
      color: 'bg-indigo-500'
    },
    {
      name: 'Salesforce',
      category: t('categories.crm'),
      icon: integrationIcons.salesforce.url,
      time: '5 min',
      features: [t('features.contactSync'), t('features.dealTracking')],
      color: 'bg-sky-500'
    },
    {
      name: 'HubSpot',
      category: t('categories.crm'),
      icon: integrationIcons.hubspot.url,
      time: '4 min',
      features: [t('features.emailMarketing'), t('features.pipelines')],
      color: 'bg-orange-500'
    },
    {
      name: 'Zendesk',
      category: t('categories.support'),
      icon: integrationIcons.zendesk.url,
      time: '3 min',
      features: [t('features.ticketSync'), t('features.knowledgeBase')],
      color: 'bg-emerald-500'
    },
    {
      name: 'Zapier',
      category: t('categories.automation'),
      icon: integrationIcons.zapier.url,
      time: '1 min',
      features: [t('features.workflows'), t('features.triggers')],
      color: 'bg-orange-600'
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut' },
    },
  } as any;

  return (
    <section
      ref={ref}
      className="py-32 px-4 bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden"
    >
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/20 via-transparent to-transparent dark:from-blue-900/20" />
      </div>

      <div className="container mx-auto max-w-7xl relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <Badge className="mb-6 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700 px-4 py-1.5 rounded-full text-sm font-medium shadow-sm">
            <Zap className="w-3.5 h-3.5 mr-2 inline-block text-amber-500" />
            {t('badge')}
          </Badge>
          <h2 className="text-4xl md:text-6xl font-bold mb-6 text-slate-900 dark:text-white tracking-tight">
            {t('title')}
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            {t('subtitle')}
          </p>
        </motion.div>

        {/* Integrations Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {integrations.map((integration, index) => (
            <motion.div
              key={integration.name}
              variants={itemVariants}
              whileHover={{ y: -8 }}
              className="group relative"
            >
              <div
                className={cn(
                  'relative overflow-hidden rounded-3xl p-6 h-full',
                  'bg-white dark:bg-slate-900',
                  'border border-slate-200 dark:border-slate-800',
                  'shadow-lg hover:shadow-2xl',
                  'transition-all duration-300',
                  'flex flex-col'
                )}
              >
                {/* Top Row: Icon & Status */}
                <div className="flex justify-between items-start mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center p-3 group-hover:scale-110 transition-transform duration-300">
                    <img
                      src={integration.icon}
                      alt={integration.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-900/20 px-2.5 py-1 rounded-full border border-green-100 dark:border-green-900/30">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase tracking-wide">
                      Active
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {integration.name}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 font-medium">
                    {integration.category}
                  </p>

                  {/* Features */}
                  <div className="space-y-2 mb-6">
                    {integration.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer: Time & Arrow */}
                <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    {t('connectsIn', { time: integration.time })}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>

                {/* Hover Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-900/10 dark:to-purple-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="text-center mt-20"
        >
          <a href="#" className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 font-semibold hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            {t('moreIntegrations')}
            <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
