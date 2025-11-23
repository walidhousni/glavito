'use client';

import { motion } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, CheckCircle } from 'lucide-react';
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

export function CTASection() {
    const t = useTranslations('landing');
    const locale = useLocale();

    const benefits = t.raw('cta.benefits') as string[];

    const isRtl = locale === 'ar';

    return (
        <section 
            className={`relative z-10 py-24 bg-gradient-to-br from-blue-600 to-purple-600 overflow-hidden ${isRtl ? 'dir="rtl" text-right' : ''}`}
            dir={isRtl ? 'rtl' : 'ltr'}
        >
            {/* Background Elements */}
            <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
            <div className={`absolute top-0 ${isRtl ? 'right-1/4' : 'left-1/4'} w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse` } />
            <div className={`absolute bottom-0 ${isRtl ? 'left-1/4' : 'right-1/4'} w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse`} style={{ animationDelay: '2s' }} />

            <div className="container relative mx-auto px-4">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.2 }}
                    variants={staggerChildren}
                    className={`text-center max-w-4xl mx-auto ${isRtl ? 'text-right' : 'text-left'}`}
                >
                    {/* Badge */}
                    <motion.div variants={fadeUp} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur mb-8">
                        <Sparkles className="h-4 w-4" />
                        <span>{t('cta.badge')}</span> {/* Assuming badge is separate, or adjust if needed */}
                    </motion.div>

                    {/* Main Headline */}
                    <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-6 leading-tight">
                        {t('cta.title')}
                    </motion.h2>

                    {/* Subtitle */}
                    <motion.p variants={fadeUp} className="text-lg md:text-xl text-white/90 mb-12 leading-relaxed max-w-2xl mx-auto">
                        {t('cta.subtitle')}
                    </motion.p>

                    {/* Benefits */}
                    <motion.div variants={fadeUp} className={`flex flex-wrap items-center justify-center gap-6 mb-12 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        {benefits.map((benefit, idx) => (
                            <div key={idx} className={`flex items-center gap-2 text-white/90 ${isRtl ? 'flex-row-reverse' : ''}`}>
                                <CheckCircle className="h-5 w-5 text-emerald-300" />
                                <span className="text-sm font-medium">{benefit}</span>
                            </div>
                        ))}
                    </motion.div>

                    {/* CTA Buttons */}
                    <motion.div variants={fadeUp} className={`flex flex-col sm:flex-row items-center justify-center gap-4 mb-8 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <Link href="/auth/register">
                            <Button size="lg" className="bg-white text-slate-900 hover:bg-white/90 h-14 px-8 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                                {t('cta.primary')}
                                <ArrowRight className={`h-5 w-5 ${isRtl ? 'ml-0 mr-2 rotate-180' : 'ml-2'}`} />
                            </Button>
                        </Link>
                        <Link href="/auth/login">
                            <Button variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/10 h-14 px-8 text-base font-semibold backdrop-blur">
                                {t('cta.secondary')}
                            </Button>
                        </Link>
                    </motion.div>

                    {/* Trust Indicators */}
                    <motion.div variants={fadeUp} className={`text-center ${isRtl ? 'text-right' : 'text-left'}`}>
                        <p className="text-white/70 text-sm mb-4">
                            {t('cta.trustedBy')}
                        </p>
                        <div className={`flex items-center justify-center gap-8 opacity-60 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            {/* Company logos placeholder - can add RTL if needed */}
                            <div className="h-8 w-20 bg-white/20 rounded"></div>
                            <div className="h-8 w-20 bg-white/20 rounded"></div>
                            <div className="h-8 w-20 bg-white/20 rounded"></div>
                            <div className="h-8 w-20 bg-white/20 rounded"></div>
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}