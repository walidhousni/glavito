'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { 
  Check, 
  Sparkles, 
  MessageCircle, 
  Bot, 
  BarChart3, 
  Workflow, 
  Users, 
  ShieldCheck,
  ArrowRight,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

const iconMap = {
  MessageCircle,
  Bot,
  BarChart3,
  Workflow,
  Users,
  ShieldCheck
};

export function FeaturesSection() {
  const t = useTranslations('landing');

  const features = [
    { 
      icon: "MessageCircle", 
      title: t('features.items.multiChannelInbox.title'), 
      desc: t('features.items.multiChannelInbox.desc'),
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20",
      features: [
        t('features.items.multiChannelInbox.features.unified'), 
        t('features.items.multiChannelInbox.features.routing'), 
        t('features.items.multiChannelInbox.features.collaboration')
      ]
    },
    { 
      icon: "Bot", 
      title: t('features.items.aiAgent.title'), 
      desc: t('features.items.aiAgent.desc'),
      gradient: "from-purple-500 to-pink-500",
      bgGradient: "from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20",
      features: [
        t('features.items.aiAgent.features.autoResponses'), 
        t('features.items.aiAgent.features.sentiment'), 
        t('features.items.aiAgent.features.routing')
      ]
    },
    { 
      icon: "BarChart3", 
      title: t('features.items.analytics.title'), 
      desc: t('features.items.analytics.desc'),
      gradient: "from-emerald-500 to-green-500",
      bgGradient: "from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20",
      features: [
        t('features.items.analytics.features.metrics'), 
        t('features.items.analytics.features.reports'), 
        t('features.items.analytics.features.tracking')
      ]
    },
    { 
      icon: "Workflow", 
      title: t('features.items.automationBuilder.title'), 
      desc: t('features.items.automationBuilder.desc'),
      gradient: "from-orange-500 to-red-500",
      bgGradient: "from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20",
      features: [
        t('features.items.automationBuilder.features.visual'), 
        t('features.items.automationBuilder.features.integrations'), 
        t('features.items.automationBuilder.features.noCode')
      ]
    },
    { 
      icon: "Users", 
      title: t('features.items.teamManagement.title'), 
      desc: t('features.items.teamManagement.desc'),
      gradient: "from-indigo-500 to-purple-500",
      bgGradient: "from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20",
      features: [
        t('features.items.teamManagement.features.roles'), 
        t('features.items.teamManagement.features.performance'), 
        t('features.items.teamManagement.features.collaboration')
      ]
    },
    { 
      icon: "ShieldCheck", 
      title: t('features.items.security.title'), 
      desc: t('features.items.security.desc'),
      gradient: "from-slate-500 to-gray-600",
      bgGradient: "from-slate-50 to-gray-50 dark:from-slate-950/20 dark:to-gray-950/20",
      features: [
        t('features.items.security.features.compliant'), 
        t('features.items.security.features.encryption'), 
        t('features.items.security.features.audit')
      ]
    }
  ];

  return (
    <section id="features" className="relative z-10 py-24 bg-white dark:bg-slate-950">
      {/* Background Decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent" />
      </div>
      
      <div className="container relative mx-auto px-4">
        {/* Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerChildren}
          className="text-center max-w-4xl mx-auto mb-20"
        >
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 rounded-full border border-blue-200/60 bg-blue-50/80 px-4 py-2 text-sm font-medium text-blue-700 backdrop-blur dark:border-blue-800/40 dark:bg-blue-950/40 dark:text-blue-300 mb-6">
            <Zap className="h-4 w-4" />
            <span>{t('features.badge')}</span>
          </motion.div>
          
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
            {t('features.title')}
          </motion.h2>
          
          <motion.p variants={fadeUp} className="text-lg md:text-xl text-slate-600 dark:text-slate-300 leading-relaxed">
            {t('features.subtitle')}
          </motion.p>
        </motion.div>

        {/* Features Grid */}
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={staggerChildren}
          className="grid gap-8 md:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature, idx) => {
            const IconComponent = iconMap[feature.icon as keyof typeof iconMap];
            
            return (
              <motion.div
                key={feature.title}
                variants={fadeUp}
              >
                <Card className="h-full hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border-slate-200 dark:border-slate-800 group cursor-pointer overflow-hidden bg-white dark:bg-slate-900">
                  <CardHeader className="relative pb-0">
                    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${feature.bgGradient} rounded-bl-full opacity-50 transition-opacity group-hover:opacity-100`} />
                    <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${feature.bgGradient} mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      <IconComponent className="w-7 h-7 text-slate-700 dark:text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                      {feature.desc}
                    </p>
                    
                    <ul className="space-y-3 mb-8">
                      {feature.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm">
                          <div className="flex-shrink-0 mt-0.5 p-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                            <Check className="h-3 w-3 text-emerald-500" />
                          </div>
                          <span className="text-slate-600 dark:text-slate-400">{f}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="flex items-center text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      <span>{t('features.learnMore')}</span>
                      <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeUp}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mt-20"
        >
          <div className="inline-flex items-center gap-4 p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800 transition-colors cursor-pointer group">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Sparkles className="h-5 w-5 text-blue-500" />
              <span className="font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{t('features.bottomCta.text')}</span>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
