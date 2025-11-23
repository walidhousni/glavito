'use client';

import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from '@/i18n.config';
import Image from 'next/image';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5 }
  },
};

interface FeatureHeroSectionProps {
  title: string;
  subtitle: string;
  description: string;
  iconUrl?: string;
  gradient: string;
  bgGradient: string;
  badge?: string;
  highlights?: string[];
}

export function FeatureHeroSection({
  title,
  subtitle,
  description,
  iconUrl,
  gradient,
  bgGradient,
  badge,
  highlights = [],
}: FeatureHeroSectionProps) {
  return (
    <section className={`relative z-10 py-20 ${bgGradient} overflow-hidden`}>
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br ${gradient} opacity-5 rounded-full blur-3xl`} />
        <div className={`absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-br ${gradient} opacity-5 rounded-full blur-3xl`} />
      </div>

      <div className="container relative mx-auto px-4">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeUp}
          className="max-w-4xl mx-auto text-center"
        >
          {badge && (
            <Badge className={`mb-6 ${bgGradient} border-0 px-4 py-1.5 text-sm font-semibold`}>
              {badge}
            </Badge>
          )}

          {iconUrl && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="flex justify-center mb-6"
            >
              <div className={`p-6 rounded-2xl ${bgGradient} border-2 border-transparent`}>
                <Image
                  src={iconUrl}
                  alt={title}
                  width={80}
                  height={80}
                  className="w-20 h-20 object-contain"
                />
              </div>
            </motion.div>
          )}

          <h1 className="text-4xl md:text-6xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
            {title}
          </h1>

          <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
            {subtitle}
          </p>

          <p className="text-lg text-slate-500 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
            {description}
          </p>

          {highlights.length > 0 && (
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              {highlights.map((highlight, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                >
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{highlight}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/register">
              <Button 
                size="lg"
                className={`h-12 px-8 text-base font-semibold bg-gradient-to-r ${gradient} hover:opacity-90 text-white border-0 shadow-lg hover:shadow-xl transition-all`}
              >
                Get Started Free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button 
                size="lg"
                variant="outline"
                className="h-12 px-8 text-base font-semibold border-2"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

