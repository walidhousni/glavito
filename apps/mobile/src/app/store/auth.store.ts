import { create } from 'zustand';
import { persist, StateStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import { createApiClient, setTokens, clearTokens } from '../lib/api';
import * as Linking from 'expo-linking';

type User = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  tenantId?: string;
};

type Tenant = {
  id: string;
  name?: string;
  subdomain?: string;
  plan?: string;
};

export type AuthState = {
  user: User | null;
  tenant: Tenant | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error?: string | null;
  login: (email: string, password: string, tenantId?: string) => Promise<void>;
  register: (data: { email: string; password: string; firstName: string; lastName: string; tenantId?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  confirmPasswordReset: (token: string, password: string) => Promise<void>;
  handleAuthDeepLink: (url: string) => Promise<boolean>;
};

const secureStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return (await SecureStore.getItemAsync(name)) ?? null;
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await SecureStore.deleteItemAsync(name);
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tenant: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      error: null,

      async login(email, password, tenantId) {
        set({ isLoading: true, error: null });
        try {
          const api = createApiClient();
          const res = await api.post('/auth/login', { email, password, tenantId });
          const { accessToken, refreshToken, user, tenant } = res.data || {};
          await setTokens(String(accessToken || ''), String(refreshToken || ''));
          set({ user, tenant, accessToken, refreshToken, isLoading: false });
        } catch (e: any) {
          const message = e?.response?.data?.message || e?.message || 'Login failed';
          set({ error: String(message), isLoading: false });
          throw e;
        }
      },

      async register(data) {
        set({ isLoading: true, error: null });
        try {
          const api = createApiClient();
          const res = await api.post('/auth/register', data);
          const { accessToken, refreshToken, user, tenant } = res.data || {};
          await setTokens(String(accessToken || ''), String(refreshToken || ''));
          set({ user, tenant, accessToken, refreshToken, isLoading: false });
        } catch (e: any) {
          const message = e?.response?.data?.message || e?.message || 'Registration failed';
          set({ error: String(message), isLoading: false });
          throw e;
        }
      },

      async logout() {
        try {
          const api = createApiClient();
          const refreshToken = get().refreshToken;
          if (refreshToken) {
            await api.post('/auth/logout', { refreshToken }).catch(() => undefined);
          }
        } finally {
          await clearTokens();
          set({ user: null, tenant: null, accessToken: null, refreshToken: null });
        }
      },

      async refreshProfile() {
        const api = createApiClient();
        try {
          const res = await api.get('/auth/profile');
          const user = res.data as User;
          set({ user });
        } catch (e) {
          // ignore
        }
      },

      async requestPasswordReset(email: string) {
        const api = createApiClient();
        await api.post('/auth/password-reset', { email });
      },

      async confirmPasswordReset(token: string, password: string) {
        const api = createApiClient();
        await api.post('/auth/password-reset/confirm', { token, password });
      },

      async handleAuthDeepLink(url: string) {
        try {
          const parsed = Linking.parse(url);
          const params = parsed.queryParams || {} as Record<string, string | string[]>;
          const accessToken = String((params as any).accessToken || '');
          const refreshToken = String((params as any).refreshToken || '');
          if (accessToken) {
            await setTokens(accessToken, refreshToken || undefined);
            const api = createApiClient();
            const res = await api.get('/auth/profile');
            const user = res.data as User;
            set({ user, accessToken, refreshToken: refreshToken || null });
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },
    }),
    {
      name: 'glavito_auth_v1',
      storage: secureStorage as any,
      partialize: (state) => ({ user: state.user, tenant: state.tenant, accessToken: state.accessToken, refreshToken: state.refreshToken }),
    }
  )
);


