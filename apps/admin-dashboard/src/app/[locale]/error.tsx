'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations();
  const pathname = usePathname();
  
  // Extract locale from pathname
  const locale = (pathname?.split?.('/')?.[1]) || 'en';

  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-red-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob dark:bg-red-600 dark:opacity-30"></div>
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-orange-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob dark:bg-orange-600 dark:opacity-30"></div>
        <div className="absolute bottom-1/4 left-1/3 w-60 h-60 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob dark:bg-yellow-600 dark:opacity-30"></div>
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5 dark:opacity-10"></div>

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto">
          <Card className="backdrop-blur-sm bg-white/95 dark:bg-gray-800/95 border-gray-200/50 dark:border-gray-700/50 shadow-xl">
            <CardHeader className="text-center pb-4">
              <div className="w-20 h-20 bg-gradient-to-r from-red-600 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-10 w-10 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                {t('errors.somethingWentWrong', { defaultValue: 'Something went wrong!' })}
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                {t('errors.unexpectedError', { 
                  defaultValue: 'An unexpected error occurred. Please try again.' 
                })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error.message && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200 font-mono">
                    {error.message}
                  </p>
                </div>
              )}
              
              <div className="flex flex-col space-y-3">
                <Button 
                  onClick={reset}
                  className="w-full gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  {t('common.tryAgain', { defaultValue: 'Try Again' })}
                </Button>
                <Link href={`/${locale}`}>
                  <Button variant="outline" className="w-full gap-2">
                    <Home className="h-4 w-4" />
                    {t('common.goHome', { defaultValue: 'Go to Home' })}
                  </Button>
                </Link>
              </div>
              
              <div className="text-center pt-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('errors.persistentProblem', { 
                    defaultValue: 'If this problem persists, please contact support.' 
                  })}
                </p>
                {error.digest && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 font-mono">
                    {t('errors.errorId', { defaultValue: 'Error ID' })}: {error.digest}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 left-0 right-0 text-center">
        <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            © 2024 <span className="font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Glavito</span>. {t('common.allRightsReserved', { defaultValue: 'All rights reserved.' })}
          </p>
        </div>
      </div>
    </div>
  );
}