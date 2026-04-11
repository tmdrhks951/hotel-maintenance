'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { useAppStore } from '@/stores/appStore';
import type { ApiResponse, LoginResponse } from '@/types';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAppStore((s) => s.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', {
        email,
        password,
      });
      setAuth(data.data.user, data.data.accessToken, data.data.refreshToken);
      router.push('/branches');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        '로그인에 실패했습니다';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-gray-200 p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-1">호텔 시설관리 시스템</h1>
        <p className="text-sm text-gray-400 mb-6">STEP 4 — Branch / Location 관리</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@hotel.com"
              required
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p className="text-xs text-gray-400 mt-4 text-center">
          테스트: admin@hotel.com / Admin@1234!
        </p>
      </div>
    </main>
  );
}
