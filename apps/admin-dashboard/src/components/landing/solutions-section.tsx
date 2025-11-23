'use client';

import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { TiltCard } from '@/components/tilt-card';
import { Target, Users, MessageCircle, Workflow, Check } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export function SolutionsSection() {
  const t = useTranslations('landing');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  const solutions = [
    { 
      icon: Users, 
      key: 'operations',
      color: "blue"
    },
    { 
      icon: MessageCircle, 
      key: 'whatsapp',
      color: "emerald"
    },
    { 
      icon: Workflow, 
      key: 'automation',
      color: "purple"
    }
  ];

  return (
    <section id="solutions" className={`relative z-10 py-20 ${isRtl ? 'dir="rtl"' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="container mx-auto px-4">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeUp}
          transition={{ duration: 0.6 }}
          className={`text-center max-w-3xl mx-auto mb-16 ${isRtl ? 'text-right' : 'text-left'}`}
        >
          <Badge variant="outline" className={`mb-4 ${isRtl ? 'flex-row-reverse gap-2' : 'gap-2'}`}>
            <Target className={`h-4 w-4 ${isRtl ? 'ml-2 mr-0' : 'mr-2'}`} />
            <span>{t('solutions.badge')}</span>
          </Badge>
          <h2 className={`text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4 leading-tight ${isRtl ? 'text-right' : ''}`}>
            {t('solutions.title')}
          </h2>
          <p className={`text-lg md:text-xl text-gray-600 dark:text-gray-300 ${isRtl ? 'text-right' : ''}`}>
            {t('solutions.subtitle')}
          </p>
        </motion.div>

        <div className={`grid gap-8 md:grid-cols-3 ${isRtl ? 'md:grid-flow-row-dense' : ''}`}>
          {solutions.map((solution, idx) => {
            const IconComponent = solution.icon;
            const features = Array.from({length: 3}, (_, i) => t(`solutions.items.${solution.key}.features.${i}`));

            return (
              <motion.div
                key={solution.key}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={fadeUp}
                transition={{ duration: 0.6, delay: idx * 0.2 }}
                className="group"
              >
                <TiltCard className="h-full">
                  <div className={`h-12 w-12 rounded-xl bg-gradient-to-br from-${solution.color}-500 to-${solution.color}-600 text-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 ${isRtl ? 'ml-auto mr-0' : ''}`}>
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <h3 className={`text-xl font-bold text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors mb-2 ${isRtl ? 'text-right' : ''}`}>
                    {t(`solutions.items.${solution.key}.title`)}
                  </h3>
                  <p className={`text-gray-600 dark:text-gray-300 mb-4 ${isRtl ? 'text-right' : ''}`}>
                    {t(`solutions.items.${solution.key}.desc`)}
                  </p>
                  <ul className={`space-y-2 mb-6 ${isRtl ? 'text-right' : ''}`}>
                    {features.map((feature, i) => (
                      <li key={i} className={`flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <Check className={`h-4 w-4 text-emerald-500 flex-shrink-0 ${isRtl ? 'ml-2 mr-0' : 'mr-2'}`} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <button className={`text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm transition-colors ${isRtl ? 'text-right' : ''}`}>
                    {t('solutions.learnMore')} {isRtl ? '←' : '→'}
                  </button>
                </TiltCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
