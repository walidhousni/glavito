'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { 
  MessageSquare, 
  Bot, 
  BarChart3, 
  Zap,
  ArrowRight,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
  },
};

type Tab = 'acquisition' | 'conversion' | 'retention';

export function FeaturesTabsSection() {
  const t = useTranslations('landing.featuresTabs');
  const [activeTab, setActiveTab] = useState<Tab>('acquisition');

  const toStringArray = (value: unknown): string[] => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return [value];
    return [];
  };

  const tabs = [
    {
      id: 'acquisition' as Tab,
      label: t('tabs.acquisition.label'),
      icon: MessageSquare,
      title: t('tabs.acquisition.title'),
      subtitle: t('tabs.acquisition.subtitle'),
      features: toStringArray(t.raw('tabs.acquisition.features')),
      image: '/images/acquisition-demo.png'
    },
    {
      id: 'conversion' as Tab,
      label: t('tabs.conversion.label'),
      icon: Bot,
      title: t('tabs.conversion.title'),
      subtitle: t('tabs.conversion.subtitle'),
      features: toStringArray(t.raw('tabs.conversion.features')),
      image: '/images/conversion-demo.png'
    },
    {
      id: 'retention' as Tab,
      label: t('tabs.retention.label'),
      icon: BarChart3,
      title: t('tabs.retention.title'),
      subtitle: t('tabs.retention.subtitle'),
      features: toStringArray(t.raw('tabs.retention.features')),
      image: '/images/retention-demo.png'
    }
  ];

  const activeTabData = tabs.find(tab => tab.id === activeTab) || tabs[0];
  const Icon = activeTabData.icon;

  return (
    <section className="relative z-10 py-24 bg-white dark:bg-slate-950 overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/5 blur-3xl" />
        <div className="absolute top-[40%] -left-[10%] w-[40%] h-[40%] rounded-full bg-purple-500/5 blur-3xl" />
      </div>

      <div className="container relative mx-auto px-4">
        {/* Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeUp}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <Badge className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300">
            <Zap className="w-3 h-3 mr-1" />
            {t('badge')}
          </Badge>
          
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
            {t('title')}
          </h2>
          
          <p className="text-xl text-slate-600 dark:text-slate-300 leading-relaxed">
            {t('subtitle')}
          </p>
        </motion.div>

        {/* Tabs Navigation */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeUp}
          className="flex justify-center mb-20"
        >
          <div className="inline-flex p-1.5 bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-full border border-slate-200 dark:border-slate-800 shadow-sm">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    relative flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300
                    ${isActive 
                      ? 'text-blue-600 dark:text-blue-400 shadow-sm' 
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }
                  `}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-white dark:bg-slate-800 rounded-full"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <TabIcon className="w-4 h-4" />
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid lg:grid-cols-2 gap-16 items-center"
        >
          {/* Left - Content */}
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-full border border-blue-100 dark:border-blue-800 mb-8">
              <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">{activeTabData.label}</span>
            </div>

            <h3 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
              {activeTabData.title}
            </h3>

            <p className="text-lg text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
              {activeTabData.subtitle}
            </p>

            <ul className="space-y-4 mb-10">
              {activeTabData.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-3 group">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mt-0.5 group-hover:scale-110 transition-transform">
                    <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-slate-700 dark:text-slate-300">{feature}</span>
                </li>
              ))}
            </ul>

            <Button className="h-12 px-8 text-base font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105">
              {t('learnMore')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {/* Right - Visual/Demo */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2">
              <div className="rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 aspect-[4/3] relative group">
                {/* Abstract UI Representation */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950" />
                
                {/* Animated Elements */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="w-3/4 h-3/4 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col gap-4"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <div className="h-4 w-32 bg-slate-100 dark:bg-slate-700 rounded mb-2" />
                        <div className="h-3 w-24 bg-slate-50 dark:bg-slate-800 rounded" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="h-3 w-full bg-slate-50 dark:bg-slate-800 rounded" />
                      <div className="h-3 w-5/6 bg-slate-50 dark:bg-slate-800 rounded" />
                      <div className="h-3 w-4/6 bg-slate-50 dark:bg-slate-800 rounded" />
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Floating metric card */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="absolute -bottom-6 -left-6 p-4 rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">+45%</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">{t('conversionRate')}</div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
