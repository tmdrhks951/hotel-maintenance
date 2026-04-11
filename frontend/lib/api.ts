import axios from 'axios';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '@/lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

// ----------------------------------------------------------------
// Request interceptor — Authorization 헤더 주입
// ----------------------------------------------------------------

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ----------------------------------------------------------------
// Response interceptor — 401 시 refresh 시도 → 실패 시 로그아웃
// ----------------------------------------------------------------

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      // 이미 refresh 중이면 큐에 넣고 대기
      return new Promise((resolve) => {
        refreshQueue.push((newToken: string) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          resolve(apiClient(originalRequest));
        });
      });
    }

    isRefreshing = true;

    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) throw new Error('no_refresh_token');

      const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
      const { accessToken, refreshToken: newRefreshToken } = data.data;

      setTokens(accessToken, newRefreshToken);

      // 대기 중인 요청 처리
      refreshQueue.forEach((cb) => cb(accessToken));
      refreshQueue = [];

      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return apiClient(originalRequest);
    } catch {
      clearTokens();
      refreshQueue = [];
      // store는 직접 접근 불가(circular) → 이벤트로 처리
      window.dispatchEvent(new Event('auth:logout'));
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  },
);
