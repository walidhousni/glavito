'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { 
  Sparkles, 
  Bot, 
  BarChart3,
  Zap,
  CheckCircle2,
  ArrowRight,
  MessageSquare,
  TrendingUp,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { GlavaiLogo } from '@/components/glavai/glavai-theme';
import { Link } from '@/i18n.config';

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
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.4 }
  },
};

type FeatureType = 'auto-resolve' | 'copilot' | 'insights';

export function GlavaiSection() {
  const t = useTranslations('landing.glavai');
  const [activeFeature, setActiveFeature] = useState<FeatureType>('auto-resolve');

  const toStringArray = (value: unknown): string[] => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return [value];
    return [];
  };

  const features = [
    {
      id: 'auto-resolve' as FeatureType,
      icon: Zap,
      title: t('features.autoResolve.title'),
      subtitle: t('features.autoResolve.subtitle'),
      description: t('features.autoResolve.description'),
      benefits: toStringArray(t.raw('features.autoResolve.benefits')),
      gradient: 'from-purple-500 to-blue-500',
      iconColor: 'text-purple-400',
    },
    {
      id: 'copilot' as FeatureType,
      icon: Sparkles,
      title: t('features.copilot.title'),
      subtitle: t('features.copilot.subtitle'),
      description: t('features.copilot.description'),
      benefits: toStringArray(t.raw('features.copilot.benefits')),
      gradient: 'from-blue-500 to-cyan-500',
      iconColor: 'text-blue-400',
    },
    {
      id: 'insights' as FeatureType,
      icon: BarChart3,
      title: t('features.insights.title'),
      subtitle: t('features.insights.subtitle'),
      description: t('features.insights.description'),
      benefits: toStringArray(t.raw('features.insights.benefits')),
      gradient: 'from-cyan-500 to-teal-500',
      iconColor: 'text-cyan-400',
    },
  ];

  const activeFeatureData = features.find(f => f.id === activeFeature) || features[0];
  const Icon = activeFeatureData.icon;

  return (
    <section className="relative z-10 py-24 bg-slate-950 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="container relative mx-auto px-4">
        {/* Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeUp}
          className="text-center max-w-4xl mx-auto mb-16"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <GlavaiLogo size="lg" variant="icon" />
            <Badge className="bg-white/10 hover:bg-white/20 text-white border-0 px-4 py-1.5 text-sm font-semibold backdrop-blur-sm">
              <Sparkles className="w-3 h-3 mr-1 text-purple-400" />
              {t('badge')}
            </Badge>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
            {t('title')} <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">GLAVAI</span>
          </h2>
          
          <p className="text-xl text-slate-300 leading-relaxed mb-4 max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
          
          <p className="text-lg text-slate-400">
            {t('description')}
          </p>
        </motion.div>

        {/* Feature Tabs */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerChildren}
          className="max-w-6xl mx-auto mb-12"
        >
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {features.map((feature) => {
              const FeatureIcon = feature.icon;
              const isActive = activeFeature === feature.id;
              
              return (
                <motion.button
                  key={feature.id}
                  onClick={() => setActiveFeature(feature.id)}
                  variants={scaleIn}
                  className={`
                    group flex items-center gap-3 px-6 py-4 rounded-2xl border transition-all duration-300
                    ${isActive 
                      ? 'bg-white/10 border-white/20 shadow-lg shadow-purple-500/10 backdrop-blur-md' 
                      : 'bg-transparent border-slate-800 hover:border-slate-700 hover:bg-white/5'
                    }
                  `}
                >
                  <div className={`
                    p-2 rounded-lg transition-colors
                    ${isActive ? 'bg-gradient-to-br ' + feature.gradient : 'bg-slate-800 group-hover:bg-slate-700'}
                  `}>
                    <FeatureIcon className={`
                      w-5 h-5
                      ${isActive ? 'text-white' : 'text-slate-400'}
                    `} />
                  </div>
                  <div className="text-left">
                    <div className={`font-semibold ${isActive ? 'text-white' : 'text-slate-300'}`}>
                      {feature.title}
                    </div>
                    <div className={`text-xs ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                      {feature.subtitle}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Active Feature Content */}
          <motion.div
            key={activeFeature}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="relative"
          >
            <Card className="border-0 bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden rounded-3xl">
              <CardContent className="p-0">
                <div className="grid lg:grid-cols-2 gap-0">
                  {/* Left: Content */}
                  <div className="p-8 md:p-12 lg:p-16 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-white/5">
                    <div className="inline-flex items-center gap-2 mb-6">
                      <div className={`p-2 rounded-lg bg-white/5`}>
                        <Icon className={`w-6 h-6 ${activeFeatureData.iconColor}`} />
                      </div>
                      <span className={`font-semibold text-lg ${activeFeatureData.iconColor}`}>
                        {activeFeatureData.title}
                      </span>
                    </div>
                    
                    <h3 className="text-3xl font-bold text-white mb-6">
                      {activeFeatureData.subtitle}
                    </h3>
                    
                    <p className="text-lg text-slate-300 mb-8 leading-relaxed">
                      {activeFeatureData.description}
                    </p>

                    <ul className="space-y-4 mb-10">
                      {activeFeatureData.benefits.map((benefit, idx) => (
                        <motion.li
                          key={idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="flex items-start gap-3"
                        >
                          <div className={`mt-1 p-0.5 rounded-full bg-white/10`}>
                            <CheckCircle2 className={`w-4 h-4 ${activeFeatureData.iconColor}`} />
                          </div>
                          <span className="text-slate-300">
                            {benefit}
                          </span>
                        </motion.li>
                      ))}
                    </ul>

                    <Link href="/dashboard/glavai-insights">
                      <Button 
                        size="lg"
                        className={`
                          bg-gradient-to-r ${activeFeatureData.gradient} 
                          hover:opacity-90 text-white border-0 shadow-lg shadow-purple-500/20
                          hover:shadow-purple-500/30 transition-all duration-300 rounded-full px-8
                        `}
                      >
                        {t('exploreButton', { title: activeFeatureData.title })}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>

                  {/* Right: Visual */}
                  <div className="relative bg-slate-950/50 p-8 md:p-12 lg:p-16 flex items-center justify-center overflow-hidden">
                    {/* Grid Pattern */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
                    
                    {/* Glow Effect */}
                    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r ${activeFeatureData.gradient} opacity-20 blur-[80px] rounded-full`} />

                    {/* Feature-specific visual */}
                    <div className="relative z-10 w-full max-w-md">
                      {activeFeature === 'auto-resolve' && (
                        <motion.div
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.5 }}
                          className="space-y-4"
                        >
                          <div className="flex items-center gap-4 p-4 bg-slate-900 border border-white/10 rounded-xl shadow-xl backdrop-blur-md">
                            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                              <Bot className="w-5 h-5 text-purple-400" />
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="h-2 bg-slate-700 rounded-full w-3/4" />
                              <div className="h-2 bg-slate-800 rounded-full w-1/2" />
                            </div>
                          </div>
                          <div className="flex items-center gap-4 p-4 bg-slate-900 border border-green-500/20 rounded-xl shadow-xl backdrop-blur-md translate-x-4">
                            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                              <CheckCircle2 className="w-5 h-5 text-green-400" />
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="h-2 bg-slate-700 rounded-full w-full" />
                              <div className="h-2 bg-slate-800 rounded-full w-2/3" />
                            </div>
                          </div>
                          <div className="text-center pt-4">
                            <Badge className="bg-green-500/10 text-green-400 border-green-500/20 px-3 py-1">
                              <Clock className="w-3 h-3 mr-1" />
                              {t('visuals.autoResolve.resolved')}
                            </Badge>
                          </div>
                        </motion.div>
                      )}

                      {activeFeature === 'copilot' && (
                        <motion.div
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.5 }}
                          className="space-y-4"
                        >
                          <div className="p-6 bg-slate-900 border border-white/10 rounded-xl shadow-xl backdrop-blur-md">
                            <div className="flex items-center gap-2 mb-4">
                              <Sparkles className="w-5 h-5 text-blue-400" />
                              <span className="font-semibold text-white">{t('visuals.copilot.title')}</span>
                            </div>
                            <div className="space-y-3">
                              <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                <div className="h-2 bg-blue-400/30 rounded-full w-full mb-1" />
                                <div className="h-2 bg-blue-400/20 rounded-full w-3/4" />
                              </div>
                              <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                                <div className="h-2 bg-purple-400/30 rounded-full w-full mb-1" />
                                <div className="h-2 bg-purple-400/20 rounded-full w-2/3" />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                            <MessageSquare className="w-4 h-4" />
                            <span>{t('visuals.copilot.suggestions')}</span>
                          </div>
                        </motion.div>
                      )}

                      {activeFeature === 'insights' && (
                        <motion.div
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.5 }}
                        >
                          <div className="p-6 bg-slate-900 border border-white/10 rounded-xl shadow-xl backdrop-blur-md">
                            <div className="flex items-center gap-2 mb-6">
                              <BarChart3 className="w-5 h-5 text-cyan-400" />
                              <span className="font-semibold text-white">{t('visuals.insights.title')}</span>
                            </div>
                            <div className="space-y-6">
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm text-slate-400">{t('visuals.insights.sentiment')}</span>
                                  <span className="text-sm font-semibold text-green-400">+12%</span>
                                </div>
                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: '75%' }}
                                    transition={{ duration: 1, delay: 0.3 }}
                                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                                  />
                                </div>
                              </div>
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm text-slate-400">{t('visuals.insights.autoResolves')}</span>
                                  <span className="text-sm font-semibold text-purple-400">45</span>
                                </div>
                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: '60%' }}
                                    transition={{ duration: 1, delay: 0.5 }}
                                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Stats Row */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerChildren}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-16"
        >
          {[
            { icon: Zap, label: t('stats.autoResolved'), value: '85%', color: 'text-purple-400' },
            { icon: Clock, label: t('stats.responseTime'), value: '< 2s', color: 'text-blue-400' },
            { icon: TrendingUp, label: t('stats.efficiencyGain'), value: '3x', color: 'text-cyan-400' },
          ].map((stat, idx) => {
            const StatIcon = stat.icon;
            return (
              <motion.div
                key={idx}
                variants={scaleIn}
                className="text-center p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/5 mb-4">
                  <StatIcon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-slate-400">
                  {stat.label}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

