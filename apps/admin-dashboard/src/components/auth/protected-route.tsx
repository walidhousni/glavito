'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from '@/i18n.config';
import { useAuthStore } from '@/lib/store/auth-store';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: Array<'admin' | 'agent'>;
  fallbackUrl?: string;
}

export function ProtectedRoute({ 
  children, 
  requiredRole = [], 
  fallbackUrl = '/auth/login' 
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // Wait a bit for the store to hydrate from localStorage
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!isAuthenticated || !user) {
        const returnTo = pathname && !pathname.includes('/auth') ? `?returnTo=${encodeURIComponent(pathname)}` : '';
        router.push(`${fallbackUrl}${returnTo}`);
        return;
      }

      // Check role requirements
      if (requiredRole.length > 0 && !requiredRole.includes(user.role)) {
        router.push(user.role === 'admin' ? '/dashboard' : '/tickets');
        return;
      }

      // If onboarding not completed, redirect to onboarding unless already on onboarding/auth
      if (
        user &&
        !user.onboardingCompleted &&
        pathname &&
        !pathname.includes('/onboarding') &&
        !pathname.includes('/auth')
      ) {
        router.push('/onboarding');
        return;
      }

      setIsChecking(false);
    };

    if (!isLoading) {
      checkAuth();
    }
  }, [isAuthenticated, user, isLoading, router, pathname, requiredRole, fallbackUrl]);

  // Show loading while checking authentication
  if (isLoading || isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 mx-auto animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <div className="space-y-2">
            <p className="text-lg font-medium text-gray-800 dark:text-gray-200">Checking authentication...</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Please wait</p>
          </div>
        </div>
      </div>
    );
  }

  // Render children if authenticated and authorized
  return <>{children}</>;
}