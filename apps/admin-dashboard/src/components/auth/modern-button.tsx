'use client';

import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ModernButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  gradient?: boolean;
}

export const ModernButton = forwardRef<HTMLButtonElement, ModernButtonProps>(
  ({ children, loading, loadingText, icon, gradient = true, className, disabled, ...props }, ref) => {
    const isDisabled = disabled || loading;

    return (
      <motion.div
        whileHover={!isDisabled ? { scale: 1.02 } : {}}
        whileTap={!isDisabled ? { scale: 0.98 } : {}}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        <Button
          ref={ref}
          disabled={isDisabled}
          className={cn(
            "relative overflow-hidden transition-all duration-300",
            gradient && "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700",
            gradient && "shadow-lg hover:shadow-xl",
            gradient && "border-0",
            !gradient && "border-2",
            className
          )}
          {...props}
        >
          {/* Animated background */}
          {gradient && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 opacity-0"
              whileHover={{ opacity: 0.2 }}
              transition={{ duration: 0.3 }}
            />
          )}

          {/* Content */}
          <div className="relative flex items-center justify-center space-x-2">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{loadingText || 'Loading...'}</span>
              </>
            ) : (
              <>
                {icon && (
                  <motion.div
                    initial={{ rotate: 0 }}
                    whileHover={{ rotate: 5 }}
                    transition={{ duration: 0.2 }}
                  >
                    {icon}
                  </motion.div>
                )}
                <span>{children}</span>
              </>
            )}
          </div>

          {/* Shine effect */}
          {gradient && !isDisabled && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
              initial={{ x: '-100%' }}
              whileHover={{ x: '100%' }}
              transition={{ duration: 0.6 }}
            />
          )}
        </Button>
      </motion.div>
    );
  }
);

ModernButton.displayName = 'ModernButton';