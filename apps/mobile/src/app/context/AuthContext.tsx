import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useAuthStore } from '../store/auth.store';
import type { AuthState } from '../store/auth.store';

type AuthContextValue = AuthState;

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const store = useAuthStore();

  useEffect(() => {
    // On mount, optionally refresh profile if token exists
    if (store.accessToken) {
      store.refreshProfile().catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: store.user,
      tenant: store.tenant,
      accessToken: store.accessToken,
      refreshToken: store.refreshToken,
      isLoading: store.isLoading,
      error: store.error,
      login: store.login,
      register: store.register,
      logout: store.logout,
      refreshProfile: store.refreshProfile,
      requestPasswordReset: store.requestPasswordReset,
      confirmPasswordReset: store.confirmPasswordReset,
    }),
    [store.user, store.tenant, store.accessToken, store.refreshToken, store.isLoading, store.error]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}


