// ---------------------------------------------------------------------------
// src/store/authStore.ts
// Zustand store backed by expo-secure-store for JWT persistence
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';

interface AuthState {
  token: string | null;
  isLoggedIn: boolean;
  isHydrated: boolean;
  /** Call on app boot to restore token from SecureStore */
  hydrate: () => Promise<void>;
  /** Persist token and mark as logged in */
  login: (token: string) => Promise<void>;
  /** Clear token – called automatically on 401; NOT exposed in UI */
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  isLoggedIn: false,
  isHydrated: false,

  hydrate: async () => {
    try {
      const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
      if (storedToken) {
        set({ token: storedToken, isLoggedIn: true, isHydrated: true });
      } else {
        set({ token: null, isLoggedIn: false, isHydrated: true });
      }
    } catch {
      set({ token: null, isLoggedIn: false, isHydrated: true });
    }
  },

  login: async (token: string) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    set({ token, isLoggedIn: true });
  },

  logout: async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch {
      // Swallow – store delete is best-effort
    }
    set({ token: null, isLoggedIn: false });
  },
}));
