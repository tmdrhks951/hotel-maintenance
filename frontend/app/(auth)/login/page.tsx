'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { ApiResponse, LoginResponse, Role } from '@/types';

function getRoleHome(role: Role): string {
  switch (role) {
    case 'QC': return '/qc/queue';
    case 'OPERATIONS': return '/operations/dashboard';
    case 'ADMIN': return '/admin/dashboard';
    case 'VENDOR': return '/vendor/assignments';
    default: return '/';
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, user, setAuth, loadFromStorage } = useAuthStore();

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // 저장된 아이디/비밀번호 불러오기
  useEffect(() => {
    try {
      const saved = localStorage.getItem('saved_credentials');
      if (saved) {
        const { loginId: savedId, password: savedPw } = JSON.parse(saved);
        setLoginId(savedId || '');
        setPassword(savedPw || '');
        setRememberMe(true);
      }
    } catch { /* ignore */ }
  }, []);

  // 이미 로그인 상태면 역할별 홈으로 이동
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (isAuthenticated && user) {
      router.replace(getRoleHome(user.role));
    }
  }, [isAuthenticated, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!loginId.trim() || !password.trim()) {
      setError('아이디와 비밀번호를 입력해주세요');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { data } = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', {
        loginId: loginId.trim(),
        password,
      });
      // 아이디/비밀번호 저장
      if (rememberMe) {
        localStorage.setItem('saved_credentials', JSON.stringify({ loginId: loginId.trim(), password }));
      } else {
        localStorage.removeItem('saved_credentials');
      }
      setAuth(data.data);
      router.replace(getRoleHome(data.data.user.role));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? '로그인에 실패했습니다';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-gray-50">
      {/* 은은한 배경 광원 — 차분한 포인트 */}
      <div className="pointer-events-none absolute -top-40 -left-32 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-indigo-400/15 blur-3xl" />

      <div className="relative bg-white/80 backdrop-blur-2xl rounded-3xl shadow-xl ring-1 ring-black/[0.04] p-9 w-full max-w-sm animate-modal-pop">
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-1.5">로그인</h1>
        <p className="text-sm text-gray-400 mb-7">호텔 시설관리 시스템</p>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 ring-1 ring-inset ring-red-100 rounded-xl px-3.5 py-2.5 mb-4 animate-fade-in">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-gray-600 mb-1.5">아이디</label>
            <input
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="아이디 또는 이메일"
              autoComplete="username"
              className="w-full bg-gray-50/80 border border-black/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-transparent focus:bg-white transition"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-gray-600 mb-1.5">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              autoComplete="current-password"
              className="w-full bg-gray-50/80 border border-black/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-transparent focus:bg-white transition"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => {
                setRememberMe(e.target.checked);
                if (!e.target.checked) localStorage.removeItem('saved_credentials');
              }}
              className="accent-blue-600 w-4 h-4 rounded"
            />
            <span className="text-[13px] text-gray-500">아이디/비밀번호 저장</span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-xl px-4 py-3 text-sm font-medium shadow-sm hover:bg-blue-700 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="flex items-center justify-between mt-6">
          <Link href="/signup" className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors">
            회원가입
          </Link>
          <Link href="/find-account" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            아이디/비밀번호 찾기
          </Link>
        </div>
      </div>
    </main>
  );
}
