'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  icon?: React.ReactNode;
  gradient?: string;
  delay?: number;
  duration?: number;
}

export function MetricCard({
  label,
  value,
  suffix = '',
  prefix = '',
  icon,
  gradient = 'from-primary to-primary/80',
  delay = 0,
  duration = 2,
}: MetricCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (isInView) {
      let startValue = 0;
      const startTime = Date.now();
      const durationMs = duration * 1000;

      const animate = () => {
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / durationMs, 1);

        // Easing function (easeOutCubic)
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(startValue + (value - startValue) * eased);

        setDisplayValue(current);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      const timeoutId = setTimeout(() => {
        requestAnimationFrame(animate);
      }, delay * 1000);

      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [isInView, value, delay, duration]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ delay, duration: 0.5, ease: 'easeOut' } as any}
      className={cn(
        'relative overflow-hidden rounded-2xl p-6 shadow-xl',
        'bg-gradient-to-br',
        gradient,
        'text-white'
      )}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="relative z-10">
        {icon && <div className="mb-4 opacity-90">{icon}</div>}

        <div className="text-4xl font-bold mb-2 font-mono">
          {prefix}
          {displayValue.toLocaleString()}
          {suffix}
        </div>

        <div className="text-sm opacity-90 font-medium">{label}</div>
      </div>

      {/* Shine effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        initial={{ x: '-100%' }}
        animate={{ x: '200%' }}
        transition={{
          duration: 2,
          delay: delay + 0.5,
          repeat: Infinity,
          repeatDelay: 3,
        }}
      />
    </motion.div>
  );
}

