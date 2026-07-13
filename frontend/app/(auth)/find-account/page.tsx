'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { DEPARTMENT_LABEL, POSITION_LABEL } from '@/types';
import type { Department, Position } from '@/types';

type Tab = 'id' | 'password';

export default function FindAccountPage() {
  const [tab, setTab] = useState<Tab>('id');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-lg font-bold text-gray-900 text-center mb-1">계정 찾기</h1>
        <p className="text-xs text-gray-400 text-center mb-5">아이디 또는 비밀번호를 찾을 수 있습니다</p>

        {/* 탭 */}
        <div className="flex border-b border-gray-200 mb-5">
          {([
            { key: 'id' as Tab, label: '아이디 찾기' },
            { key: 'password' as Tab, label: '비밀번호 찾기' },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 pb-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'id' ? <FindIdForm /> : <FindPasswordForm />}

        <div className="mt-5 text-center">
          <Link href="/login" className="text-xs text-gray-400 hover:text-gray-600">
            로그인으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// 아이디 찾기 폼
// ================================================================

function FindIdForm() {
  const [name, setName] = useState('');
  const [department, setDepartment] = useState<Department>('NONE');
  const [position, setPosition] = useState<Position>('MEMBER');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState('');

  // 전화번호 인증 — 백엔드 find-login-id가 인증 완료를 요구함
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);

  async function handleSendCode() {
    setError('');
    setSendingCode(true);
    try {
      const { data } = await apiClient.post('/auth/send-code', { phone });
      setCodeSent(true);
      // 개발 환경: 응답에 코드가 포함되면 자동입력
      if (data.data?.code) setCode(data.data.code);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? '인증코드 발송에 실패했습니다');
    } finally {
      setSendingCode(false);
    }
  }

  async function handleVerifyCode() {
    setError('');
    setVerifying(true);
    try {
      await apiClient.post('/auth/verify-code', { phone, code });
      setPhoneVerified(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? '인증코드가 올바르지 않습니다');
    } finally {
      setVerifying(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!phoneVerified) {
      setError('전화번호 인증을 먼저 완료해주세요');
      return;
    }

    setLoading(true);
    try {
      const { data } = await apiClient.post('/auth/find-login-id', {
        name, department, position, phone,
      });
      setResult(data.data.loginId ?? data.data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? '일치하는 계정을 찾을 수 없습니다');
      // 인증 상태가 소비되었을 수 있으므로 재인증 유도
      setPhoneVerified(false);
      setCodeSent(false);
      setCode('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Field label="이름">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="실명 입력"
        />
      </Field>

      <Field label="부서">
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value as Department)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {Object.entries(DEPARTMENT_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </Field>

      <Field label="직급">
        <select
          value={position}
          onChange={(e) => setPosition(e.target.value as Position)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {Object.entries(POSITION_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </Field>

      <Field label="전화번호">
        <div className="flex gap-1.5">
          <input
            type="tel"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setPhoneVerified(false); setCodeSent(false); setCode(''); }}
            required
            disabled={phoneVerified}
            className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            placeholder="010-0000-0000"
          />
          <button
            type="button"
            onClick={handleSendCode}
            disabled={sendingCode || !phone || phoneVerified}
            className="px-3 py-2 text-xs font-medium bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 whitespace-nowrap"
          >
            {phoneVerified ? '인증 완료' : sendingCode ? '발송 중' : codeSent ? '재발송' : '인증코드 발송'}
          </button>
        </div>
      </Field>

      {codeSent && !phoneVerified && (
        <Field label="인증코드">
          <div className="flex gap-1.5">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
              className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="6자리 입력"
            />
            <button
              type="button"
              onClick={handleVerifyCode}
              disabled={verifying || code.length !== 6}
              className="px-3 py-2 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
            >
              {verifying ? '확인 중' : '확인'}
            </button>
          </div>
        </Field>
      )}

      {phoneVerified && !result && (
        <p className="text-xs text-green-600">✅ 전화번호 인증이 완료되었습니다</p>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      {result && (
        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">회원님의 아이디</p>
          <p className="text-base font-bold text-blue-700">{String(result)}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !name || !phone || !phoneVerified}
        className="w-full bg-blue-600 text-white text-sm font-medium py-2.5 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? '조회 중...' : '아이디 찾기'}
      </button>
    </form>
  );
}

// ================================================================
// 비밀번호 찾기 폼
// ================================================================

function FindPasswordForm() {
  const [loginId, setLoginId] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState<Department>('NONE');
  const [position, setPosition] = useState<Position>('MEMBER');
  const [answer1, setAnswer1] = useState('');
  const [answer2, setAnswer2] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      await apiClient.post('/auth/request-password-reset', {
        loginId,
        name,
        department,
        position,
        securityAnswer1: answer1,
        securityAnswer2: answer2,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? '비밀번호 재설정 요청에 실패했습니다');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="text-center py-6">
        <div className="text-3xl mb-3">✅</div>
        <h3 className="text-sm font-bold text-gray-900 mb-1">요청이 접수되었습니다</h3>
        <p className="text-xs text-gray-400 leading-relaxed">
          관리자가 비밀번호 재설정 요청을 확인한 후<br />
          초기화된 비밀번호를 안내해 드립니다.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Field label="아이디">
        <input
          type="text"
          value={loginId}
          onChange={(e) => setLoginId(e.target.value)}
          required
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="로그인 아이디"
        />
      </Field>

      <Field label="이름">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="실명 입력"
        />
      </Field>

      <Field label="부서">
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value as Department)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {Object.entries(DEPARTMENT_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </Field>

      <Field label="직급">
        <select
          value={position}
          onChange={(e) => setPosition(e.target.value as Position)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {Object.entries(POSITION_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </Field>

      <Field label="보안 답변 1">
        <input
          type="text"
          value={answer1}
          onChange={(e) => setAnswer1(e.target.value)}
          required
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="가입 시 설정한 보안 답변"
        />
      </Field>

      <Field label="보안 답변 2">
        <input
          type="text"
          value={answer2}
          onChange={(e) => setAnswer2(e.target.value)}
          required
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="가입 시 설정한 보안 답변"
        />
      </Field>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={loading || !loginId || !name || !answer1 || !answer2}
        className="w-full bg-blue-600 text-white text-sm font-medium py-2.5 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? '요청 중...' : '비밀번호 재설정 요청'}
      </button>
    </form>
  );
}

// ================================================================
// 공통 필드 래퍼
// ================================================================

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}
