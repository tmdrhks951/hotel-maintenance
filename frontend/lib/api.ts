import axios from 'axios';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

// ================================================================
// 토큰 갱신 전용 axios 인스턴스 (인터셉터 무한 루프 방지)
// ================================================================

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

// ================================================================
// 동시 다발적 401 시 refresh 한 번만 수행하기 위한 뮤텍스
// ================================================================

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

// ================================================================
// Request 인터셉터 — Authorization 헤더 자동 첨부
// ================================================================

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ================================================================
// Response 인터셉터 — 401 시 토큰 갱신, 실패 시 로그아웃
// ================================================================

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 401이 아닌 에러 또는 이미 재시도한 요청은 그대로 throw
    if (!error.response || error.response.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // refresh 엔드포인트 자체의 401은 로그아웃
    if (originalRequest.url?.includes('/auth/refresh')) {
      forceLogout();
      return Promise.reject(error);
    }

    // 이미 refresh 진행 중이면 대기열에 추가
    if (isRefreshing) {
      return new Promise((resolve) => {
        subscribeTokenRefresh((token: string) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          originalRequest._retry = true;
          resolve(apiClient(originalRequest));
        });
      });
    }

    isRefreshing = true;
    originalRequest._retry = true;

    try {
      const storedRefreshToken = localStorage.getItem('auth_refresh_token');
      if (!storedRefreshToken) {
        forceLogout();
        return Promise.reject(error);
      }

      const { data } = await refreshClient.post('/auth/refresh', {
        refreshToken: storedRefreshToken,
      });

      const { accessToken, refreshToken } = data.data;
      localStorage.setItem('auth_access_token', accessToken);
      localStorage.setItem('auth_refresh_token', refreshToken);

      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      onTokenRefreshed(accessToken);

      return apiClient(originalRequest);
    } catch {
      forceLogout();
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  },
);

function forceLogout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_access_token');
    localStorage.removeItem('auth_refresh_token');
    localStorage.removeItem('auth_user');
    window.location.href = '/login';
  }
}
