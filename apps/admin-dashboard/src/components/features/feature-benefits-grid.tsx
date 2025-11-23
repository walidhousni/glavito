'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
  },
};

const staggerChildren = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

export interface Benefit {
  title: string;
  description: string;
  iconUrl?: string;
  icon?: React.ReactNode;
}

interface FeatureBenefitsGridProps {
  benefits: Benefit[];
  columns?: 2 | 3 | 4;
  className?: string;
}

export function FeatureBenefitsGrid({
  benefits,
  columns = 3,
  className = '',
}: FeatureBenefitsGridProps) {
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
  };

  return (
    <section className={`py-16 bg-slate-50 dark:bg-slate-900 ${className}`}>
      <div className="container mx-auto px-4">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerChildren}
          className={`grid grid-cols-1 ${gridCols[columns]} gap-6`}
        >
          {benefits.map((benefit, idx) => (
            <motion.div key={idx} variants={fadeUp}>
              <Card className="h-full hover:shadow-lg transition-shadow border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    {benefit.iconUrl && (
                      <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                        <Image
                          src={benefit.iconUrl}
                          alt={benefit.title}
                          width={24}
                          height={24}
                          className="w-6 h-6 object-contain"
                        />
                      </div>
                    )}
                    {benefit.icon && (
                      <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                        {benefit.icon}
                      </div>
                    )}
                    <CardTitle className="text-lg">{benefit.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 dark:text-slate-400">{benefit.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

