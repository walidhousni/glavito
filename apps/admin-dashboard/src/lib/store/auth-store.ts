import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api/config';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'agent';
  tenantId: string;
  avatar?: string;
  status: 'active' | 'inactive';
  lastLoginAt?: string;
  onboardingCompleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ user: User; tokens: AuthTokens }>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  clearAuth: () => void;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/login', { email, password });

          const data = (response as any)?.data?.data ?? response?.data;
          const result = {
            user: data?.user as User,
            tokens: { accessToken: data?.accessToken, refreshToken: data?.refreshToken } as AuthTokens,
          };

          if (!result.user || !result.tokens?.accessToken) {
            throw new Error('Invalid login response');
          }

          set({
            user: result.user,
            tokens: result.tokens,
            isAuthenticated: true,
            isLoading: false,
          });

          return result;
        } catch (error: any) {
          set({ isLoading: false });
          throw new Error(error.response?.data?.message || 'Login failed');
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true });
        try {
          await api.post('/auth/register', data);
          // Immediately login after successful registration to obtain tokens
          await get().login(data.email, data.password);
          set({ isLoading: false });
        } catch (error: any) {
          set({ isLoading: false });
          throw new Error(error.response?.data?.message || 'Registration failed');
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          const { tokens } = get();
          if (tokens?.refreshToken) {
            await api.post('/auth/logout', { refreshToken: tokens.refreshToken });
          }
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          set({ user: null, tokens: null, isAuthenticated: false, isLoading: false });
        }
      },

      refreshToken: async () => {
        const { tokens } = get();
        if (!tokens?.refreshToken) return;

        try {
          const response = await api.post('/auth/refresh', { refreshToken: tokens.refreshToken });
          const data = (response as any)?.data?.data ?? response?.data;
          set({
            tokens: { accessToken: data?.accessToken, refreshToken: data?.refreshToken ?? tokens.refreshToken },
          });
        } catch (error) {
          console.error('Token refresh failed:', error);
          get().clearAuth();
        }
      },

      verifyEmail: async (token: string) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/verify-email', { token });
          const data = (response as any)?.data?.data ?? response?.data;
          set({ 
            user: data?.user as User, 
            tokens: data?.accessToken ? { accessToken: data.accessToken, refreshToken: data.refreshToken } as AuthTokens : get().tokens,
            isAuthenticated: !!data?.user,
            isLoading: false 
          });
        } catch (error: any) {
          set({ isLoading: false });
          throw new Error(error.response?.data?.message || 'Email verification failed');
        }
      },

      requestPasswordReset: async (email: string) => {
        set({ isLoading: true });
        try {
          await api.post('/auth/password-reset', { email });
          set({ isLoading: false });
        } catch (error: unknown) {
          set({ isLoading: false });
          const err = error as { response?: { data?: { message?: string } } };
          throw new Error(err.response?.data?.message || 'Password reset request failed');
        }
      },

      resetPassword: async (token: string, password: string) => {
        set({ isLoading: true });
        try {
          await api.post('/auth/password-reset/confirm', { token, password });
          set({ isLoading: false });
        } catch (error: any) {
          set({ isLoading: false });
          throw new Error(error.response?.data?.message || 'Password reset failed');
        }
      },

      resendVerificationEmail: async (email: string) => {
        set({ isLoading: true });
        try {
          await api.post('/auth/resend-verification', { email });
          set({ isLoading: false });
        } catch (error: unknown) {
          set({ isLoading: false });
          const err = error as { response?: { data?: { message?: string } } };
          throw new Error(err.response?.data?.message || 'Failed to resend verification email');
        }
      },

      updateUser: (updates: Partial<User>) => {
        const { user } = get();
        if (user) {
          set({ user: { ...user, ...updates } });
        }
      },

      clearAuth: () => {
        set({ user: null, tokens: null, isAuthenticated: false, isLoading: false });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);