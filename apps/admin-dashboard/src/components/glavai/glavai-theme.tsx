import React from 'react';
import { cn } from '@/lib/utils';
import { GlavaiLogo } from './glavai-logo';
// Re-export GlavaiLogo for convenience
export { GlavaiLogo };

interface GlavaiBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error';
  className?: string;
}

export function GlavaiBadge({ children, variant = 'default', className }: GlavaiBadgeProps) {
  const variantClasses = {
    default: 'bg-gradient-to-r from-purple-600 to-blue-600 text-white',
    success: 'bg-green-500 text-white',
    warning: 'bg-yellow-500 text-white',
    error: 'bg-red-500 text-white',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium shadow-sm',
        variantClasses[variant],
        className,
      )}
    >
      <GlavaiLogo size="sm" variant="icon" className="opacity-90" />
      {children}
    </span>
  );
}

interface GlavaiCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export function GlavaiCard({ children, className, title }: GlavaiCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-purple-200 bg-white shadow-sm',
        'dark:border-purple-800 dark:bg-gray-900',
        className,
      )}
    >
      {title && (
        <div className="border-b border-purple-100 dark:border-purple-800 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

// CSS variables for GLAVAI theme (can be added to global CSS)
export const glavaiTheme = {
  colors: {
    primary: '#8B5CF6',
    secondary: '#3B82F6',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)',
  },
  shadows: {
    glow: '0 0 20px rgba(139, 92, 246, 0.3)',
  },
};

