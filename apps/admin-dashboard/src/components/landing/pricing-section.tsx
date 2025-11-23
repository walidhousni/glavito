'use client';

import { motion } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Star, Zap, Crown, Rocket, Building } from 'lucide-react';
import { Link } from '@/i18n.config';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const staggerChildren = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

export function PricingSection() {
  const t = useTranslations('landing');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  const tiers = [
    {
      name: t('pricing.tiers.starter.name'),
      price: t('pricing.tiers.starter.price'),
      description: t('pricing.tiers.starter.desc'),
      features: t.raw('pricing.tiers.starter.features') as string[],
      icon: Star,
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20',
      popular: false
    },
    {
      name: t('pricing.tiers.growth.name'),
      price: t('pricing.tiers.growth.price'),
      description: t('pricing.tiers.growth.desc'),
      features: t.raw('pricing.tiers.growth.features') as string[],
      icon: Rocket,
      gradient: 'from-purple-500 to-pink-500',
      bgGradient: 'from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20',
      popular: true
    },
    {
      name: t('pricing.tiers.pro.name'),
      price: t('pricing.tiers.pro.price'),
      description: t('pricing.tiers.pro.desc'),
      features: t.raw('pricing.tiers.pro.features') as string[],
      icon: Crown,
      gradient: 'from-emerald-500 to-green-500',
      bgGradient: 'from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20',
      popular: false
    },
    {
      name: t('pricing.tiers.enterprise.name'),
      price: t('pricing.tiers.enterprise.price'),
      description: t('pricing.tiers.enterprise.desc'),
      features: t.raw('pricing.tiers.enterprise.features') as string[],
      icon: Building,
      gradient: 'from-slate-500 to-gray-600',
      bgGradient: 'from-slate-50 to-gray-50 dark:from-slate-950/20 dark:to-gray-950/20',
      popular: false
    }
  ];

  return (
    <section 
      id="pricing" 
      className={`relative z-10 py-24 bg-gradient-to-b from-white via-slate-50/30 to-white dark:from-slate-950 dark:via-slate-900/30 dark:to-slate-950 ${isRtl ? 'dir="rtl"' : ''}`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Background Elements */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25 dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.5))]" />
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-emerald-500/5 rounded-full blur-3xl ${isRtl ? 'rotate-180' : ''}`} /> {/* Optional rotate for RTL if needed */}
      
      <div className="container relative mx-auto px-4">
        {/* Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerChildren}
          className={`text-center max-w-3xl mx-auto mb-20 ${isRtl ? 'text-right' : 'text-left'}`}
        >
          <motion.div variants={fadeUp} className={`inline-flex items-center gap-2 rounded-full border border-purple-200/60 bg-purple-50/80 px-4 py-2 text-sm font-medium text-purple-700 backdrop-blur dark:border-purple-800/40 dark:bg-purple-950/40 dark:text-purple-300 mb-6 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <Zap className={`h-4 w-4 ${isRtl ? 'ml-2 mr-0' : 'mr-2'}`} />
            <span>{t('pricing.badge')}</span>
          </motion.div>
          
          <motion.h2 variants={fadeUp} className={`text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6 leading-tight ${isRtl ? 'text-right' : ''}`}>
            {t('pricing.title')}
          </motion.h2>
          
          <motion.p variants={fadeUp} className={`text-lg md:text-xl text-slate-600 dark:text-slate-300 leading-relaxed ${isRtl ? 'text-right' : ''}`}>
            {t('pricing.subtitle')}
          </motion.p>
        </motion.div>

        {/* Pricing Grid */}
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={staggerChildren}
          className={`grid gap-8 md:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto ${isRtl ? 'lg:grid-flow-col-dense' : ''}`}
        >
          {tiers.map((tier, idx) => {
            const IconComponent = tier.icon;
            
            return (
              <motion.div
                key={tier.name}
                variants={fadeUp}
                className={`relative group ${tier.popular ? 'lg:scale-105' : ''} ${isRtl ? 'text-right' : 'text-left'}`}
              >
                {/* Popular Badge */}
                {tier.popular && (
                  <div className={`absolute -top-4 ${isRtl ? 'right-1/2 translate-x-1/2' : 'left-1/2 -translate-x-1/2'} z-20`}>
                    <Badge className={`bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 px-4 py-1 text-xs font-semibold ${isRtl ? 'flex-row-reverse' : ''}`}>
                      {t('pricing.mostPopular')}
                    </Badge>
                  </div>
                )}

                <div className={`modern-card h-full p-8 ${tier.popular ? 'ring-2 ring-purple-500/20 shadow-2xl' : ''} hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 overflow-hidden ${isRtl ? 'text-right' : 'text-left'}`}>
                  {/* Background Gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${tier.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  
                  {/* Content */}
                  <div className="relative z-10">
                    {/* Icon */}
                    <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${tier.gradient} text-white mb-6 group-hover:scale-110 transition-transform duration-300 ${isRtl ? 'ml-auto mr-0' : ''}`}>
                      <IconComponent className="h-6 w-6" />
                    </div>

                    {/* Plan Name */}
                    <h3 className={`text-xl font-bold text-slate-900 dark:text-white mb-2 ${isRtl ? 'text-right' : ''}`}>
                      {tier.name}
                    </h3>

                    {/* Price */}
                    <div className="mb-4">
                      <span className="text-3xl font-bold text-slate-900 dark:text-white">
                        {tier.price}
                      </span>
                      {tier.price !== t('pricing.tiers.enterprise.price') && (
                        <span className={`text-slate-500 dark:text-slate-400 ${isRtl ? 'ml-0 mr-1' : 'ml-1'}`}>{t('pricing.monthly')}</span>
                      )}
                    </div>

                    {/* Description */}
                    <p className={`text-slate-600 dark:text-slate-300 mb-6 text-sm ${isRtl ? 'text-right' : ''}`}>
                      {tier.description}
                    </p>

                    {/* CTA Button */}
                    <Link href="/auth/register" className="block mb-6">
                      <Button 
                        className={`w-full ${
                          tier.popular 
                            ? 'modern-btn-primary' 
                            : 'modern-btn-secondary'
                        }`}
                        size="lg"
                      >
                        {t('pricing.cta')}
                      </Button>
                    </Link>

                    {/* Features */}
                    <ul className={`space-y-3 ${isRtl ? 'text-right' : ''}`}>
                      {Array.isArray(tier.features) ? tier.features.map((feature, i) => (
                        <li key={i} className={`flex items-start gap-3 text-sm ${isRtl ? 'flex-row-reverse' : ''}`}>
                          <div className={`flex-shrink-0 mt-0.5 ${isRtl ? 'ml-3 mr-0' : 'mr-3'}`}>
                            <Check className="h-4 w-4 text-emerald-500" />
                          </div>
                          <span className="text-slate-600 dark:text-slate-400">{feature}</span>
                        </li>
                      )) : null}
                    </ul>
                  </div>

                  {/* Hover Effect Border */}
                  {tier.popular && (
                    <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Bottom Note */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeUp}
          transition={{ duration: 0.6, delay: 0.3 }}
          className={`text-center mt-16 ${isRtl ? 'text-right' : 'text-left'}`}
        >
          <p className={`text-slate-500 dark:text-slate-400 text-sm ${isRtl ? 'text-right' : ''}`}>
            {t('pricing.allPlansNote')}
          </p>
        </motion.div>
      </div>
    </section>
  );
}