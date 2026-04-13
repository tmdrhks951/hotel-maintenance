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

export default function FindPasswordPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loginId, setLoginId] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState<Department>('OPERATIONS_1');
  const [position, setPosition] = useState<Position>('MEMBER');
  const [securityQuestion1, setSecurityQuestion1] = useState('');
  const [securityQuestion2, setSecurityQuestion2] = useState('');
  const [securityAnswer1, setSecurityAnswer1] = useState('');
  const [securityAnswer2, setSecurityAnswer2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleFetchQuestions() {
    if (!loginId.trim()) { setError('아이디를 입력해주세요'); return; }
    if (!name.trim()) { setError('이름을 입력해주세요'); return; }
    setError('');
    setLoading(true);
    try {
      const { data } = await apiClient.get<{
        success: boolean;
        data: { securityQuestion1: string; securityQuestion2: string };
      }>(`/auth/security-questions?loginId=${encodeURIComponent(loginId.trim())}`);
      setSecurityQuestion1(data.data.securityQuestion1 ?? '');
      setSecurityQuestion2(data.data.securityQuestion2 ?? '');
      setStep(2);
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '계정을 찾을 수 없습니다');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!securityAnswer1.trim() || !securityAnswer2.trim()) {
      setError('보안 답변을 모두 입력해주세요');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await apiClient.post('/auth/request-password-reset', {
        loginId: loginId.trim(),
        name: name.trim(),
        department,
        position,
        securityAnswer1: securityAnswer1.trim(),
        securityAnswer2: securityAnswer2.trim(),
      });
      setStep(3);
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '요청 실패');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-gray-200 p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-1">비밀번호 찾기</h1>
        <p className="text-sm text-gray-400 mb-6">보안 질문 인증 후 재설정 요청</p>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mb-4">
            {error}
          </p>
        )}

        {step === 3 ? (
          <div className="text-center space-y-4">
            <div className="text-4xl">📋</div>
            <h2 className="text-base font-semibold text-gray-900">재설정 요청 완료</h2>
            <p className="text-sm text-gray-500">
              관리자가 확인 후 임시 비밀번호를 알려드립니다.<br />
              승인되면 임시 비밀번호로 로그인하세요.
            </p>
            <Link
              href="/login"
              className="w-full inline-block bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700 text-center"
            >
              로그인 페이지로
            </Link>
          </div>
        ) : step === 1 ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">아이디</label>
              <input
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="아이디 입력"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
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
              onClick={handleFetchQuestions}
              disabled={loading}
              className="w-full bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '확인 중...' : '다음'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">보안 질문 1</label>
              <p className="text-sm font-medium text-gray-800 bg-gray-50 rounded px-3 py-2">{securityQuestion1}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">답변 1</label>
              <input
                type="text"
                value={securityAnswer1}
                onChange={(e) => setSecurityAnswer1(e.target.value)}
                placeholder="답변 입력"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">보안 질문 2</label>
              <p className="text-sm font-medium text-gray-800 bg-gray-50 rounded px-3 py-2">{securityQuestion2}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">답변 2</label>
              <input
                type="text"
                value={securityAnswer2}
                onChange={(e) => setSecurityAnswer2(e.target.value)}
                placeholder="답변 입력"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setError(''); setStep(1); }}
                className="flex-1 border border-gray-300 text-gray-600 rounded px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                이전
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? '처리 중...' : '재설정 요청'}
              </button>
            </div>
          </div>
        )}

        <div className="mt-5 flex justify-center gap-4 text-xs text-gray-400">
          <Link href="/login" className="hover:text-blue-500 hover:underline">로그인</Link>
          <span>·</span>
          <Link href="/find-id" className="hover:text-blue-500 hover:underline">아이디 찾기</Link>
        </div>
      </div>
    </main>
  );
}
