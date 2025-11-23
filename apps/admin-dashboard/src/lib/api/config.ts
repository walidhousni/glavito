import axios from 'axios';

// Create axios instance
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    // Do not set User-Agent from the browser; it's forbidden by Fetch
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Attach auth token only in the browser
    if (typeof window !== 'undefined') {
      try {
        const authStorage = window.localStorage.getItem('auth-storage');
        if (authStorage) {
          const { state } = JSON.parse(authStorage) as { state?: { tokens?: { accessToken?: string } } };
          if (state?.tokens?.accessToken) {
            (config.headers as Record<string, string>).Authorization = `Bearer ${state.tokens.accessToken}`;
          }
          // Propagate tenant host if available (middleware sets x-tenant-host)
          const hostname = window.location?.host;
          if (hostname) {
            (config.headers as Record<string, string>)['x-tenant-host'] = hostname;
          }
        }
      } catch {
        // no-op on server/parse issues
      }
    }

    // Locale → Accept-Language
    try {
      if (typeof window !== 'undefined') {
        const pathLocale = String(window.location.pathname.split('/').filter(Boolean)[0] || '');
        const supported = ['en','fr','ar'];
        if (supported.includes(pathLocale)) {
          (config.headers as Record<string, string>)['Accept-Language'] = pathLocale;
        }
      }
    } catch {
      // ignore locale resolution errors
    }

    // Ensure Content-Type is present for methods with bodies
    const method = (config.method || 'get').toUpperCase();
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      const headers = config.headers as Record<string, string>;
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
      headers['Accept'] = headers['Accept'] || 'application/json';
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as { _retry?: boolean; headers: Record<string, string> };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        if (typeof window !== 'undefined') {
          const authStorage = window.localStorage.getItem('auth-storage');
          if (authStorage) {
            const { state } = JSON.parse(authStorage);
            if (state?.tokens?.refreshToken) {
              const response = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/auth/refresh`,
                { refreshToken: state.tokens.refreshToken }
              );

              const payload = (response?.data && typeof response.data === 'object')
                ? (response.data.data ?? response.data)
                : response.data;
              const accessToken = payload?.accessToken as string | undefined;
              const newRefreshToken = (payload?.refreshToken as string | undefined) ?? state.tokens.refreshToken;

              // Update stored tokens
              const updatedStorage = {
                ...JSON.parse(authStorage),
                state: {
                  ...state,
                  tokens: {
                    ...state.tokens,
                    accessToken,
                    refreshToken: newRefreshToken,
                  },
                },
              };
              window.localStorage.setItem('auth-storage', JSON.stringify(updatedStorage));

              // Retry original request with new token
              if (accessToken) {
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              }
              return api(originalRequest);
            }
          }
        }
      } catch (refreshError) {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('auth-storage');
          window.location.href = '/auth/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;