'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/stores/appStore';
import { useBranches } from '@/hooks/useBranches';
import { useLocations } from '@/hooks/useLocations';
import { checkDuplicates, useCreateFacilityRequest } from '@/hooks/useFacilityRequests';
import {
  REQUEST_CATEGORY_LABEL,
  REQUEST_STATUS_LABEL,
  type RequestCategory,
  type DuplicateCheckResult,
} from '@/types';

const CATEGORIES = Object.entries(REQUEST_CATEGORY_LABEL) as [RequestCategory, string][];

// 카테고리별 아이콘
const CATEGORY_ICON: Record<RequestCategory, string> = {
  PLUMBING:   '🔧',
  ELECTRICAL: '⚡',
  HVAC:       '❄️',
  FURNITURE:  '🪑',
  CLEANING:   '🧹',
  STRUCTURAL: '🏗️',
  SAFETY:     '🛡️',
  OTHER:      '📋',
};

type Phase = 'idle' | 'form' | 'success';

// ================================================================
// 중복 경고 모달
// ================================================================

function DuplicateWarningModal({
  result,
  onConfirm,
  onCancel,
}: {
  result: DuplicateCheckResult;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-yellow-500 text-xl">⚠️</span>
          <h3 className="font-bold text-gray-900">동일 위치에 처리 중인 요청이 있습니다</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          같은 문제일 수 있습니다. 기존 요청을 확인 후 계속 진행하세요.
        </p>

        <div className="space-y-2 mb-5 max-h-40 overflow-y-auto">
          {result.activeRequests.map((req) => (
            <div key={req.id} className="border border-yellow-200 bg-yellow-50 rounded-lg px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-800 truncate">{req.title}</span>
                <span className="text-xs text-yellow-700 ml-2 shrink-0">
                  {REQUEST_STATUS_LABEL[req.status]}
                </span>
              </div>
              <span className="text-xs text-gray-400">
                {new Date(req.createdAt).toLocaleDateString('ko-KR')}
              </span>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 bg-yellow-500 text-white rounded-xl text-sm font-medium hover:bg-yellow-600"
          >
            그래도 등록
          </button>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// 성공 화면
// ================================================================

function SuccessScreen({ onReset, onDashboard }: { onReset: () => void; onDashboard: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
      <div className="text-7xl">✅</div>
      <div className="text-center">
        <p className="text-xl font-bold text-white mb-2">요청이 등록되었습니다</p>
        <p className="text-sm text-gray-400">QC팀이 확인 후 처리합니다</p>
      </div>
      <div className="flex gap-3 w-full max-w-xs">
        <button
          onClick={onReset}
          className="flex-1 py-3.5 bg-white/10 text-white rounded-xl text-sm font-medium hover:bg-white/20"
        >
          새 요청 등록
        </button>
        <button
          onClick={onDashboard}
          className="flex-1 py-3.5 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600"
        >
          작업 확인
        </button>
      </div>
    </div>
  );
}

// ================================================================
// 카테고리 칩 그리드
// ================================================================

function CategoryGrid({
  value,
  onChange,
}: {
  value: RequestCategory;
  onChange: (v: RequestCategory) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
      {CATEGORIES.map(([cat, label]) => (
        <button
          key={cat}
          type="button"
          onClick={() => onChange(cat)}
          className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-colors ${
            value === cat
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
          }`}
        >
          <span className="text-base leading-none">{CATEGORY_ICON[cat]}</span>
          <span className="leading-tight text-center">{label.replace('/', '/\n')}</span>
        </button>
      ))}
    </div>
  );
}

// ================================================================
// 메인 카메라 페이지
// ================================================================

export default function CameraPage() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);

  const [phase,       setPhase]       = useState<Phase>('idle');
  const [imageFile,   setImageFile]   = useState<File | null>(null);
  const [imagePreview,setImagePreview]= useState<string | null>(null);
  const [isMobile,    setIsMobile]    = useState(false);

  // 폼 필드
  const [branchId,    setBranchId]    = useState('');
  const [locationId,  setLocationId]  = useState('');
  const [category,    setCategory]    = useState<RequestCategory>('OTHER');
  const [description, setDescription] = useState('');
  const [formError,   setFormError]   = useState('');

  // 중복 경고
  const [duplicateResult, setDuplicateResult] = useState<DuplicateCheckResult | null>(null);
  const [pendingSubmit,   setPendingSubmit]   = useState(false);

  const cameraInputRef  = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const { data: branches }  = useBranches(true);
  const { data: locations } = useLocations(branchId);
  const { mutateAsync: createRequest, isPending } = useCreateFacilityRequest();

  useEffect(() => {
    setIsMobile(window.innerWidth < 768 || navigator.maxTouchPoints > 0);
  }, []);

  useEffect(() => {
    if (user?.branchId && !branchId) setBranchId(user.branchId);
  }, [user, branchId]);

  useEffect(() => {
    setLocationId('');
  }, [branchId]);

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setPhase('form');
    setFormError('');
  }, []);

  const resetImage = useCallback(() => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (cameraInputRef.current)  cameraInputRef.current.value  = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  }, [imagePreview]);

  const reset = useCallback(() => {
    resetImage();
    setPhase('idle');
    setDescription('');
    setCategory('OTHER');
    setLocationId('');
    setDuplicateResult(null);
    setPendingSubmit(false);
    setFormError('');
  }, [resetImage]);

  const doSubmit = useCallback(async () => {
    setFormError('');
    setPendingSubmit(false);
    try {
      await createRequest({ branchId, locationId: locationId || undefined, category, description, imageFile: imageFile ?? undefined });
      setPhase('success');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        '등록에 실패했습니다. 다시 시도해주세요.';
      setFormError(msg);
    }
  }, [branchId, locationId, category, description, imageFile, createRequest]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!branchId || !category || !description.trim()) {
      setFormError('지점, 카테고리, 설명은 필수입니다');
      return;
    }
    try {
      const dup = await checkDuplicates(branchId, locationId || undefined);
      if (dup.hasActiveRequest) {
        setDuplicateResult(dup);
        setPendingSubmit(true);
        return;
      }
    } catch { /* 중복 체크 실패는 등록을 막지 않음 */ }
    await doSubmit();
  }, [branchId, locationId, category, description, doSubmit]);

  const isMember = user?.position === 'MEMBER' || user?.position === 'OTHER';
  const dashboardPath = user?.role === 'OPERATIONS' ? '/operations' : '/branches';

  // ================================================================
  // 성공 화면
  // ================================================================
  if (phase === 'success') {
    return (
      <div className="min-h-[calc(100vh-56px)] bg-gray-950 flex flex-col">
        <SuccessScreen onReset={reset} onDashboard={() => router.push(dashboardPath)} />
      </div>
    );
  }

  // ================================================================
  // 렌더링
  // ================================================================
  return (
    <>
      {/* 중복 경고 모달 */}
      {duplicateResult && pendingSubmit && (
        <DuplicateWarningModal
          result={duplicateResult}
          onConfirm={doSubmit}
          onCancel={() => { setDuplicateResult(null); setPendingSubmit(false); }}
        />
      )}

      {/* 파일 입력 (숨김) */}
      <input ref={cameraInputRef}  type="file" accept="image/*" {...(isMobile ? { capture: 'environment' } : {})} className="hidden" onChange={handleImageChange} />
      <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />

      <div className="min-h-[calc(100vh-56px)] bg-gray-950 flex flex-col">

        {/* ── IDLE ── */}
        {phase === 'idle' && (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
              <div
                className="w-full max-w-sm aspect-[3/4] rounded-2xl border-2 border-dashed border-gray-700 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-gray-500 transition-colors"
                onClick={() => cameraInputRef.current?.click()}
              >
                <div className="text-6xl">📷</div>
                <p className="text-gray-400 text-sm text-center px-4">
                  탭하여 촬영하거나<br />아래 버튼을 사용하세요
                </p>
              </div>

              {/* 사진 없이 바로 등록 */}
              <button
                onClick={() => setPhase('form')}
                className="text-sm text-gray-400 hover:text-gray-200 underline underline-offset-2 transition-colors"
              >
                사진 없이 바로 등록 →
              </button>
            </div>

            {/* 하단 버튼 바 */}
            <div className="border-t border-gray-800 bg-gray-900">
              <div className="max-w-md mx-auto flex items-center justify-around py-4 px-6">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center gap-1.5"
                >
                  <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center">
                    <span className="text-2xl">📷</span>
                  </div>
                  <span className="text-xs text-gray-400">촬영</span>
                </button>

                <button
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex flex-col items-center gap-1.5"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                    <span className="text-xl">🖼️</span>
                  </div>
                  <span className="text-xs text-gray-400">갤러리</span>
                </button>

                <button
                  onClick={() => router.push(dashboardPath)}
                  className="flex flex-col items-center gap-1.5"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                    <span className="text-xl">📊</span>
                  </div>
                  <span className="text-xs text-gray-400">작업 확인</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── FORM ── */}
        {phase === 'form' && (
          <div className="flex-1 flex flex-col overflow-y-auto">
            {/* 사진 영역 */}
            <div className="relative bg-black flex-shrink-0">
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt="선택된 사진" className="w-full max-h-64 object-cover" />
              ) : (
                <div className="w-full h-20 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors px-4 py-2 rounded-lg border border-gray-700 hover:border-gray-500"
                  >
                    📷 사진 촬영
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors px-4 py-2 rounded-lg border border-gray-700 hover:border-gray-500"
                  >
                    🖼️ 갤러리
                  </button>
                </div>
              )}
              {imagePreview && (
                <button
                  onClick={resetImage}
                  className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full hover:bg-black/80"
                >
                  다시 선택
                </button>
              )}
            </div>

            {/* 등록 폼 */}
            <form onSubmit={handleSubmit} className="flex-1 bg-white p-4 space-y-4">
              <h2 className="text-base font-bold text-gray-900">요청 등록</h2>

              {/* 지점 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  지점 <span className="text-red-500">*</span>
                </label>
                {isMember && user?.branchId ? (
                  <div className="border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 text-sm text-gray-700">
                    {branches?.find((b) => b.id === user.branchId)?.name ?? '소속 지점'}
                  </div>
                ) : (
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">지점 선택</option>
                    {branches?.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* 위치 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">위치</label>
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  disabled={!branchId}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="">위치 선택 (선택사항)</option>
                  {locations?.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}{l.code ? ` (${l.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* 카테고리 — 그리드 칩 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  카테고리 <span className="text-red-500">*</span>
                </label>
                <CategoryGrid value={category} onChange={setCategory} />
              </div>

              {/* 설명 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  설명 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="예: 화장실 수도꼭지 누수, 위치 및 상태를 간략히 설명해주세요"
                  maxLength={200}
                  rows={3}
                  required
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <p className="text-right text-[10px] text-gray-400 mt-0.5">{description.length}/200</p>
              </div>

              {/* 에러 */}
              {formError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  {formError}
                </p>
              )}

              {/* 버튼 */}
              <div className="flex gap-2 pt-1 pb-2">
                <button
                  type="button"
                  onClick={reset}
                  className="flex-none py-3.5 px-5 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-3.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? '등록 중...' : '요청 등록'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
