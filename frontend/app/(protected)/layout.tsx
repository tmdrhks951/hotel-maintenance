'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
import NotificationBell from '@/components/notification/NotificationBell';
import QuickCreateFab from '@/components/ui/QuickCreateFab';
import type { ApiResponse, AuthUser, Role } from '@/types';
import { ROLE_LABEL } from '@/types';

// ================================================================
// 역할별 네비게이션 정의
// ================================================================

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  QC: [
    { label: 'QC 대기열', href: '/qc/queue', icon: '📋' },
    { label: 'QC 검증', href: '/qc/verify', icon: '✅' },
    { label: '작업 이력', href: '/qc/history', icon: '📜' },
    { label: '정기점검', href: '/schedules', icon: '🔄' },
    { label: '공지사항', href: '/notices', icon: '📢' },
  ],
  OPERATIONS: [
    { label: '대시보드', href: '/operations/dashboard', icon: '📊' },
    { label: '확인 대기', href: '/operations/pending', icon: '⏳' },
    { label: '요청 등록', href: '/requests/new', icon: '➕' },
    { label: '작업 이력', href: '/operations/history', icon: '📜' },
    { label: '공지사항', href: '/notices', icon: '📢' },
  ],
  ADMIN: [
    { label: 'KPI 대시보드', href: '/admin/dashboard', icon: '📊' },
    { label: '사용자 관리', href: '/admin/users', icon: '👥' },
    { label: '지점 관리', href: '/admin/branches', icon: '🏢' },
    { label: '승인 관리', href: '/admin/approvals', icon: '🔑' },
    { label: '공지사항', href: '/notices', icon: '📢' },
  ],
  VENDOR: [
    { label: '배정 작업', href: '/vendor/assignments', icon: '🔧' },
    { label: '작업 이력', href: '/vendor/history', icon: '📜' },
  ],
};

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { loadFromStorage, clearAuth, isAuthenticated, user: authUser, isLoading } = useAuthStore();
  const { setUser, user: appUser } = useAppStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // 1) localStorage에서 인증 정보 복원
  useEffect(() => {
    loadFromStorage();
    setHydrated(true);
  }, [loadFromStorage]);

  // 2) 인증 상태 확인 후 /users/me 로 유저 정보 갱신
  useEffect(() => {
    if (!hydrated || isLoading) return;

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    // appStore에 유저 정보 동기화
    if (authUser && !appUser) {
      setUser(authUser);
      // /users/me 호출하여 최신 정보로 갱신 (fire & forget)
      apiClient
        .get<ApiResponse<AuthUser>>('/users/me')
        .then(({ data }) => setUser(data.data as AuthUser))
        .catch(() => { /* 실패해도 localStorage 유저 유지 */ });
    }
  }, [hydrated, isLoading, isAuthenticated, authUser, appUser, setUser, router]);

  // 로딩 / 미인증 중에는 스피너 표시
  if (!hydrated || isLoading || !isAuthenticated || !authUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const navItems = NAV_BY_ROLE[authUser.role] ?? [];

  function handleLogout() {
    const rt = localStorage.getItem('auth_refresh_token');
    if (rt) apiClient.post('/auth/logout', { refreshToken: rt }).catch(() => {});
    clearAuth();
    setUser(null);
    router.replace('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 모바일 오버레이 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 사이드바 */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-full w-60 bg-white border-r border-gray-200 flex flex-col
          transition-transform duration-200
          lg:translate-x-0 lg:static lg:z-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* 로고 */}
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">시설관리 시스템</h2>
          <p className="text-xs text-gray-400 mt-0.5">{ROLE_LABEL[authUser.role]}</p>
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors
                  ${isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                `}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* 하단: 유저 + 로그아웃 */}
        <div className="border-t border-gray-100 px-4 py-3">
          <p className="text-sm font-medium text-gray-900 truncate">{authUser.name}</p>
          <p className="text-xs text-gray-400 truncate">{authUser.loginId ?? authUser.email}</p>
          <button
            onClick={handleLogout}
            className="mt-2 w-full text-left text-xs text-red-500 hover:text-red-700"
          >
            로그아웃
          </button>
        </div>
      </aside>

      {/* 메인 영역 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 헤더 */}
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 lg:px-6">
          {/* 모바일 햄버거 */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1 text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex-1" />

          {/* 알림벨 */}
          <NotificationBell />
        </header>

        {/* 페이지 컨텐츠 */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          {children}
          <QuickCreateFab />
        </main>
      </div>
    </div>
  );
}
