'use client';

import { motion } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Star, Quote, Users } from 'lucide-react';

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

export function TestimonialsSection() {
  const t = useTranslations('landing');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  const testimonials = [
    {
      quote: t('testimonials.items.0.quote'),
      author: "Sarah Johnson",
      role: t('testimonials.items.0.role'),
      company: "TechFlow Inc.",
      avatar: "SJ",
      rating: 5
    },
    {
      quote: t('testimonials.items.1.quote'),
      author: "Michael Chen",
      role: t('testimonials.items.1.role'),
      company: "CloudScale",
      avatar: "MC",
      rating: 5
    },
    {
      quote: t('testimonials.items.2.quote'),
      author: "Emily Rodriguez",
      role: t('testimonials.items.2.role'),
      company: "RetailMax",
      avatar: "ER",
      rating: 5
    }
  ];

  return (
    <section className={`relative z-10 py-24 bg-gradient-to-b from-slate-50/50 via-white to-slate-50/50 dark:from-slate-900/50 dark:via-slate-950 dark:to-slate-900/50 ${isRtl ? 'dir="rtl"' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
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
            <Users className={`h-4 w-4 ${isRtl ? 'ml-2 mr-0' : 'mr-2'}`} />
            <span>{t('trusted.title')}</span>
          </motion.div>
          
          <motion.h2 variants={fadeUp} className={`text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6 leading-tight ${isRtl ? 'text-right' : ''}`}>
            {t('testimonials.title')}
          </motion.h2>
          
          <motion.p variants={fadeUp} className={`text-lg md:text-xl text-slate-600 dark:text-slate-300 leading-relaxed ${isRtl ? 'text-right' : ''}`}>
            {t('testimonials.subtitle')}
          </motion.p>
        </motion.div>

        {/* Testimonials Grid */}
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={staggerChildren}
          className={`grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto ${isRtl ? 'md:grid-flow-row-dense' : ''}`}
        >
          {testimonials.map((testimonial, idx) => (
            <motion.div
              key={testimonial.author}
              variants={fadeUp}
              className="group"
            >
              <div className={`modern-card h-full p-8 hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 relative overflow-hidden ${isRtl ? 'text-right' : 'text-left'}`}>
                {/* Quote Icon */}
                <div className={`absolute top-6 ${isRtl ? 'left-6 right-auto' : 'right-6'} opacity-10 group-hover:opacity-20 transition-opacity`}>
                  <Quote className="h-12 w-12 text-slate-400" />
                </div>
                
                {/* Rating */}
                <div className={`flex items-center gap-1 mb-4 ${isRtl ? 'flex-row-reverse justify-end' : 'justify-start'}`}>
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>

                {/* Quote */}
                <blockquote className={`text-slate-700 dark:text-slate-300 mb-6 leading-relaxed relative z-10 ${isRtl ? 'text-right' : ''}`}>
                  "{testimonial.quote}"
                </blockquote>

                {/* Author */}
                <div className={`flex items-center gap-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <div className={`h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm ${isRtl ? 'ml-4 mr-0' : 'mr-4'}`}>
                    {testimonial.avatar}
                  </div>
                  <div className={`${isRtl ? 'text-right' : 'text-left'}`}>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {testimonial.author}
                    </div>
                    <div className={`text-sm text-slate-500 dark:text-slate-400 ${isRtl ? 'text-right' : ''}`}>
                      {testimonial.role} at {testimonial.company}
                    </div>
                  </div>
                </div>

                {/* Hover Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Stats */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerChildren}
          className={`mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto ${isRtl ? 'text-right' : 'text-left'}`}
        >
          <motion.div variants={fadeUp} className="text-center">
            <div className={`text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2 ${isRtl ? 'text-right' : ''}`}>
              10,000+
            </div>
            <div className={`text-slate-600 dark:text-slate-400 text-sm ${isRtl ? 'text-right' : ''}`}>
              {t('testimonials.stats.happyCustomers')}
            </div>
          </motion.div>
          
          <motion.div variants={fadeUp} className="text-center">
            <div className={`text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2 ${isRtl ? 'text-right' : ''}`}>
              1M+
            </div>
            <div className={`text-slate-600 dark:text-slate-400 text-sm ${isRtl ? 'text-right' : ''}`}>
              {t('testimonials.stats.messagesProcessed')}
            </div>
          </motion.div>
          
          <motion.div variants={fadeUp} className="text-center">
            <div className={`text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2 ${isRtl ? 'text-right' : ''}`}>
              98%
            </div>
            <div className={`text-slate-600 dark:text-slate-400 text-sm ${isRtl ? 'text-right' : ''}`}>
              {t('testimonials.stats.customerSatisfaction')}
            </div>
          </motion.div>
          
          <motion.div variants={fadeUp} className="text-center">
            <div className={`text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2 ${isRtl ? 'text-right' : ''}`}>
              24/7
            </div>
            <div className={`text-slate-600 dark:text-slate-400 text-sm ${isRtl ? 'text-right' : ''}`}>
              {t('testimonials.stats.supportAvailable')}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}