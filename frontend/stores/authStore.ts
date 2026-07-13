'use client';

import { create } from 'zustand';
import type { AuthUser, LoginResponse } from '@/types';

// ================================================================
// localStorage 키
// refresh token은 httpOnly 쿠키로 관리되므로 저장하지 않는다 (XSS 방어)
// ================================================================

const KEYS = {
  ACCESS_TOKEN: 'auth_access_token',
  USER: 'auth_user',
} as const;

// 과거 버전이 저장했던 리프레시 토큰 제거 (마이그레이션)
const LEGACY_REFRESH_KEY = 'auth_refresh_token';

// ================================================================
// 인터페이스
// ================================================================

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setAuth: (data: LoginResponse) => void;
  setAccessToken: (accessToken: string) => void;
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
  isAuthenticated: false,
  isLoading: true,

  setAuth: (data) => {
    try {
      localStorage.setItem(KEYS.ACCESS_TOKEN, data.accessToken);
      localStorage.setItem(KEYS.USER, JSON.stringify(data.user));
      localStorage.removeItem(LEGACY_REFRESH_KEY);
    } catch { /* SSR safe */ }
    set({
      user: data.user,
      accessToken: data.accessToken,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  setAccessToken: (accessToken) => {
    try {
      localStorage.setItem(KEYS.ACCESS_TOKEN, accessToken);
    } catch { /* SSR safe */ }
    set({ accessToken });
  },

  clearAuth: () => {
    try {
      localStorage.removeItem(KEYS.ACCESS_TOKEN);
      localStorage.removeItem(KEYS.USER);
      localStorage.removeItem(LEGACY_REFRESH_KEY);
    } catch { /* SSR safe */ }
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  loadFromStorage: () => {
    try {
      localStorage.removeItem(LEGACY_REFRESH_KEY);
      const accessToken = localStorage.getItem(KEYS.ACCESS_TOKEN);
      const userStr = localStorage.getItem(KEYS.USER);
      if (accessToken && userStr) {
        const user = JSON.parse(userStr) as AuthUser;
        set({ user, accessToken, isAuthenticated: true, isLoading: false });
        return;
      }
    } catch { /* SSR safe */ }
    set({ isLoading: false });
  },

  setLoading: (v) => set({ isLoading: v }),
}));
