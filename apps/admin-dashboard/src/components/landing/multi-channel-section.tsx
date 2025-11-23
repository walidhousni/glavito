'use client';

import { motion } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TiltCard } from '@/components/tilt-card';
import { Globe, ArrowRight, Check, MessageCircle, Instagram, Mail, Smartphone } from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export function MultiChannelSection() {
  const t = useTranslations('landing');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  return (
    <section 
      id="multi-channel" 
      className={`relative z-10 py-20 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-pink-950/20 ${isRtl ? 'dir="rtl"' : ''}`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="container mx-auto px-4">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeUp}
          transition={{ duration: 0.6 }}
          className={`text-center max-w-4xl mx-auto mb-16 ${isRtl ? 'text-right' : 'text-left'}`}
        >
          <Badge variant="outline" className="mb-4 bg-gradient-to-r from-blue-100 to-purple-100 border-blue-200 text-blue-700 dark:from-blue-950/40 dark:to-purple-950/40 dark:border-blue-800 dark:text-blue-300">
            <Globe className={`h-4 w-4 ${isRtl ? 'mr-0 ml-2' : 'mr-2'}`} />
            {t('multiChannel.badge')}
          </Badge>
          <h2 className={`text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6 ${isRtl ? 'text-right' : ''}`}>
            {t('multiChannel.title')}
          </h2>
          <p className={`text-lg md:text-xl text-gray-600 dark:text-gray-300 leading-relaxed ${isRtl ? 'text-right' : ''}`}>
            {t('multiChannel.subtitle')}
          </p>
        </motion.div>

        <div className={`grid gap-8 lg:grid-cols-2 mb-16 ${isRtl ? 'lg:grid-cols-2 lg:grid-flow-row-dense' : ''}`}>
          {/* Left Column - Channel Features */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
            className={`space-y-6 ${isRtl ? 'order-2' : 'order-1'}`}
          >
            {[
              {
                icon: MessageCircle,
                title: t('multiChannel.channels.whatsapp.title'),
                desc: t('multiChannel.channels.whatsapp.desc'),
                color: "emerald",
                features: [t('multiChannel.channels.whatsapp.features.api'), t('multiChannel.channels.whatsapp.features.templates'), t('multiChannel.channels.whatsapp.features.flows'), t('multiChannel.channels.whatsapp.features.catalogs')]
              },
              {
                icon: Instagram,
                title: t('multiChannel.channels.instagram.title'),
                desc: t('multiChannel.channels.instagram.desc'),
                color: "pink",
                features: [t('multiChannel.channels.instagram.features.stories'), t('multiChannel.channels.instagram.features.shopping'), t('multiChannel.channels.instagram.features.analytics'), t('multiChannel.channels.instagram.features.influencer')]
              },
              {
                icon: Mail,
                title: t('multiChannel.channels.email.title'),
                desc: t('multiChannel.channels.email.desc'),
                color: "blue",
                features: [t('multiChannel.channels.email.features.responsive'), t('multiChannel.channels.email.features.workflows'), t('multiChannel.channels.email.features.abTesting'), t('multiChannel.channels.email.features.deliverability')]
              },
              {
                icon: Smartphone,
                title: t('multiChannel.channels.sms.title'),
                desc: t('multiChannel.channels.sms.desc'),
                color: "orange",
                features: [t('multiChannel.channels.sms.features.library'), t('multiChannel.channels.sms.features.reports'), t('multiChannel.channels.sms.features.optOut'), t('multiChannel.channels.sms.features.optimization')]
              }
            ].map((channel, idx) => (
              <motion.div
                key={channel.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className={`group ${isRtl ? 'text-right' : 'text-left'}`}
              >
                <TiltCard className="h-full">
                  <div className={`flex items-start gap-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-${channel.color}-100 dark:bg-${channel.color}-900/30 group-hover:bg-${channel.color}-200 dark:group-hover:bg-${channel.color}-800/40 transition-colors`}>
                      <channel.icon className={`w-6 h-6 text-${channel.color}-600 dark:text-${channel.color}-400`} />
                    </div>
                    <div className="flex-1">
                      <h3 className={`text-xl font-semibold text-gray-900 dark:text-white mb-2 ${isRtl ? 'text-right' : ''}`}>{channel.title}</h3>
                      <p className={`text-gray-600 dark:text-gray-300 mb-3 ${isRtl ? 'text-right' : ''}`}>{channel.desc}</p>
                      <ul className="space-y-1">
                        {channel.features.map((feature, featureIdx) => (
                          <li key={featureIdx} className={`flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </motion.div>

          {/* Right Column - Campaign Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className={`relative ${isRtl ? 'order-1' : 'order-2'}`}
          >
            <div className={`relative rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/90 dark:bg-gray-900/90 backdrop-blur shadow-2xl overflow-hidden ${isRtl ? 'text-right' : 'text-left'}`}>
              {/* Header */}
              <div className={`flex items-center justify-between p-4 border-b border-gray-200/60 dark:border-gray-800/60 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/40 dark:to-purple-950/40 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                    <Globe className="h-5 w-5 text-white" />
                  </div>
                  <span className={`font-semibold text-gray-900 dark:text-white ${isRtl ? 'text-right' : ''}`}>{t('multiChannel.dashboard.title')}</span>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                  {t('multiChannel.dashboard.active')}
                </Badge>
              </div>

              {/* Content */}
              <div className={`p-6 space-y-4 ${isRtl ? 'text-right' : 'text-left'}`}>
                {/* Channel Performance */}
                <div className={`grid grid-cols-2 gap-4 ${isRtl ? 'grid-flow-col-dense' : ''}`}>
                  <div className={`text-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 ${isRtl ? 'text-right' : ''}`}>
                    <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">2.8K</div>
                    <div className={`text-xs text-emerald-700 dark:text-emerald-300 ${isRtl ? 'text-right' : ''}`}>{t('multiChannel.channels.whatsapp.title')}</div>
                  </div>
                  <div className={`text-center p-3 rounded-lg bg-pink-50 dark:bg-pink-950/40 ${isRtl ? 'text-right' : ''}`}>
                    <div className="text-xl font-bold text-pink-600 dark:text-pink-400">1.5K</div>
                    <div className={`text-xs text-pink-700 dark:text-pink-300 ${isRtl ? 'text-right' : ''}`}>{t('multiChannel.channels.instagram.title')}</div>
                  </div>
                  <div className={`text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 ${isRtl ? 'text-right' : ''}`}>
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">4.2K</div>
                    <div className={`text-xs text-blue-700 dark:text-blue-300 ${isRtl ? 'text-right' : ''}`}>{t('multiChannel.channels.email.title')}</div>
                  </div>
                  <div className={`text-center p-3 rounded-lg bg-orange-50 dark:bg-orange-950/40 ${isRtl ? 'text-right' : ''}`}>
                    <div className="text-xl font-bold text-orange-600 dark:text-orange-400">890</div>
                    <div className={`text-xs text-orange-700 dark:text-orange-300 ${isRtl ? 'text-right' : ''}`}>{t('multiChannel.channels.sms.title')}</div>
                  </div>
                </div>

                {/* Recent Campaigns */}
                <div className={`space-y-3 ${isRtl ? 'text-right' : 'text-left'}`}>
                  <h4 className={`font-semibold text-gray-900 dark:text-white ${isRtl ? 'text-right' : ''}`}>{t('multiChannel.dashboard.recentCampaigns')}</h4>
                  <div className="space-y-2">
                    <div className={`flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center">
                        <MessageCircle className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className={`text-sm font-medium text-gray-900 dark:text-white ${isRtl ? 'text-right' : ''}`}>{t('multiChannel.dashboard.summerSaleCampaign')}</div>
                        <div className={`text-xs text-gray-500 dark:text-gray-400 ${isRtl ? 'text-right' : ''}`}>{t('multiChannel.dashboard.summerSaleStats')}</div>
                      </div>
                      <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200">
                        {t('multiChannel.dashboard.delivered')}
                      </Badge>
                    </div>
                    <div className={`flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <div className="h-8 w-8 rounded-full bg-pink-500 flex items-center justify-center">
                        <Instagram className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className={`text-sm font-medium text-gray-900 dark:text-white ${isRtl ? 'text-right' : ''}`}>{t('multiChannel.dashboard.productLaunchStory')}</div>
                        <div className={`text-xs text-gray-500 dark:text-gray-400 ${isRtl ? 'text-right' : ''}`}>{t('multiChannel.dashboard.productLaunchStats')}</div>
                      </div>
                      <Badge variant="outline" className="text-xs text-pink-600 border-pink-200">
                        {t('multiChannel.dashboard.active')}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Elements - adjust positions for RTL if needed */}
            <div className={`absolute -top-6 -right-6 h-20 w-20 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 opacity-20 blur-xl animate-pulse ${isRtl ? 'right-6 left-auto' : ''}`}></div>
            <div className={`absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 opacity-20 blur-xl animate-pulse ${isRtl ? 'left-6 right-auto' : ''}`} style={{ animationDelay: '2s' }}></div>
          </motion.div>
        </div>

        {/* CTA Section */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeUp}
          transition={{ duration: 0.6, delay: 0.4 }}
          className={`text-center ${isRtl ? 'text-right' : 'text-left'}`}
        >
          <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4">
            {t('multiChannel.cta')}
            <ArrowRight className={`h-5 w-5 ${isRtl ? 'mr-2 ml-0 rotate-180' : 'ml-2'}`} />
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
