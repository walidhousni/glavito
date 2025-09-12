'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn("w-full", className)}
    >
      <Card className="backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-0 shadow-2xl shadow-blue-500/10 dark:shadow-purple-500/10">
        {(title || description) && (
          <CardHeader className="text-center space-y-2 pb-6">
            {title && (
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {title}
              </CardTitle>
            )}
            {description && (
              <CardDescription className="text-gray-600 dark:text-gray-400">
                {description}
              </CardDescription>
            )}
          </CardHeader>
        )}
        <CardContent className="space-y-6">
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
}