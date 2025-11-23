'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

export type Industry =
  | 'ecommerce'
  | 'automotive'
  | 'healthcare'
  | 'realEstate'
  | 'hospitality';

interface IndustrySelectorProps {
  selected: Industry;
  onChange: (industry: Industry) => void;
  className?: string;
}

export function IndustrySelector({
  selected,
  onChange,
  className,
}: IndustrySelectorProps) {
  const t = useTranslations('landing.industries');

  const industries: Industry[] = [
    'ecommerce',
    'automotive',
    'healthcare',
    'realEstate',
    'hospitality',
  ];

  return (
    <div
      className={cn(
        'flex flex-wrap gap-2 justify-center items-center',
        className
      )}
    >
      {industries.map((industry) => (
        <button
          key={industry}
          onClick={() => onChange(industry)}
          className={cn(
            'relative px-6 py-2.5 rounded-full font-medium text-sm transition-all duration-300',
            'hover:scale-105 active:scale-95',
            selected === industry
              ? 'text-white shadow-lg'
              : 'bg-white/10 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-gray-700/50 backdrop-blur-sm border border-gray-200/20 dark:border-gray-700/30'
          )}
        >
          {selected === industry && (
            <motion.div
              layoutId="industry-selector"
              className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80 rounded-full"
              transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
            />
          )}
          <span className="relative z-10">{t(industry)}</span>
        </button>
      ))}
    </div>
  );
}

