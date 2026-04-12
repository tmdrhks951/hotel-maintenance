'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { useBranches } from '@/hooks/useBranches';
import type { ApiResponse, Role, Position, Department } from '@/types';

type Step = 1 | 2 | 3 | 4;

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'OPERATIONS', label: '운영팀' },
  { value: 'QC', label: 'QC' },
  { value: 'VENDOR', label: '외부업체' },
];

const DEPARTMENT_BY_ROLE: Record<Role, { value: Department; label: string }[]> = {
  OPERATIONS: [
    { value: 'OPERATIONS_1', label: '운영1팀' },
    { value: 'OPERATIONS_2', label: '운영2팀' },
    { value: 'OPERATIONS_3', label: '운영3팀' },
  ],
  QC: [
    { value: 'QC_1', label: 'QC1팀' },
    { value: 'QC_3', label: 'QC3팀' },
  ],
  VENDOR: [{ value: 'NONE', label: '해당없음' }],
  ADMIN: [{ value: 'NONE', label: '해당없음' }],
};

const POSITION_OPTIONS: { value: Position; label: string }[] = [
  { value: 'TEAM_LEADER', label: '팀장' },
  { value: 'DEPUTY_LEADER', label: '부팀장' },
  { value: 'MEMBER', label: '팀원' },
  { value: 'OTHER', label: '기타' },
];

const SECURITY_QUESTIONS = [
  '첫 번째 애완동물의 이름은?',
  '초등학교 이름은?',
  '어머니의 성함은?',
  '출생 도시는?',
  '좋아하는 음식은?',
  '첫 직장 이름은?',
];

export default function SignupPage() {
  const router = useRouter();
  const { data: branches } = useBranches(true);

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(false);

  // Step 1: 전화번호 인증
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);

  // Step 2: 기본 정보
  const [loginIdPrefix, setLoginIdPrefix] = useState('');
  const [idCheckState, setIdCheckState] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Step 3: 소속 정보
  const [role, setRole] = useState<Role>('OPERATIONS');
  const [department, setDepartment] = useState<Department>('OPERATIONS_1');
  const [position, setPosition] = useState<Position>('MEMBER');
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]); // 수동 선택

  // Step 4: 보안 질문
  const [securityQuestion1, setSecurityQuestion1] = useState(SECURITY_QUESTIONS[0]);
  const [securityAnswer1, setSecurityAnswer1] = useState('');
  const [securityQuestion2, setSecurityQuestion2] = useState(SECURITY_QUESTIONS[1]);
  const [securityAnswer2, setSecurityAnswer2] = useState('');

  // ----------------------------------------------------------------
  // 지점 자동 묶음 — 트리거 지점 선택 시 연결 지점 자동 선택
  // key: branch.code, value: 자동 포함될 branch.code[]
  // ----------------------------------------------------------------
  const BRANCH_AUTO_LINKS: Record<string, string[]> = {
    MYEONGDONG1: ['GUKDO', 'SOA', 'KAWAUSO2'],
    MYEONGDONG2: ['GUKDO', 'SOA', 'KAWAUSO2'],
    MYEONGDONG3: ['GUKDO', 'SOA', 'KAWAUSO2'],
    DEOKSUGUNG:  ['KAWAUSO3'],
    SADANG:      ['KAWAUSO1'],
  };

  // 카와우소 별칭 (회원가입 전용 표시)
  const KAWAUSO_ALIAS: Record<string, string> = {
    KAWAUSO1: '카와우소 1 (사당)',
    KAWAUSO2: '카와우소 2 (명동)',
    KAWAUSO3: '카와우소 3 (덕수궁)',
  };

  // 회원가입 지점 목록 순서 (상단 고정 코드)
  const SIGNUP_TOP_CODES = ['KAWAUSO1', 'KAWAUSO2', 'KAWAUSO3', 'SOA', 'GUKDO'];

  // 모든 지점을 플랫하게 나열 + 카와우소 별칭 적용
  const allBranches = (branches ?? []).flatMap((b) => {
    const children = b.children ?? [];
    if (children.length === 0) {
      return [{ ...b, name: KAWAUSO_ALIAS[b.code] ?? b.name }];
    }
    // 자식이 있으면 자식만 표시 (부모는 그룹 헤더이므로 제외)
    return children.map((c) => ({
      ...c,
      name: KAWAUSO_ALIAS[c.code] ?? c.name,
    }));
  });

  // 회원가입 전용 정렬: 상단 고정 → 나머지는 API 순서(sortOrder) 유지
  const flatBranches = [...allBranches].sort((a, b) => {
    const ai = SIGNUP_TOP_CODES.indexOf(a.code);
    const bi = SIGNUP_TOP_CODES.indexOf(b.code);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return 0;
  });

  // 자동 연결 지점 계산
  const autoLinkedIds = new Set<string>();
  for (const id of selectedBranchIds) {
    const br = flatBranches.find((b) => b.id === id);
    if (br && BRANCH_AUTO_LINKS[br.code]) {
      for (const code of BRANCH_AUTO_LINKS[br.code]) {
        const linked = flatBranches.find((b) => b.code === code);
        if (linked) autoLinkedIds.add(linked.id);
      }
    }
  }

  // 화면 표시용 (flatBranches 기준)
  const displayBranchIds = [...new Set([...selectedBranchIds, ...autoLinkedIds])];

  // 서버 전송용: 선택 + 자동연결 지점 ID 목록
  const effectiveBranchIds = displayBranchIds;

  function toggleBranch(id: string) {
    if (autoLinkedIds.has(id)) return; // 자동 연결된 지점은 직접 토글 불가
    setSelectedBranchIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleCheckLoginId() {
    if (!loginIdPrefix.trim()) { setError('아이디를 입력해주세요'); return; }
    if (!/^[a-zA-Z0-9._-]+$/.test(loginIdPrefix)) { setError('아이디는 영문, 숫자, ., -, _ 만 사용 가능합니다'); return; }
    setError('');
    setIdCheckState('checking');
    try {
      const { data } = await apiClient.get<{ success: boolean; data: { available: boolean } }>(
        `/auth/check-login-id?loginId=${encodeURIComponent(loginIdPrefix.trim())}`,
      );
      setIdCheckState(data.data.available ? 'available' : 'taken');
    } catch {
      setIdCheckState('idle');
      setError('중복 확인 중 오류가 발생했습니다');
    }
  }

  async function handleSendCode() {
    if (!phone.trim()) { setError('전화번호를 입력해주세요'); return; }
    setError('');
    setCodeLoading(true);
    try {
      await apiClient.post('/auth/send-code', { phone: phone.trim() });
      setCodeSent(true);
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '인증코드 발송 실패');
    } finally {
      setCodeLoading(false);
    }
  }

  async function handleVerifyCode() {
    if (!code.trim()) { setError('인증코드를 입력해주세요'); return; }
    setError('');
    setCodeLoading(true);
    try {
      await apiClient.post('/auth/verify-code', { phone: phone.trim(), code: code.trim() });
      setPhoneVerified(true);
      setError('');
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '인증코드 검증 실패');
    } finally {
      setCodeLoading(false);
    }
  }

  function validateStep2() {
    if (!loginIdPrefix.trim()) return '아이디를 입력해주세요';
    if (!/^[a-zA-Z0-9._-]+$/.test(loginIdPrefix)) return '아이디는 영문, 숫자, ., -, _ 만 사용 가능합니다';
    if (loginIdPrefix.length < 2) return '아이디는 2자 이상이어야 합니다';
    if (idCheckState !== 'available') return '아이디 중복 확인을 완료해주세요';
    if (password.length < 8) return '비밀번호는 8자 이상이어야 합니다';
    if (password !== confirmPassword) return '비밀번호가 일치하지 않습니다';
    if (!name.trim()) return '이름을 입력해주세요';
    if (!email.trim()) return '이메일을 입력해주세요';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '올바른 이메일 형식이 아닙니다';
    return null;
  }

  // 운영팀 팀원은 담당 지점 필수
  const isBranchRequired = role === 'OPERATIONS' && position === 'MEMBER';

  function validateStep3() {
    if (isBranchRequired && effectiveBranchIds.length === 0) return '운영팀 팀원은 담당 지점을 선택해주세요';
    return null;
  }

  function validateStep4() {
    if (!securityAnswer1.trim()) return '보안 답변 1을 입력해주세요';
    if (!securityAnswer2.trim()) return '보안 답변 2를 입력해주세요';
    if (securityQuestion1 === securityQuestion2) return '두 보안 질문은 달라야 합니다';
    return null;
  }

  async function handleSubmit() {
    const err = validateStep4();
    if (err) { setError(err); return; }
    setError('');
    setLoading(true);
    try {
      await apiClient.post<ApiResponse<unknown>>('/auth/signup', {
        loginIdPrefix: loginIdPrefix.trim(),
        password,
        name: name.trim(),
        email: email.trim(),
        role,
        department,
        position,
        phone: phone.trim(),
        branchIds: effectiveBranchIds,
        securityQuestion1,
        securityAnswer1: securityAnswer1.trim(),
        securityQuestion2,
        securityAnswer2: securityAnswer2.trim(),
      });
      setCompleted(true);
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '회원가입 실패');
    } finally {
      setLoading(false);
    }
  }

  // 완료 화면
  if (completed) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-gray-200 p-8 w-full max-w-sm text-center">
          <div className="text-4xl mb-4">✅</div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">회원가입 완료</h2>
          <p className="text-sm text-gray-500 mb-1">
            <span className="font-medium text-blue-600">{loginIdPrefix}@urbanhost.co.kr</span> 으로 가입되었습니다.
          </p>
          <p className="text-sm text-gray-400 mb-6">관리자 승인 후 로그인하실 수 있습니다.</p>
          <Link
            href="/login"
            className="w-full inline-block bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700"
          >
            로그인 페이지로
          </Link>
        </div>
      </main>
    );
  }

  const stepTitles = ['전화번호 인증', '기본 정보', '소속 정보', '보안 질문'];
  const currentStepIdx = step - 1;

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-gray-200 p-8 w-full max-w-sm">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold text-gray-900">회원가입</h1>
          <span className="text-xs text-gray-400">{step}/4 단계</span>
        </div>
        <p className="text-sm text-gray-400 mb-2">{stepTitles[currentStepIdx]}</p>

        {/* 진행 바 */}
        <div className="flex gap-1 mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? 'bg-blue-500' : 'bg-gray-200'}`}
            />
          ))}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mb-4">
            {error}
          </p>
        )}

        {/* Step 1: 전화번호 인증 */}
        {step === 1 && (
          <div className="space-y-4">
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
                  disabled={codeLoading || phoneVerified}
                  className="px-3 py-2 text-xs font-medium bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 whitespace-nowrap"
                >
                  {codeLoading ? '발송중' : codeSent ? '재발송' : '인증코드 발송'}
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
                    placeholder="6자리 입력"
                    maxLength={6}
                    className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyCode}
                    disabled={codeLoading}
                    className="px-3 py-2 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    확인
                  </button>
                </div>
              </div>
            )}

            {phoneVerified && (
              <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded px-3 py-2">
                ✅ 전화번호 인증 완료
              </p>
            )}

            <button
              type="button"
              onClick={() => { setError(''); setStep(2); }}
              disabled={!phoneVerified}
              className="w-full bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              다음
            </button>
          </div>
        )}

        {/* Step 2: 기본 정보 */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">아이디</label>
              <div className="flex items-center gap-1 mb-1">
                <input
                  type="text"
                  value={loginIdPrefix}
                  onChange={(e) => {
                    setLoginIdPrefix(e.target.value);
                    setIdCheckState('idle'); // 아이디 변경 시 중복확인 초기화
                  }}
                  placeholder="영문/숫자"
                  className={`flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    idCheckState === 'available' ? 'border-green-400' :
                    idCheckState === 'taken' ? 'border-red-400' :
                    'border-gray-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleCheckLoginId}
                  disabled={idCheckState === 'checking' || !loginIdPrefix.trim()}
                  className="px-3 py-2 text-xs font-medium bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 whitespace-nowrap"
                >
                  {idCheckState === 'checking' ? '확인중' : '중복확인'}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">@urbanhost.co.kr</span>
                {idCheckState === 'available' && (
                  <span className="text-xs text-green-600 font-medium">✅ 사용 가능한 아이디입니다</span>
                )}
                {idCheckState === 'taken' && (
                  <span className="text-xs text-red-600 font-medium">이미 사용 중인 아이디입니다</span>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8자 이상"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호 확인</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호 재입력"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
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
                onClick={() => {
                  const err = validateStep2();
                  if (err) { setError(err); return; }
                  setError('');
                  setStep(3);
                }}
                className="flex-1 bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700"
              >
                다음
              </button>
            </div>
          </div>
        )}

        {/* Step 3: 소속 정보 */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">역할</label>
              <select
                value={role}
                onChange={(e) => {
                  const r = e.target.value as Role;
                  setRole(r);
                  const depts = DEPARTMENT_BY_ROLE[r];
                  setDepartment(depts[0].value);
                  setSelectedBranchIds([]); // 역할 변경 시 지점 초기화
                }}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">부서</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value as Department)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DEPARTMENT_BY_ROLE[role].map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">직위</label>
              <select
                value={position}
                onChange={(e) => {
                  setPosition(e.target.value as Position);
                  setSelectedBranchIds([]); // 직위 변경 시 지점 초기화
                }}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {POSITION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* 담당 지점 — 운영팀 팀원은 필수(다중), 나머지는 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isBranchRequired ? (
                  <>담당 지점 <span className="text-red-500">*</span> <span className="font-normal text-gray-400 text-xs">(복수 선택 가능)</span></>
                ) : (
                  <>소속 지점 <span className="font-normal text-gray-400 text-xs">(선택, 복수 가능)</span></>
                )}
              </label>
              <div className={`border rounded px-3 py-2 max-h-44 overflow-y-auto space-y-1.5 ${
                isBranchRequired && effectiveBranchIds.length === 0 ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'
              }`}>
                {flatBranches.length === 0 && (
                  <p className="text-xs text-gray-400 py-1">지점 목록을 불러오는 중...</p>
                )}
                {flatBranches.map((b) => {
                  const isAuto = autoLinkedIds.has(b.id);
                  const isChecked = displayBranchIds.includes(b.id);
                  return (
                    <label
                      key={b.id}
                      className={`flex items-center gap-2 cursor-pointer select-none ${isAuto ? 'opacity-60' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleBranch(b.id)}
                        disabled={isAuto}
                        className="accent-blue-600"
                      />
                      <span className="text-sm text-gray-700">{b.name}</span>
                      {isAuto && (
                        <span className="text-xs text-blue-500 font-medium">자동</span>
                      )}
                    </label>
                  );
                })}
              </div>
              {displayBranchIds.length > 0 && (
                <p className="text-xs text-blue-600 mt-1">
                  선택된 지점 {displayBranchIds.length}개
                  {autoLinkedIds.size > 0 && ` (자동 포함 ${autoLinkedIds.size}개)`}
                </p>
              )}
              {isBranchRequired && effectiveBranchIds.length === 0 && (
                <p className="text-xs text-red-500 mt-1">운영팀 팀원은 담당 지점을 반드시 선택해야 합니다</p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setError(''); setStep(2); }}
                className="flex-1 border border-gray-300 text-gray-600 rounded px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                이전
              </button>
              <button
                type="button"
                onClick={() => {
                  const err = validateStep3();
                  if (err) { setError(err); return; }
                  setError('');
                  setStep(4);
                }}
                className="flex-1 bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700"
              >
                다음
              </button>
            </div>
          </div>
        )}

        {/* Step 4: 보안 질문 */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">보안 질문 1</label>
              <select
                value={securityQuestion1}
                onChange={(e) => setSecurityQuestion1(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SECURITY_QUESTIONS.map((q) => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">보안 질문 2</label>
              <select
                value={securityQuestion2}
                onChange={(e) => setSecurityQuestion2(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SECURITY_QUESTIONS.map((q) => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
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
                onClick={() => { setError(''); setStep(3); }}
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
                {loading ? '처리 중...' : '가입 신청'}
              </button>
            </div>
          </div>
        )}

        <p className="text-xs text-gray-400 mt-5 text-center">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="text-blue-500 hover:underline">로그인</Link>
        </p>
      </div>
    </main>
  );
}
