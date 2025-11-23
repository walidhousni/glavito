import axios, { AxiosError, AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { ENV } from '../config/env';

const ACCESS_TOKEN_KEY = 'glavito_access_token';
const REFRESH_TOKEN_KEY = 'glavito_refresh_token';

export async function getAccessToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setTokens(accessToken: string, refreshToken?: string) {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  if (typeof refreshToken === 'string') {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (!refreshToken) return null;
    const res = await axios.post(`${ENV.apiBaseUrl}/auth/refresh`, { refreshToken }, { timeout: 10_000 });
    const newAccess = String(res?.data?.accessToken || '');
    if (!newAccess) return null;
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, newAccess);
    return newAccess;
  } catch {
    return null;
  }
}

export function createApiClient(): AxiosInstance {
  const instance = axios.create({ baseURL: ENV.apiBaseUrl, timeout: 15_000 });

  instance.interceptors.request.use(async (config) => {
    const token = await getAccessToken();
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
    return config;
  });

  let isRefreshing = false;
  let pendingQueue: Array<{ resolve: (token: string | null) => void; reject: (err: AxiosError) => void }> = [];

  const dequeue = (token: string | null, error?: AxiosError) => {
    pendingQueue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(token)));
    pendingQueue = [];
  };

  instance.interceptors.response.use(
    (res) => res,
    async (error: AxiosError) => {
      const original = error.config as any;
      const status = error.response?.status ?? 0;
      const isAuthEndpoint = typeof original?.url === 'string' && original.url.includes('/auth/');

      if (status === 401 && !original?._retry && !isAuthEndpoint) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            pendingQueue.push({ resolve: (token) => {
              if (token) {
                original.headers = original.headers ?? {};
                original.headers.Authorization = `Bearer ${token}`;
              }
              resolve(instance(original));
            }, reject });
          });
        }

        original._retry = true;
        isRefreshing = true;
        try {
          const newToken = await refreshAccessToken();
          isRefreshing = false;
          dequeue(newToken);
          if (newToken) {
            original.headers = original.headers ?? {};
            original.headers.Authorization = `Bearer ${newToken}`;
            return instance(original);
          }
        } catch (e: any) {
          isRefreshing = false;
          dequeue(null, e);
        }
      }
      return Promise.reject(error);
    }
  );

  return instance;
}

export type ApiClient = ReturnType<typeof createApiClient>;


