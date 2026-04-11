import { create } from 'zustand';
import type { AuthUser } from '@/types';
import {
  getStoredUser,
  setStoredUser,
  setTokens,
  clearTokens,
} from '@/lib/auth';

interface AppState {
  user: AuthUser | null;
  initialized: boolean;

  /** 로그인 성공 후 호출 */
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  /** 로그아웃 또는 401 처리 */
  clearAuth: () => void;
  /** 앱 마운트 시 localStorage에서 복원 */
  hydrate: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  initialized: false,

  setAuth: (user, accessToken, refreshToken) => {
    setTokens(accessToken, refreshToken);
    setStoredUser(user);
    set({ user, initialized: true });
  },

  clearAuth: () => {
    clearTokens();
    set({ user: null, initialized: true });
  },

  hydrate: () => {
    const user = getStoredUser();
    set({ user, initialized: true });
  },
}));
