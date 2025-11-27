'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { AnimatedChatBubble } from './animated-chat-bubble';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  ShoppingBag, 
  Car, 
  HeartPulse, 
  Home, 
  Coffee, 
  Check, 
  ArrowRight 
} from 'lucide-react';

type Industry = 'ecommerce' | 'automotive' | 'healthcare' | 'realEstate' | 'hospitality';

interface UseCase {
  title: string;
  description: string;
  demo: {
    customer: string;
    agent: string;
  }[];
}

export function IndustryUseCasesSection() {
  const t = useTranslations('landing.useCases');
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const [selectedIndustry, setSelectedIndustry] = useState<Industry | null>(null);

  const industries: { key: Industry; icon: any; color: string; bgGradient: string }[] = [
    { 
      key: 'ecommerce', 
      icon: ShoppingBag, 
      color: 'text-blue-500', 
      bgGradient: 'from-blue-500/10 to-cyan-500/10' 
    },
    { 
      key: 'automotive', 
      icon: Car, 
      color: 'text-orange-500', 
      bgGradient: 'from-orange-500/10 to-red-500/10' 
    },
    { 
      key: 'healthcare', 
      icon: HeartPulse, 
      color: 'text-emerald-500', 
      bgGradient: 'from-emerald-500/10 to-green-500/10' 
    },
    { 
      key: 'realEstate', 
      icon: Home, 
      color: 'text-purple-500', 
      bgGradient: 'from-purple-500/10 to-pink-500/10' 
    },
    { 
      key: 'hospitality', 
      icon: Coffee, 
      color: 'text-yellow-500', 
      bgGradient: 'from-yellow-500/10 to-orange-500/10' 
    },
  ];

  const useCases: Record<Industry, UseCase[]> = {
    ecommerce: [
      {
        title: t('ecommerce.case1.title'),
        description: t('ecommerce.case1.description'),
        demo: [
          { customer: t('ecommerce.case1.demo.customer1'), agent: '' },
          { customer: '', agent: t('ecommerce.case1.demo.agent1') },
        ],
      },
      {
        title: t('ecommerce.case2.title'),
        description: t('ecommerce.case2.description'),
        demo: [
          { customer: '', agent: t('ecommerce.case2.demo.agent1') },
          { customer: t('ecommerce.case2.demo.customer1'), agent: '' },
        ],
      },
      {
        title: t('ecommerce.case3.title'),
        description: t('ecommerce.case3.description'),
        demo: [
          { customer: t('ecommerce.case3.demo.customer1'), agent: '' },
          { customer: '', agent: t('ecommerce.case3.demo.agent1') },
        ],
      },
    ],
    automotive: [
      {
        title: t('automotive.case1.title'),
        description: t('automotive.case1.description'),
        demo: [
          { customer: '', agent: t('automotive.case1.demo.agent1') },
          { customer: t('automotive.case1.demo.customer1'), agent: '' },
        ],
      },
      {
        title: t('automotive.case2.title'),
        description: t('automotive.case2.description'),
        demo: [
          { customer: t('automotive.case2.demo.customer1'), agent: '' },
          { customer: '', agent: t('automotive.case2.demo.agent1') },
        ],
      },
      {
        title: t('automotive.case3.title'),
        description: t('automotive.case3.description'),
        demo: [
          { customer: '', agent: t('automotive.case3.demo.agent1') },
        ],
      },
    ],
    healthcare: [
      {
        title: t('healthcare.case1.title'),
        description: t('healthcare.case1.description'),
        demo: [
          { customer: '', agent: t('healthcare.case1.demo.agent1') },
          { customer: t('healthcare.case1.demo.customer1'), agent: '' },
        ],
      },
      {
        title: t('healthcare.case2.title'),
        description: t('healthcare.case2.description'),
        demo: [
          { customer: t('healthcare.case2.demo.customer1'), agent: '' },
          { customer: '', agent: t('healthcare.case2.demo.agent1') },
        ],
      },
      {
        title: t('healthcare.case3.title'),
        description: t('healthcare.case3.description'),
        demo: [
          { customer: '', agent: t('healthcare.case3.demo.agent1') },
        ],
      },
    ],
    realEstate: [
      {
        title: t('realEstate.case1.title'),
        description: t('realEstate.case1.description'),
        demo: [
          { customer: t('realEstate.case1.demo.customer1'), agent: '' },
          { customer: '', agent: t('realEstate.case1.demo.agent1') },
        ],
      },
      {
        title: t('realEstate.case2.title'),
        description: t('realEstate.case2.description'),
        demo: [
          { customer: '', agent: t('realEstate.case2.demo.agent1') },
        ],
      },
      {
        title: t('realEstate.case3.title'),
        description: t('realEstate.case3.description'),
        demo: [
          { customer: t('realEstate.case3.demo.customer1'), agent: '' },
          { customer: '', agent: t('realEstate.case3.demo.agent1') },
        ],
      },
    ],
    hospitality: [
      {
        title: t('hospitality.case1.title'),
        description: t('hospitality.case1.description'),
        demo: [
          { customer: '', agent: t('hospitality.case1.demo.agent1') },
          { customer: t('hospitality.case1.demo.customer1'), agent: '' },
        ],
      },
      {
        title: t('hospitality.case2.title'),
        description: t('hospitality.case2.description'),
        demo: [
          { customer: t('hospitality.case2.demo.customer1'), agent: '' },
          { customer: '', agent: t('hospitality.case2.demo.agent1') },
        ],
      },
      {
        title: t('hospitality.case3.title'),
        description: t('hospitality.case3.description'),
        demo: [
          { customer: '', agent: t('hospitality.case3.demo.agent1') },
        ],
      },
    ],
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut' },
    },
  } as any;

  return (
    <section
      ref={ref}
      className="py-24 px-4 bg-slate-50 dark:bg-slate-900/50"
    >
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900 dark:text-white">
            {t('title')}
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </motion.div>

        {/* Industry Cards Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {industries.map((industry) => {
            const Icon = industry.icon;
            return (
              <motion.div
                key={industry.key}
                variants={itemVariants}
                whileHover={{ y: -5 }}
                className="group relative"
              >
                <div
                  className={cn(
                    'relative overflow-hidden rounded-2xl p-8 bg-white dark:bg-slate-950',
                    'border border-slate-200 dark:border-slate-800',
                    'shadow-lg hover:shadow-2xl transition-all duration-300',
                    'cursor-pointer h-full flex flex-col'
                  )}
                  onClick={() => setSelectedIndustry(industry.key)}
                >
                  {/* Background gradient on hover */}
                  <div
                    className={cn(
                      'absolute inset-0 opacity-0 group-hover:opacity-100',
                      'bg-gradient-to-br transition-opacity duration-500',
                      industry.bgGradient
                    )}
                  />

                  {/* Icon */}
                  <div className={cn(
                    "relative z-10 mb-6 w-14 h-14 rounded-xl flex items-center justify-center bg-slate-50 dark:bg-slate-900 group-hover:scale-110 transition-transform duration-300",
                    industry.color
                  )}>
                    <Icon className="w-7 h-7" />
                  </div>

                  {/* Title */}
                  <h3 className="relative z-10 text-xl font-bold mb-4 text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {t(`${industry.key}.title`)}
                  </h3>

                  {/* Use cases list */}
                  <ul className="relative z-10 space-y-3 mb-8 flex-1">
                    {useCases[industry.key].slice(0, 3).map((useCase, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400">
                        <div className="flex-shrink-0 mt-0.5">
                          <Check className="w-4 h-4 text-green-500" />
                        </div>
                        <span>{useCase.title}</span>
                      </li>
                    ))}
                  </ul>

                  {/* View Demo Button */}
                  <div className="relative z-10 flex items-center text-sm font-semibold text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mt-auto">
                    {t('viewDemo')}
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Demo Dialog */}
        <Dialog open={!!selectedIndustry} onOpenChange={() => setSelectedIndustry(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-3 text-slate-900 dark:text-white">
                {selectedIndustry && (
                  <>
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-900",
                      industries.find((i) => i.key === selectedIndustry)?.color
                    )}>
                      {(() => {
                        const Icon = industries.find((i) => i.key === selectedIndustry)?.icon;
                        return Icon ? <Icon className="w-6 h-6" /> : null;
                      })()}
                    </div>
                    {t(`${selectedIndustry}.title`)}
                  </>
                )}
              </DialogTitle>
            </DialogHeader>

            {selectedIndustry && (
              <div className="space-y-8 py-6">
                {useCases[selectedIndustry].map((useCase, idx) => (
                  <div key={idx} className="border-b border-slate-100 dark:border-slate-800 last:border-0 pb-8 last:pb-0">
                    <h4 className="text-lg font-semibold mb-2 text-slate-900 dark:text-white">{useCase.title}</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                      {useCase.description}
                    </p>

                    {/* Chat Demo */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-800">
                      {useCase.demo.map((msg, msgIdx) => (
                        <div key={msgIdx}>
                          {msg.customer && (
                            <AnimatedChatBubble
                              message={msg.customer}
                              sender="customer"
                              channel="whatsapp"
                              delay={msgIdx * 0.5}
                            />
                          )}
                          {msg.agent && (
                            <AnimatedChatBubble
                              message={msg.agent}
                              sender="agent"
                              channel="whatsapp"
                              delay={msgIdx * 0.5 + 0.3}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}
