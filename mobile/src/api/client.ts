// ---------------------------------------------------------------------------
// src/api/client.ts
// Axios instance with auth injection and 401 auto-logout
// ---------------------------------------------------------------------------

import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// Resolve base URL from app.json extra or fall back to localhost
const BASE_URL: string =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? 'http://YOUR_SERVER_IP:3000';

const TOKEN_KEY = 'auth_token';

const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 20_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor: attach Bearer token ──────────────────────────────
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // If SecureStore fails, continue without token
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor: handle 401 by clearing auth ───────────────────
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    if (error?.response?.status === 401) {
      try {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        // Dynamic import to avoid circular dependency
        const { useAuthStore } = await import('../store/authStore');
        useAuthStore.getState().logout();
      } catch {
        // Best-effort
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;
