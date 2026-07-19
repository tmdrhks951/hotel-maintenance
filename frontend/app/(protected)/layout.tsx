'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
import NotificationBell from '@/components/notification/NotificationBell';
import QuickCreateFab from '@/components/ui/QuickCreateFab';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import { useSse } from '@/hooks/useSse';
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
    { label: '객실 체크아웃', href: '/checkout', icon: '🚪' },
    { label: '작업 이력', href: '/qc/history', icon: '📜' },
    { label: '정기점검', href: '/schedules', icon: '🔄' },
    { label: '공지사항', href: '/notices', icon: '📢' },
  ],
  OPERATIONS: [
    { label: '대시보드', href: '/operations/dashboard', icon: '📊' },
    { label: '확인 대기', href: '/operations/pending', icon: '⏳' },
    { label: '요청 등록', href: '/requests/new', icon: '➕' },
    { label: '객실 체크아웃', href: '/checkout', icon: '🚪' },
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

// 역할별 접근 가능 경로 prefix — 미허용 경로 진입 시 역할 홈으로 리다이렉트
const ROUTE_GUARDS: Array<{ prefix: string; roles: Role[] }> = [
  { prefix: '/admin', roles: ['ADMIN'] },
  { prefix: '/qc', roles: ['QC', 'ADMIN'] },
  { prefix: '/operations', roles: ['OPERATIONS', 'ADMIN'] },
  { prefix: '/vendor', roles: ['VENDOR', 'ADMIN'] },
];

function roleHome(role: Role): string {
  return NAV_BY_ROLE[role]?.[0]?.href ?? '/login';
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { loadFromStorage, clearAuth, isAuthenticated, user: authUser, isLoading } = useAuthStore();
  const { setUser, user: appUser } = useAppStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [pwToast, setPwToast] = useState('');

  // SSE 실시간 알림 연결
  useSse();

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

  // 3) 역할 기반 라우트 가드 — 미허용 경로 진입 시 역할 홈으로
  useEffect(() => {
    if (!hydrated || isLoading || !isAuthenticated || !authUser) return;
    const guard = ROUTE_GUARDS.find((g) => pathname.startsWith(g.prefix));
    if (guard && !guard.roles.includes(authUser.role)) {
      router.replace(roleHome(authUser.role));
    }
  }, [hydrated, isLoading, isAuthenticated, authUser, pathname, router]);

  // 로딩 / 미인증 중에는 스피너 표시
  if (!hydrated || isLoading || !isAuthenticated || !authUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // 리다이렉트 대기 중 보호 콘텐츠가 잠깐 렌더링되지 않도록 차단
  const activeGuard = ROUTE_GUARDS.find((g) => pathname.startsWith(g.prefix));
  if (activeGuard && !activeGuard.roles.includes(authUser.role)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const navItems = NAV_BY_ROLE[authUser.role] ?? [];

  function handleLogout() {
    // refresh token은 httpOnly 쿠키 — 서버가 쿠키를 읽어 무효화하고 삭제한다
    apiClient.post('/auth/logout', {}).catch(() => {});
    clearAuth();
    setUser(null);
    router.replace('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 모바일 오버레이 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/25 backdrop-blur-sm z-30 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 사이드바 — 반투명 재질 */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-full w-64 flex flex-col
          bg-white/80 backdrop-blur-xl border-r border-black/5
          transition-transform duration-300 ease-out
          lg:translate-x-0 lg:static lg:z-auto
          ${sidebarOpen ? 'translate-x-0 shadow-xl lg:shadow-none' : '-translate-x-full'}
        `}
      >
        {/* 로고 */}
        <div className="px-5 pt-5 pb-4">
          <h2 className="text-[15px] font-semibold text-gray-900 tracking-tight">시설관리 시스템</h2>
          <p className="text-xs text-gray-400 mt-0.5">{ROLE_LABEL[authUser.role]}</p>
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  group flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200
                  ${isActive
                    ? 'bg-blue-600 text-white font-medium shadow-sm'
                    : 'text-gray-600 hover:bg-black/[0.04] hover:text-gray-900'}
                `}
              >
                <span className={`text-base transition-transform duration-200 ${isActive ? '' : 'group-hover:scale-110'}`}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* 하단: 유저 + 비밀번호 변경 + 로그아웃 */}
        <div className="border-t border-black/5 px-4 py-3.5">
          <p className="text-sm font-medium text-gray-900 truncate">{authUser.name}</p>
          <p className="text-xs text-gray-400 truncate">{authUser.loginId ?? authUser.email}</p>
          <div className="mt-2.5 flex items-center gap-2.5">
            <button
              onClick={() => setShowChangePassword(true)}
              className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
            >
              비밀번호 변경
            </button>
            <span className="text-gray-200">·</span>
            <button
              onClick={handleLogout}
              className="text-xs text-red-500 hover:text-red-600 transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>
      </aside>

      {/* 메인 영역 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 헤더 — 반투명, 아래 콘텐츠가 비쳐 흐름 */}
        <header className="sticky top-0 z-20 bg-gray-50/70 backdrop-blur-xl px-4 h-14 flex items-center gap-3 lg:px-6 border-b border-black/[0.06]">
          {/* 모바일 햄버거 */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden -ml-1 p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-black/[0.04]"
          >
            <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex-1" />

          {/* 알림벨 */}
          <NotificationBell />
        </header>

        {/* 페이지 컨텐츠 */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
          <QuickCreateFab />
        </main>
      </div>

      {/* 비밀번호 변경 모달 */}
      <ChangePasswordModal
        open={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        onSuccess={() => {
          setPwToast('비밀번호가 변경되었습니다');
          setTimeout(() => setPwToast(''), 3000);
        }}
      />
      {pwToast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-gray-900/90 backdrop-blur-md text-white text-sm px-4 py-2.5 rounded-full shadow-lg animate-modal-pop">
          {pwToast}
        </div>
      )}
    </div>
  );
}
