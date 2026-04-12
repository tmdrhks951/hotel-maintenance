'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/stores/appStore';
import { useUnreadCount } from '@/hooks/useNotifications';
import { useNotificationSSE } from '@/hooks/useNotificationSSE';

// ================================================================
// 알림 벨 (unread count — SSE가 실시간 갱신, 폴링은 fallback)
// ================================================================

function NotificationBell() {
  const { data } = useUnreadCount();
  const count = data?.count ?? 0;
  return (
    <a
      href="/notifications"
      className="relative text-sm text-gray-600 hover:text-blue-600 flex items-center"
      title="알림"
    >
      🔔
      {count > 0 && (
        <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 leading-none">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </a>
  );
}

// ================================================================
// 공통 nav 구분선
// ================================================================

function Sep() {
  return <span className="text-gray-300">|</span>;
}

// ================================================================
// Protected Layout
// ================================================================

// ================================================================
// SSE 연결 컴포넌트 — 로그인된 동안 상시 연결 유지
// ================================================================

function SseConnector({ enabled }: { enabled: boolean }) {
  useNotificationSSE(enabled);
  return null;
}

// ================================================================
// Protected Layout
// ================================================================

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, initialized, hydrate, clearAuth } = useAppStore();

  useEffect(() => {
    if (!initialized) hydrate();
  }, [initialized, hydrate]);

  useEffect(() => {
    function handleLogout() {
      clearAuth();
      router.push('/login');
    }
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, [clearAuth, router]);

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">로딩 중...</p>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* SSE 연결 — 로그인 상태에서만 활성화 */}
      <SseConnector enabled={!!user} />

      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-gray-900 text-sm">호텔 시설관리</span>

            {user.role === 'OPERATIONS' && (
              <>
                <Sep />
                <a href="/camera" className="text-sm text-gray-600 hover:text-blue-600">요청 등록</a>
                <Sep />
                <a href="/operations" className="text-sm text-gray-600 hover:text-blue-600">작업 확인</a>
              </>
            )}

            {user.role === 'QC' && (
              <>
                <Sep />
                <a href="/qc" className="text-sm text-gray-600 hover:text-blue-600">QC 큐</a>
              </>
            )}

            {user.role === 'ADMIN' && (
              <>
                <Sep />
                <a href="/branches" className="text-sm text-gray-600 hover:text-blue-600">지점 관리</a>
                <Sep />
                <a href="/qc" className="text-sm text-gray-600 hover:text-blue-600">QC 큐</a>
                <Sep />
                <a href="/operations" className="text-sm text-gray-600 hover:text-blue-600">작업 확인</a>
                <Sep />
                <a href="/admin/users" className="text-sm text-gray-600 hover:text-blue-600">사용자</a>
                <Sep />
                <a href="/admin" className="text-sm text-gray-600 hover:text-blue-600">관리</a>
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* 알림 벨 — 모든 역할 */}
            <NotificationBell />
            <span className="text-xs text-gray-500">
              {user.name}
              <span className="ml-1 text-gray-400">({user.role})</span>
            </span>
            <button
              onClick={() => {
                clearAuth();
                router.push('/login');
              }}
              className="text-xs text-gray-500 hover:text-red-600"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
