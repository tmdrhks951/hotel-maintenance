'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/stores/appStore';

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
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-gray-900 text-sm">호텔 시설관리</span>
            {user.role === 'OPERATIONS' ? (
              <>
                <span className="text-gray-300">|</span>
                <a href="/camera" className="text-sm text-gray-600 hover:text-blue-600">
                  요청 등록
                </a>
              </>
            ) : user.role === 'QC' ? (
              <>
                <span className="text-gray-300">|</span>
                <a href="/qc" className="text-sm text-gray-600 hover:text-blue-600">
                  QC 큐
                </a>
              </>
            ) : (
              // ADMIN 및 기타 역할
              <>
                <span className="text-gray-300">|</span>
                <a href="/branches" className="text-sm text-gray-600 hover:text-blue-600">
                  지점 관리
                </a>
                <span className="text-gray-300">|</span>
                <a href="/qc" className="text-sm text-gray-600 hover:text-blue-600">
                  QC 큐
                </a>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
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
