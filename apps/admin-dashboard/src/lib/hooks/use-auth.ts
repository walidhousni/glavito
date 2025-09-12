"use client";

import { useMemo } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';

interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  tenantId: string;
}

export function useAuth(): { user: AuthUser | null; isAuthenticated: boolean; loading: boolean } {
  const storeUser = useAuthStore((s) => s.user as any);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loading = useAuthStore((s) => s.isLoading);

  const user = useMemo<AuthUser | null>(() => {
    if (!storeUser) return null;
    return {
      id: storeUser.id,
      firstName: storeUser.firstName,
      lastName: storeUser.lastName,
      email: storeUser.email,
      role: storeUser.role,
      tenantId: storeUser.tenantId,
    };
  }, [storeUser]);

  return { user, isAuthenticated, loading };
}


