import React from 'react';
import { cn } from '@/lib/utils';

interface GlavaiLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'icon';
}

export function GlavaiLogo({ className, size = 'md', variant = 'full' }: GlavaiLogoProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  if (variant === 'icon') {
    return (
      <div className={cn('relative', sizeClasses[size], className)}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <defs>
            <linearGradient id="glavaiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="45" fill="url(#glavaiGradient)" />
          <path
            d="M30 50 L45 35 L50 40 L35 55 L70 55 L55 40 L50 35 L65 50 L50 65 L45 60 L60 45 L30 45 Z"
            fill="white"
            opacity="0.9"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={sizeClasses[size]}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <defs>
            <linearGradient id="glavaiGradientText" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="45" fill="url(#glavaiGradientText)" />
          <path
            d="M30 50 L45 35 L50 40 L35 55 L70 55 L55 40 L50 35 L65 50 L50 65 L45 60 L60 45 L30 45 Z"
            fill="white"
            opacity="0.9"
          />
        </svg>
      </div>
      <span
        className={cn(
          'font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent',
          size === 'sm' && 'text-sm',
          size === 'md' && 'text-base',
          size === 'lg' && 'text-xl',
        )}
      >
        GLAVAI
      </span>
    </div>
  );
}

