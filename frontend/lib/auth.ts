'use client';

import type { AuthUser } from '@/types';

const ACCESS_TOKEN_KEY = 'hotel_access_token';
const REFRESH_TOKEN_KEY = 'hotel_refresh_token';
const USER_KEY = 'hotel_user';

// ----------------------------------------------------------------
// Token storage (localStorage)
// ----------------------------------------------------------------

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// ----------------------------------------------------------------
// User storage
// ----------------------------------------------------------------

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// ----------------------------------------------------------------
// 권한 헬퍼
// ----------------------------------------------------------------

export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === 'ADMIN';
}

/** 팀장/부팀장 여부 — 전체 지점 접근 가능 */
export function isLeader(user: AuthUser | null): boolean {
  return user?.position === 'TEAM_LEADER' || user?.position === 'DEPUTY_LEADER';
}

/** Branch 생성/수정 가능 여부 */
export function canManageBranch(user: AuthUser | null): boolean {
  return isAdmin(user);
}

/** Location 생성/수정 가능 여부 */
export function canManageLocation(user: AuthUser | null): boolean {
  return isAdmin(user);
}
