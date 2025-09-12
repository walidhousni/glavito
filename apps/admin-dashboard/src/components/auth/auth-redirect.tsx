'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n.config';
import { useAuthStore } from '@/lib/store/auth-store';

interface AuthRedirectProps {
  children: React.ReactNode;
}

export function AuthRedirect({ children }: AuthRedirectProps) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (!user.onboardingCompleted) {
        router.push('/onboarding');
        return;
      }
      // Redirect to role default
      router.push(user.role === 'admin' ? '/dashboard' : '/tickets');
    }
  }, [isAuthenticated, user, isLoading, router]);

  return <>{children}</>;
}