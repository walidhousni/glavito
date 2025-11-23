/**
 * Onboarding Progress Bar
 * Horizontal stepper with animated progress
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface Step {
  id: string;
  label: string;
  icon: string; // Icons8 URL
}

interface ProgressBarProps {
  steps: Step[];
  currentStepIndex: number;
  completedSteps: string[];
}

export function ProgressBar({ steps, currentStepIndex, completedSteps }: ProgressBarProps) {
  const t = useTranslations('onboarding.progress');
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <div className="w-full px-8 py-6">
      {/* Progress Line */}
      <div className="relative">
        {/* Background Line */}
        <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
        
        {/* Animated Progress Line */}
        <motion.div
          className="absolute top-5 left-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        />
        
        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const isCompleted = completedSteps.includes(step.id);
            const isCurrent = index === currentStepIndex;
            const isPast = index < currentStepIndex;
            
            return (
              <motion.div
                key={step.id}
                className="flex flex-col items-center"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                {/* Step Circle */}
                <motion.div
                  className={cn(
                    'relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300',
                    isCurrent && 'ring-4 ring-primary/30 shadow-lg',
                    isCompleted || isPast
                      ? 'bg-gradient-to-br from-blue-500 to-purple-600'
                      : 'bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600'
                  )}
                  whileHover={{ scale: 1.1 }}
                >
                  {isCompleted || isPast ? (
                    <Check className="w-5 h-5 text-white" />
                  ) : isCurrent ? (
                    <Image
                      src={step.icon}
                      alt={step.label}
                      width={20}
                      height={20}
                      className="brightness-0 dark:brightness-100"
                    />
                  ) : (
                    <Image
                      src={step.icon}
                      alt={step.label}
                      width={20}
                      height={20}
                      className="opacity-50"
                    />
                  )}
                </motion.div>
                
                {/* Step Label */}
                <span
                  className={cn(
                    'mt-2 text-xs font-medium text-center transition-colors',
                    isCurrent
                      ? 'text-primary font-semibold'
                      : isCompleted || isPast
                      ? 'text-gray-700 dark:text-gray-300'
                      : 'text-gray-400 dark:text-gray-600'
                  )}
                >
                  {step.label}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
      
      {/* Progress Percentage */}
      <div className="mt-4 text-center">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {t('percentage', { percentage: Math.round(progress) })}
        </span>
      </div>
    </div>
  );
}
