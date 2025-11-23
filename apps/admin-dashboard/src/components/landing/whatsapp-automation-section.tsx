'use client';

import { motion } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Check, ArrowRight, Megaphone } from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export function WhatsAppAutomationSection() {
  const t = useTranslations('landing');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  return (
    <section className={`relative z-10 py-20 bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50 dark:from-emerald-950/20 dark:via-blue-950/20 dark:to-purple-950/20 ${isRtl ? 'dir="rtl"' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="container mx-auto px-4">
        <div className={`grid lg:grid-cols-2 gap-16 items-center ${isRtl ? 'lg:grid-flow-col-dense' : ''}`}>
          {/* Left Column - Content */}
          <motion.div
            initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
            className={`text-center lg:text-${isRtl ? 'right' : 'left'}`}
          >
            <Badge variant="outline" className={`mb-4 bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <MessageCircle className={`h-4 w-4 ${isRtl ? 'ml-2 mr-0' : 'mr-2'}`} />
              <span>{t('whatsappAutomation.badge')}</span>
            </Badge>
            
            <h2 className={`text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6 ${isRtl ? 'text-right' : ''}`}>
              {t('whatsappAutomation.title')}
            </h2>
            
            <p className={`text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed ${isRtl ? 'text-right' : ''}`}>
              {t('whatsappAutomation.subtitle')}
            </p>

            {/* Feature List */}
            <div className={`space-y-4 mb-8 ${isRtl ? 'text-right' : ''}`}>
              {[0,1,2].map(i => (
                <div key={i} className={`flex items-start gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <div className={`h-6 w-6 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5 ${isRtl ? 'mr-3 ml-0' : 'ml-0 mr-3'}`}>
                    <Check className="h-4 w-4" />
                  </div>
                  <div className={isRtl ? 'text-right' : ''}>
                    <h3 className={`font-semibold text-gray-900 dark:text-white ${isRtl ? 'text-right' : ''}`}>{t(`whatsappAutomation.features.${i}.title`)}</h3>
                    <p className={`text-gray-600 dark:text-gray-300 text-sm ${isRtl ? 'text-right' : ''}`}>{t(`whatsappAutomation.features.${i}.desc`)}</p>
                  </div>
                </div>
              ))}
            </div>

            <Button size="lg" className={`bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white px-8 py-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
              {t('whatsappAutomation.cta')}
              <ArrowRight className={`h-5 w-5 ${isRtl ? 'mr-2 ml-0' : 'ml-2'}`} />
            </Button>
          </motion.div>

          {/* Right Column - Visual */}
          <motion.div
            initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className={`relative ${isRtl ? 'order-first lg:order-last' : ''}`}
          >
            {/* WhatsApp Dashboard Preview */}
            <div className={`relative rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/90 dark:bg-gray-900/90 backdrop-blur shadow-2xl overflow-hidden ${isRtl ? 'text-right' : ''}`}>
              {/* Header */}
              <div className={`flex items-center justify-between p-4 border-b border-gray-200/60 dark:border-gray-800/60 bg-emerald-50 dark:bg-emerald-950/40 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <div className={`h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center ${isRtl ? 'mr-3 ml-0' : 'ml-0 mr-3'}`}>
                    <MessageCircle className="h-5 w-5 text-white" />
                  </div>
                  <span className={`font-semibold text-gray-900 dark:text-white ${isRtl ? 'text-right' : ''}`}>{t('whatsappAutomation.visual.headerTitle')}</span>
                </div>
                <Badge variant="secondary" className={`bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 ${isRtl ? 'text-left' : ''}`}>
                  {t('whatsappAutomation.visual.status')}
                </Badge>
              </div>

              {/* Content */}
              <div className={`p-6 space-y-4 ${isRtl ? 'text-right' : ''}`}>
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className={`text-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 ${isRtl ? 'text-right' : ''}`}>
                    <div className={`text-xl font-bold text-emerald-600 dark:text-emerald-400 ${isRtl ? 'text-right' : ''}`}>2,847</div>
                    <div className={`text-xs text-emerald-700 dark:text-emerald-300 ${isRtl ? 'text-right' : ''}`}>{t('whatsappAutomation.visual.stats.messagesSent')}</div>
                  </div>
                  <div className={`text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 ${isRtl ? 'text-right' : ''}`}>
                    <div className={`text-xl font-bold text-blue-600 dark:text-blue-400 ${isRtl ? 'text-right' : ''}`}>94%</div>
                    <div className={`text-xs text-blue-700 dark:text-blue-300 ${isRtl ? 'text-right' : ''}`}>{t('whatsappAutomation.visual.stats.deliveryRate')}</div>
                  </div>
                </div>

                {/* Recent Messages */}
                <div className={`space-y-3 ${isRtl ? 'text-right' : ''}`}>
                  <h4 className={`font-semibold text-gray-900 dark:text-white ${isRtl ? 'text-right' : ''}`}>{t('whatsappAutomation.visual.recentMessages')}</h4>
                  <div className="space-y-2">
                    <div className={`flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <div className={`h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center ${isRtl ? 'mr-3 ml-0' : 'ml-0 mr-3'}`}>
                        <MessageCircle className="h-4 w-4 text-white" />
                      </div>
                      <div className={`flex-1 ${isRtl ? 'text-right' : ''}`}>
                        <div className={`text-sm font-medium text-gray-900 dark:text-white ${isRtl ? 'text-right' : ''}`}>{t('whatsappAutomation.visual.messages.0.title')}</div>
                        <div className={`text-xs text-gray-500 dark:text-gray-400 ${isRtl ? 'text-right' : ''}`}>{t('whatsappAutomation.visual.messages.0.desc')}</div>
                      </div>
                      <Badge variant="outline" className={`text-xs text-emerald-600 border-emerald-200 ${isRtl ? 'text-left' : ''}`}>{t('whatsappAutomation.visual.messages.0.badge')}</Badge>
                    </div>
                    <div className={`flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <div className={`h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center ${isRtl ? 'mr-3 ml-0' : 'ml-0 mr-3'}`}>
                        <Megaphone className="h-4 w-4 text-white" />
                      </div>
                      <div className={`flex-1 ${isRtl ? 'text-right' : ''}`}>
                        <div className={`text-sm font-medium text-gray-900 dark:text-white ${isRtl ? 'text-right' : ''}`}>{t('whatsappAutomation.visual.messages.1.title')}</div>
                        <div className={`text-xs text-gray-500 dark:text-gray-400 ${isRtl ? 'text-right' : ''}`}>{t('whatsappAutomation.visual.messages.1.desc')}</div>
                      </div>
                      <Badge variant="outline" className={`text-xs text-blue-600 border-blue-200 ${isRtl ? 'text-left' : ''}`}>{t('whatsappAutomation.visual.messages.1.badge')}</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <div className={`absolute -top-6 -right-6 h-20 w-20 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 opacity-20 blur-xl animate-pulse ${isRtl ? 'right-auto left-6 -rotate-180' : ''}`}></div>
            <div className={`absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 opacity-20 blur-xl animate-pulse ${isRtl ? 'left-auto right-6 -rotate-180' : ''}`} style={{ animationDelay: '1.5s' }}></div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
