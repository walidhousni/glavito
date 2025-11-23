'use client';

import { motion } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Link2, Zap, ArrowRight, ArrowLeft } from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const staggerChildren = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

export function StepsSection() {
  const t = useTranslations('landing');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  const steps = [
    {
      icon: UserPlus,
      title: t('steps.signup.title'),
      description: t('steps.signup.desc'),
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30'
    },
    {
      icon: Link2,
      title: t('steps.connect.title'),
      description: t('steps.connect.desc'),
      gradient: 'from-purple-500 to-pink-500',
      bgGradient: 'from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30'
    },
    {
      icon: Zap,
      title: t('steps.automate.title'),
      description: t('steps.automate.desc'),
      gradient: 'from-emerald-500 to-green-500',
      bgGradient: 'from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30'
    }
  ];

  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  return (
    <section className={`relative z-10 py-24 bg-gradient-to-b from-white via-slate-50/30 to-white dark:from-slate-950 dark:via-slate-900/30 dark:to-slate-950 ${isRtl ? 'dir="rtl"' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25 dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.5))]" />
      
      <div className="container relative mx-auto px-4">
        {/* Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerChildren}
          className={`text-center max-w-3xl mx-auto mb-20 ${isRtl ? 'text-right' : 'text-left'}`}
        >
          <motion.div variants={fadeUp} className={`inline-flex items-center gap-2 rounded-full border border-emerald-200/60 bg-emerald-50/80 px-4 py-2 text-sm font-medium text-emerald-700 backdrop-blur dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300 mb-6 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <Zap className={`h-4 w-4 ${isRtl ? 'ml-2 mr-0' : 'mr-2'}`} />
            <span>{t('steps.subtitle')}</span>
          </motion.div>
          
          <motion.h2 variants={fadeUp} className={`text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6 leading-tight ${isRtl ? 'text-right' : ''}`}>
            {t('steps.title')}
          </motion.h2>
        </motion.div>

        {/* Steps */}
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={staggerChildren}
          className={`grid gap-8 md:grid-cols-3 max-w-5xl mx-auto ${isRtl ? 'md:grid-flow-row-dense' : ''}`}
        >
          {steps.map((step, idx) => {
            const IconComponent = step.icon;
            
            return (
              <motion.div
                key={step.title}
                variants={fadeUp}
                className="group relative"
              >
                <div className={`modern-card h-full p-8 text-center hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden ${isRtl ? 'text-right' : 'text-left'}`}>
                  {/* Background Gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${step.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  
                  {/* Content */}
                  <div className="relative z-10">
                    {/* Step Number */}
                    <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-sm font-semibold mb-6 ${isRtl ? 'ml-auto mr-0' : ''}`}>
                      {idx + 1}
                    </div>

                    {/* Icon */}
                    <div className={`inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${step.gradient} text-white mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg mx-auto`}>
                      <IconComponent className="h-8 w-8" />
                    </div>

                    {/* Title */}
                    <h3 className={`text-xl font-bold text-slate-900 dark:text-white mb-3 ${isRtl ? 'text-right' : ''}`}>
                      {step.title}
                    </h3>

                    {/* Description */}
                    <p className={`text-slate-600 dark:text-slate-300 leading-relaxed ${isRtl ? 'text-right' : ''}`}>
                      {step.description}
                    </p>
                  </div>

                  {/* Arrow for non-last items */}
                  {idx < steps.length - 1 && (
                    <div className={`hidden md:block absolute top-1/2 ${isRtl ? '-left-4 translate-x-1/2' : '-right-4 transform -translate-y-1/2'} z-20`}>
                      <ArrowIcon className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}