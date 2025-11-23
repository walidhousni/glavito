'use client';

import { motion } from 'framer-motion';
import { Link } from '@/i18n.config';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { 
  ArrowRight, 
  Sparkles,
  CheckCircle2,
  PlayCircle
} from 'lucide-react';
import { AnimatedChatBubble } from './animated-chat-bubble';

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

export function HeroSection() {
  const t = useTranslations('landing');

  return (
    <section className="relative z-10 overflow-hidden bg-white dark:bg-slate-950 pt-20 pb-16 lg:pt-32 lg:pb-24">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-blue-500/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-3xl" />
      </div>
      
      <div className="container relative mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left Column: Content */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerChildren}
            className="max-w-2xl mx-auto lg:mx-0 text-center lg:text-left"
          >
            {/* Badge */}
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 px-4 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{t('hero.badge')}</span>
            </motion.div>

            {/* Headline */}
            <motion.h1 
              variants={fadeUp}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.1] mb-6"
            >
              {t('hero.headline.part1')}{' '}
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                {t('hero.headline.convert')}
              </span>
              <br />
              {t('hero.headline.part2')}
            </motion.h1>

            {/* Subtitle */}
            <motion.p 
              variants={fadeUp}
              className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 mb-8 leading-relaxed max-w-lg mx-auto lg:mx-0"
            >
              {t('hero.subtitle')}
            </motion.p>

            {/* CTAs */}
            <motion.div 
              variants={fadeUp}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-10"
            >
              <Link href="/auth/register" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 rounded-full transition-all duration-300 hover:scale-105">
                  {t('hero.primaryCta')}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <Link href="#demo" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto h-12 px-8 text-base font-semibold border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full">
                  <PlayCircle className="h-4 w-4 mr-2" />
                  {t('hero.secondaryCta')}
                </Button>
              </Link>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-3 text-sm text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>{t('hero.trust.noCreditCard')}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>{t('hero.trust.freeTrial')}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>{t('hero.trust.cancelAnytime')}</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column: Animated Visual */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative lg:h-[600px] flex items-center justify-center"
          >
            {/* Phone/App Mockup Container */}
            <div className="relative w-full max-w-md mx-auto">
              {/* Decorative Blobs */}
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />

              {/* Main Card */}
              <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl shadow-blue-900/10 overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-md">
                      G
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white text-sm">Glavito Assistant</div>
                      <div className="text-xs text-green-500 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        Online
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                  </div>
                </div>

                {/* Chat Area */}
                <div className="p-6 bg-slate-50/50 dark:bg-slate-950/50 h-[400px] overflow-hidden flex flex-col justify-end">
                  <AnimatedChatBubble
                    message={t('hero.demo.messages.customer1')}
                    sender="customer"
                    channel="whatsapp"
                    delay={1}
                  />
                  <AnimatedChatBubble
                    message={t('hero.demo.messages.agent1')}
                    sender="agent"
                    channel="whatsapp"
                    delay={2}
                    status="read"
                  />
                  <AnimatedChatBubble
                    message={t('hero.demo.messages.customer2')}
                    sender="customer"
                    channel="instagram"
                    delay={3.5}
                  />
                  <AnimatedChatBubble
                    message="Typing..."
                    sender="agent"
                    channel="instagram"
                    delay={4.5}
                    isTyping={true}
                  />
                </div>

                {/* Input Area Mockup */}
                <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex gap-3 items-center">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="flex-1 h-10 bg-slate-50 dark:bg-slate-800 rounded-full border border-slate-100 dark:border-slate-700 px-4 flex items-center text-sm text-slate-400">
                      Type a message...
                    </div>
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Stats Cards */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5, duration: 0.5 }}
                className="absolute -right-4 top-20 bg-white dark:bg-slate-800 p-3 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">98%</div>
                  <div className="text-[10px] text-slate-500">Satisfaction</div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2, duration: 0.5 }}
                className="absolute -left-4 bottom-32 bg-white dark:bg-slate-800 p-3 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">24/7</div>
                  <div className="text-[10px] text-slate-500">AI Support</div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
