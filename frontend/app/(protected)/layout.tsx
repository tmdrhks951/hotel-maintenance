'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/stores/appStore';
import { useUnreadCount } from '@/hooks/useNotifications';
import { useNotificationSSE } from '@/hooks/useNotificationSSE';

// ================================================================
// 알림 벨
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
// SSE 연결 컴포넌트
// ================================================================

function SseConnector({ enabled }: { enabled: boolean }) {
  useNotificationSSE(enabled);
  return null;
}

// ================================================================
// 네비게이션 링크 정의
// ================================================================

interface NavItem {
  href: string;
  label: string;
}

function getNavItems(role: string): NavItem[] {
  switch (role) {
    case 'OPERATIONS':
      return [
        { href: '/camera',          label: '요청 등록' },
        { href: '/operations',      label: '작업 확인' },
        { href: '/admin/reports',   label: '리포트' },
      ];
    case 'QC':
      return [
        { href: '/qc', label: 'QC 큐' },
      ];
    case 'ADMIN':
      return [
        { href: '/branches',        label: '지점 관리' },
        { href: '/qc',              label: 'QC 큐' },
        { href: '/operations',      label: '작업 확인' },
        { href: '/admin/reports',   label: '리포트' },
        { href: '/admin/users',     label: '사용자' },
        { href: '/admin',           label: '관리' },
      ];
    default:
      return [];
  }
}

// ================================================================
// Protected Layout
// ================================================================

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, initialized, hydrate, clearAuth } = useAppStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // 라우트 변경 시 모바일 메뉴 닫기
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [children]);

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

  const navItems = getNavItems(user.role);

  return (
    <div className="min-h-screen bg-gray-50">
      <SseConnector enabled={!!user} />

      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* 좌측: 로고 + 데스크톱 네비 + 모바일 햄버거 */}
          <div className="flex items-center gap-3">
            <span className="font-bold text-gray-900 text-sm">호텔 시설관리</span>

            {/* 데스크톱 네비 */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="text-sm text-gray-600 hover:text-blue-600 px-2 py-1 rounded hover:bg-gray-50"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            {/* 모바일 햄버거 */}
            {navItems.length > 0 && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden text-gray-600 hover:text-gray-900 p-1"
                aria-label="메뉴"
              >
                {mobileMenuOpen ? '✕' : '☰'}
              </button>
            )}
          </div>

          {/* 우측: 벨 + 사용자 + 로그아웃 */}
          <div className="flex items-center gap-2 sm:gap-4">
            <NotificationBell />
            <span className="text-xs text-gray-500 hidden sm:inline">
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

        {/* 모바일 드롭다운 메뉴 */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-gray-100 bg-gray-50 px-4 py-2 space-y-1">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="block text-sm text-gray-700 hover:text-blue-600 hover:bg-white px-3 py-2 rounded-lg"
              >
                {item.label}
              </a>
            ))}
          </nav>
        )}
      </header>

      <main className="max-w-5xl mx-auto px-4 py-4 sm:py-6">{children}</main>
    </div>
  );
}
