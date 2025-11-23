'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n.config';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5 }
  },
};

interface FeatureCTASectionProps {
  title?: string;
  description?: string;
  gradient?: string;
  className?: string;
}

export function FeatureCTASection({
  title = 'Ready to get started?',
  description = 'Join thousands of teams already using Glavito to transform their customer support.',
  gradient = 'from-blue-600 to-purple-600',
  className = '',
}: FeatureCTASectionProps) {
  return (
    <section className={`py-20 bg-gradient-to-br ${gradient} ${className}`}>
      <div className="container mx-auto px-4">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeUp}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {title}
          </h2>
          <p className="text-xl text-white/90 mb-8">
            {description}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/register">
              <Button 
                size="lg"
                className="h-12 px-8 text-base font-semibold bg-white text-slate-900 hover:bg-slate-100 border-0 shadow-lg hover:shadow-xl transition-all"
              >
                Start Free Trial
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button 
                size="lg"
                variant="outline"
                className="h-12 px-8 text-base font-semibold bg-transparent border-2 border-white text-white hover:bg-white/10"
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

