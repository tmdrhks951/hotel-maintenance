'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import type { Department, Position } from '@/types';

const DEPARTMENT_OPTIONS: { value: Department; label: string }[] = [
  { value: 'OPERATIONS_1', label: '운영1팀' },
  { value: 'OPERATIONS_2', label: '운영2팀' },
  { value: 'OPERATIONS_3', label: '운영3팀' },
  { value: 'QC_1', label: 'QC1팀' },
  { value: 'QC_3', label: 'QC3팀' },
  { value: 'NONE', label: '해당없음' },
];

const POSITION_OPTIONS: { value: Position; label: string }[] = [
  { value: 'TEAM_LEADER', label: '팀장' },
  { value: 'DEPUTY_LEADER', label: '부팀장' },
  { value: 'MEMBER', label: '팀원' },
  { value: 'OTHER', label: '기타' },
];

export default function FindIdPage() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [name, setName] = useState('');
  const [department, setDepartment] = useState<Department>('OPERATIONS_1');
  const [position, setPosition] = useState<Position>('MEMBER');
  const [foundId, setFoundId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSendCode() {
    if (!phone.trim()) { setError('전화번호를 입력해주세요'); return; }
    setError('');
    setLoading(true);
    try {
      await apiClient.post('/auth/send-code', { phone: phone.trim() });
      setCodeSent(true);
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '발송 실패');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode() {
    if (!code.trim()) { setError('인증코드를 입력해주세요'); return; }
    setError('');
    setLoading(true);
    try {
      await apiClient.post('/auth/verify-code', { phone: phone.trim(), code: code.trim() });
      setPhoneVerified(true);
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '인증 실패');
    } finally {
      setLoading(false);
    }
  }

  async function handleFindId() {
    if (!name.trim()) { setError('이름을 입력해주세요'); return; }
    setError('');
    setLoading(true);
    try {
      const { data } = await apiClient.post<{ success: boolean; data: { loginId: string } }>(
        '/auth/find-login-id',
        { name: name.trim(), department, position, phone: phone.trim() },
      );
      setFoundId(data.data.loginId);
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '아이디 찾기 실패');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-gray-200 p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-1">아이디 찾기</h1>
        <p className="text-sm text-gray-400 mb-6">전화번호 인증 후 아이디를 확인하세요</p>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mb-4">
            {error}
          </p>
        )}

        {foundId ? (
          <div className="text-center space-y-4">
            <p className="text-sm text-gray-600">회원님의 아이디는</p>
            <p className="text-lg font-bold text-blue-600 bg-blue-50 rounded px-4 py-3">{foundId}</p>
            <p className="text-sm text-gray-400">입니다.</p>
            <Link
              href="/login"
              className="w-full inline-block bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700 text-center"
            >
              로그인하러 가기
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 전화번호 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01012345678"
                  disabled={phoneVerified}
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                />
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={loading || phoneVerified}
                  className="px-3 py-2 text-xs font-medium bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 whitespace-nowrap"
                >
                  {codeSent ? '재발송' : '인증코드 발송'}
                </button>
              </div>
            </div>

            {codeSent && !phoneVerified && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">인증코드</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="6자리"
                    maxLength={6}
                    className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyCode}
                    disabled={loading}
                    className="px-3 py-2 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    확인
                  </button>
                </div>
              </div>
            )}

            {phoneVerified && (
              <>
                <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded px-3 py-2">
                  ✅ 전화번호 인증 완료
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="홍길동"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">부서</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value as Department)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {DEPARTMENT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">직위</label>
                  <select
                    value={position}
                    onChange={(e) => setPosition(e.target.value as Position)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {POSITION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleFindId}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? '검색 중...' : '아이디 찾기'}
                </button>
              </>
            )}
          </div>
        )}

        <div className="mt-5 flex justify-center gap-4 text-xs text-gray-400">
          <Link href="/login" className="hover:text-blue-500 hover:underline">로그인</Link>
          <span>·</span>
          <Link href="/find-password" className="hover:text-blue-500 hover:underline">비밀번호 찾기</Link>
        </div>
      </div>
    </main>
  );
}
