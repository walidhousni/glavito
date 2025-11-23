/**
 * Step Navigation
 * Back/Next/Skip buttons for onboarding wizard
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { SkipForward, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface StepNavigationProps {
  canGoPrev: boolean;
  canGoNext: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
  isLoading?: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSkip?: () => void;
  nextLabel?: string;
  prevLabel?: string;
  skipLabel?: string;
  disableNext?: boolean;
}

export function StepNavigation({
  canGoPrev,
  canGoNext,
  isFirstStep,
  isLastStep,
  isLoading = false,
  onPrev,
  onNext,
  onSkip,
  nextLabel,
  prevLabel,
  skipLabel,
  disableNext = false,
}: StepNavigationProps) {
  const t = useTranslations('onboarding.navigation');
  return (
    <div className="flex items-center justify-between w-full px-8 py-6 border-t border-gray-200 dark:border-gray-800">
      {/* Back Button */}
      <Button
        variant="outline"
        size="lg"
        onClick={onPrev}
        disabled={!canGoPrev || isLoading}
        className={cn(
          'group transition-all duration-300',
          !canGoPrev && 'opacity-0 pointer-events-none'
        )}
      >
        <Image
          src="https://img.icons8.com/?size=20&id=60636"
          alt="Back"
          width={18}
          height={18}
          className="mr-2 group-hover:-translate-x-1 transition-transform"
        />
        {prevLabel || t('previous')}
      </Button>
      
      {/* Center: Skip Button (optional) */}
      <div>
        {onSkip && !isFirstStep && !isLastStep && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkip}
            disabled={isLoading}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <SkipForward className="w-4 h-4 mr-2" />
            {skipLabel || t('skip')}
          </Button>
        )}
      </div>
      
      {/* Next/Complete Button */}
      <Button
        size="lg"
        onClick={() => {
          console.log('[StepNavigation] Button clicked, isLastStep:', isLastStep, 'isLoading:', isLoading, 'disabled:', disableNext || isLoading);
          onNext();
        }}
        disabled={disableNext || isLoading}
        className={cn(
          'group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-300',
          isLastStep && 'from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {t('processing')}
          </>
        ) : (
          <>
            {nextLabel || (isLastStep ? t('finish') : t('next'))}
            {!isLastStep ? (
              <Image
                src="https://img.icons8.com/?size=20&id=82751"
                alt="Next"
                width={18}
                height={18}
                className="ml-2 group-hover:translate-x-1 transition-transform brightness-0 invert"
              />
            ) : (
              <Image
                src="https://img.icons8.com/?size=20&id=82751"
                alt="Complete"
                width={18}
                height={18}
                className="ml-2 brightness-0 invert"
              />
            )}
          </>
        )}
      </Button>
    </div>
  );
}
