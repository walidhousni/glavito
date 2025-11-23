'use client';

import React from 'react';
import CountUp from 'react-countup';
import { useInView } from 'react-intersection-observer';
import { cn } from '@/lib/utils';

interface AnimatedCounterProps {
  value: number | string;
  label?: string;
  icon?: string; // Icons8 ID
  decimals?: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  label,
  icon,
  decimals = 0,
  duration = 2,
  className,
  prefix = '',
  suffix = '',
}) => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.5,
  });

  const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]+/g, '')) : value;
  const isValidNumber = !isNaN(numericValue);

  return (
    <div ref={ref} className={cn('flex items-center gap-2', className)}>
      {icon && (
        <img
          src={`https://img.icons8.com/?size=24&id=${icon}`}
          alt=""
          width={20}
          height={20}
          className="opacity-70"
        />
      )}
      <div className="flex flex-col">
        {isValidNumber && inView ? (
          <CountUp
            end={numericValue}
            duration={duration}
            decimals={decimals}
            prefix={prefix}
            suffix={suffix}
            separator=","
          />
        ) : (
          <span>{value}</span>
        )}
        {label && <span className="text-xs text-muted-foreground">{label}</span>}
      </div>
    </div>
  );
};
