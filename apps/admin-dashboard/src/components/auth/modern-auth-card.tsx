'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ModernAuthCardProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export function ModernAuthCard({ children, title, description, className }: ModernAuthCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
      className={cn("w-full", className)}
    >
      <div className="w-full">
        {(title || description) && (
          <div className="text-center space-y-2 pb-8">
            {title && (
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {description}
              </p>
            )}
          </div>
        )}
        <div className="space-y-6">
          {children}
        </div>
      </div>
    </motion.div>
  );
}