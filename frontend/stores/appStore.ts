import { create } from 'zustand';
import type { AuthUser } from '@/types';

interface AppState {
  initialized: boolean;
  setInitialized: (value: boolean) => void;

  // 인증된 사용자 정보 (protected layout에서 hydrate)
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  initialized: false,
  setInitialized: (value) => set({ initialized: value }),

  user: null,
  setUser: (user) => set({ user }),
}));
