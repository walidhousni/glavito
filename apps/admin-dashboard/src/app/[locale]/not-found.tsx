'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function LocaleNotFound() {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations();
  
  // Extract locale from pathname
  const locale = (pathname?.split?.('/')?.[1]) || 'en';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob dark:bg-blue-600 dark:opacity-30"></div>
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob dark:bg-purple-600 dark:opacity-30"></div>
        <div className="absolute bottom-1/4 left-1/3 w-60 h-60 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob dark:bg-pink-600 dark:opacity-30"></div>
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5 dark:opacity-10"></div>

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto">
          <Card className="backdrop-blur-sm bg-white/95 dark:bg-gray-800/95 border-gray-200/50 dark:border-gray-700/50 shadow-xl">
            <CardHeader className="text-center pb-4">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl font-bold text-white">404</span>
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                {t('errors.pageNotFound', { defaultValue: 'Page Not Found' })}
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                {t('errors.pageNotFoundDescription', { 
                  defaultValue: 'The page you are looking for does not exist or has been moved.' 
                })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col space-y-3">
                <Link href={`/${locale}`}>
                  <Button className="w-full gap-2">
                    <Home className="h-4 w-4" />
                    {t('common.goHome', { defaultValue: 'Go to Home' })}
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  onClick={() => router.back()}
                  className="w-full gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t('common.goBack', { defaultValue: 'Go Back' })}
                </Button>
              </div>
              
              <div className="text-center pt-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('errors.contactSupport', { 
                    defaultValue: 'If you believe this is an error, please contact support.' 
                  })}
                </p>
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