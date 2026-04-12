'use client';

import { create } from 'zustand';
import type { AuthUser, LoginResponse } from '@/types';

// ================================================================
// localStorage 키
// ================================================================

const KEYS = {
  ACCESS_TOKEN: 'auth_access_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  USER: 'auth_user',
} as const;

// ================================================================
// 인터페이스
// ================================================================

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setAuth: (data: LoginResponse) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  loadFromStorage: () => void;
  setLoading: (v: boolean) => void;
}

// ================================================================
// Store
// ================================================================

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (data) => {
    try {
      localStorage.setItem(KEYS.ACCESS_TOKEN, data.accessToken);
      localStorage.setItem(KEYS.REFRESH_TOKEN, data.refreshToken);
      localStorage.setItem(KEYS.USER, JSON.stringify(data.user));
    } catch { /* SSR safe */ }
    set({
      user: data.user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  setTokens: (accessToken, refreshToken) => {
    try {
      localStorage.setItem(KEYS.ACCESS_TOKEN, accessToken);
      localStorage.setItem(KEYS.REFRESH_TOKEN, refreshToken);
    } catch { /* SSR safe */ }
    set({ accessToken, refreshToken });
  },

  clearAuth: () => {
    try {
      localStorage.removeItem(KEYS.ACCESS_TOKEN);
      localStorage.removeItem(KEYS.REFRESH_TOKEN);
      localStorage.removeItem(KEYS.USER);
    } catch { /* SSR safe */ }
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  loadFromStorage: () => {
    try {
      const accessToken = localStorage.getItem(KEYS.ACCESS_TOKEN);
      const refreshToken = localStorage.getItem(KEYS.REFRESH_TOKEN);
      const userStr = localStorage.getItem(KEYS.USER);
      if (accessToken && refreshToken && userStr) {
        const user = JSON.parse(userStr) as AuthUser;
        set({ user, accessToken, refreshToken, isAuthenticated: true, isLoading: false });
        return;
      }
    } catch { /* SSR safe */ }
    set({ isLoading: false });
  },

  setLoading: (v) => set({ isLoading: v }),
}));
