'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useBranches } from '@/hooks/useBranches';
import { useLocations } from '@/hooks/useLocations';
import { useCreateFacilityRequest } from '@/hooks/useCreateFacilityRequest';
import { apiClient } from '@/lib/api';
import PhotoUpload from '@/components/ui/PhotoUpload';
import type {
  ApiResponse,
  DuplicateCheckResult,
  RequestCategory,
  LocationType,
  Location,
} from '@/types';
import { REQUEST_CATEGORY_LABEL, LOCATION_TYPE_LABEL } from '@/types';

// ================================================================
// "객실정보 없음" 센티넬 — 카와우소/국도빌딩처럼 객실 개념이 없는 지점용
// locationId 셀렉트에 실제 Location ID 대신 이 값이 저장되면 서버엔 null 전송
// ================================================================

const NO_ROOM_VALUE = '__NO_ROOM__';

// ================================================================
// 역할별 홈 경로
// ================================================================

const HOME_BY_ROLE: Record<string, string> = {
  QC: '/qc/queue',
  OPERATIONS: '/operations/dashboard',
  ADMIN: '/admin/dashboard',
  VENDOR: '/vendor/assignments',
};

// ================================================================
// 카테고리 옵션
// ================================================================

const CATEGORY_OPTIONS = (Object.keys(REQUEST_CATEGORY_LABEL) as RequestCategory[]).map((k) => ({
  value: k,
  label: REQUEST_CATEGORY_LABEL[k],
}));

// ================================================================
// Page
// ================================================================

export default function NewFacilityRequestPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  // MEMBER: 본인 지점 고정, 그 외: 전체 지점
  const isMember = user?.position === 'MEMBER';
  const { data: branches } = useBranches(true);

  // Form state
  const [branchId, setBranchId] = useState<string>('');
  const [roomNumber, setRoomNumber] = useState<string>('');
  const [locationId, setLocationId] = useState<string>('');
  const [category, setCategory] = useState<RequestCategory>('PLUMBING');
  const [title, setTitle] = useState<string>('');
  const [titleEdited, setTitleEdited] = useState(false);
  const [description, setDescription] = useState<string>('');
  const [photo, setPhoto] = useState<File | null>(null);
  /// [PATCH START] 위치 자유 입력
  const [locationText, setLocationText] = useState<string>('');
  /// [PATCH END]

  // Duplicate check
  const [dupResult, setDupResult] = useState<DuplicateCheckResult | null>(null);

  // Submission
  const createMutation = useCreateFacilityRequest();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Locations for selected branch
  const { data: locations } = useLocations(branchId || null);

  // ----------------------------------------------------------------
  // Auto-select branch for MEMBER
  // ----------------------------------------------------------------
  useEffect(() => {
    if (isMember && user?.branchId) {
      setBranchId(user.branchId);
    }
  }, [isMember, user?.branchId]);

  // ----------------------------------------------------------------
  // Reset locationId when branch changes
  // ----------------------------------------------------------------
  useEffect(() => {
    setLocationId('');
    /// [PATCH START] 객실·위치텍스트도 리셋
    setRoomNumber('');
    setLocationText('');
    /// [PATCH END]
    setDupResult(null);
  }, [branchId]);

  /// [PATCH START] 객실 선택 시 roomNumber + locationId 동시 설정
  /// "객실정보 없음" 선택 시 locationId만 센티넬로 두고 roomNumber는 비움
  const handleRoomChange = (locId: string) => {
    if (locId === NO_ROOM_VALUE) {
      setLocationId(NO_ROOM_VALUE);
      setRoomNumber('');
      return;
    }
    setLocationId(locId);
    const loc = locations?.find((l) => l.id === locId);
    setRoomNumber(loc?.name ?? '');
  };
  /// [PATCH END]

  // ----------------------------------------------------------------
  // Auto-generate title
  // ----------------------------------------------------------------
  useEffect(() => {
    if (!titleEdited) {
      const catLabel = REQUEST_CATEGORY_LABEL[category] ?? '';
      const room = roomNumber.trim();
      setTitle(room ? `${catLabel} — ${room}` : catLabel);
    }
  }, [category, titleEdited, roomNumber]);

  // ----------------------------------------------------------------
  // Duplicate check when branchId + locationId are both set
  // "객실정보 없음" 상태에선 duplicate check 생략
  // ----------------------------------------------------------------
  useEffect(() => {
    if (!branchId || !locationId || locationId === NO_ROOM_VALUE) {
      setDupResult(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { data } = await apiClient.get<ApiResponse<DuplicateCheckResult>>(
          '/facility-requests/duplicate-check',
          { params: { branchId, locationId } },
        );
        if (!cancelled) setDupResult(data.data);
      } catch {
        if (!cancelled) setDupResult(null);
      }
    })();

    return () => { cancelled = true; };
  }, [branchId, locationId]);

  // ----------------------------------------------------------------
  /// [PATCH] 객실 드롭다운 평면화 — <optgroup> 제거 + natural sort로
  ///         일부 호수 미노출 체감 해소. 비 ROOM 타입은 label prefix 부여.
  // ----------------------------------------------------------------
  const locationOptions = useMemo(() => {
    if (!locations) return [];
    const collator = new Intl.Collator('ko', { numeric: true, sensitivity: 'base' });
    const typeOrder: Record<LocationType, number> = {
      ROOM: 0,
      PUBLIC_AREA: 1,
      OFFICE: 2,
      BACK_OF_HOUSE: 3,
    };
    return [...locations]
      .sort((a, b) => {
        const t = typeOrder[a.type] - typeOrder[b.type];
        if (t !== 0) return t;
        return collator.compare(a.name, b.name);
      })
      .map((loc) => ({
        id: loc.id,
        label:
          loc.type === 'ROOM'
            ? loc.name
            : `[${LOCATION_TYPE_LABEL[loc.type]}] ${loc.name}`,
      }));
  }, [locations]);

  // ----------------------------------------------------------------
  // Submit
  // ----------------------------------------------------------------
  async function handleSubmit() {
    setError('');

    if (!branchId) { setError('지점을 선택해주세요'); return; }
    /// [PATCH START] 객실 선택 필수 — 단 "객실정보 없음"(센티넬)도 유효한 선택
    if (!locationId) { setError('객실을 선택해주세요'); return; }
    /// [PATCH END]
    if (!category) { setError('카테고리를 선택해주세요'); return; }
    if (!description.trim()) { setError('작업 내용을 입력해주세요'); return; }
    if (!title.trim()) { setError('제목을 입력해주세요'); return; }

    /// [PATCH START] 위치 자유 입력값을 description 앞에 prefix
    const locPrefix = locationText.trim() ? `[위치] ${locationText.trim()}\n` : '';
    const fullDescription = `${locPrefix}${description.trim()}`;
    /// [PATCH END]

    const fd = new FormData();
    fd.append('title', title.trim());
    fd.append('description', fullDescription);
    fd.append('category', category);
    fd.append('branchId', branchId);
    /// [PATCH] "객실정보 없음" 선택 시 locationId/roomNumber 전송하지 않음 → 서버는 null 처리
    if (locationId !== NO_ROOM_VALUE) {
      fd.append('locationId', locationId);
      if (roomNumber.trim()) fd.append('roomNumber', roomNumber.trim());
    }
    if (photo) fd.append('image', photo);

    try {
      await createMutation.mutateAsync(fd);
      setSubmitted(true);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? '요청 등록에 실패했습니다');
    }
  }

  // ----------------------------------------------------------------
  // Success screen
  // ----------------------------------------------------------------
  if (submitted) {
    const homeHref = HOME_BY_ROLE[user?.role ?? ''] ?? '/';
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <div className="bg-white rounded-lg border border-gray-200 p-8 w-full max-w-sm text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">요청이 등록되었습니다</h2>
          <p className="text-sm text-gray-500 mb-6">QC팀이 확인 후 처리할 예정입니다.</p>
          <Link
            href={homeHref}
            className="w-full inline-block bg-blue-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            대시보드로 이동
          </Link>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------
  // Render form
  // ----------------------------------------------------------------
  return (
    <div className="max-w-lg mx-auto">
      {/* Back button */}
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        뒤로가기
      </button>

      <div className="bg-white rounded-lg border border-gray-200 p-6 sm:p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-1">시설 요청 등록</h1>
        <p className="text-sm text-gray-400 mb-6">시설 보수/점검이 필요한 사항을 등록하세요</p>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
            {error}
          </div>
        )}

        <div className="space-y-5">
          {/* 1. 지점 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              지점 선택 <span className="text-red-500">*</span>
            </label>
            {isMember && (branches?.length ?? 0) <= 1 ? (
              <div className="border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-sm text-gray-700">
                {branches?.find((b) => b.id === branchId)?.name ?? '지점 로딩 중...'}
              </div>
            ) : (
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">지점을 선택하세요</option>
                {branches?.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* 2. 객실 선택 */}
          {/* /// [PATCH START] 객실 = 지점 Location 드롭다운 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              객실 <span className="text-red-500">*</span>
            </label>
            <select
              value={locationId}
              onChange={(e) => handleRoomChange(e.target.value)}
              disabled={!branchId}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">객실을 선택하세요</option>
              {/* /// [PATCH] <optgroup> 제거 — 평면 natural sort 리스트 */}
              {locationOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
              {/* /// [PATCH] 객실 개념이 없는 지점(카와우소/국도빌딩 등)을 위한 옵션 */}
              <option value={NO_ROOM_VALUE}>객실정보 없음</option>
            </select>
            {locationId === NO_ROOM_VALUE && (
              <p className="text-xs text-gray-500 mt-1">
                객실 번호 없이 지점 단위로 등록됩니다
              </p>
            )}
          </div>
          {/* /// [PATCH END] */}

          {/* 3. 위치 선택 (자유 입력) */}
          {/* /// [PATCH START] 위치 = 자유 입력 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              위치 선택 <span className="text-gray-400">(선택)</span>
            </label>
            <input
              type="text"
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              placeholder="예: 화장실 세면대 밑"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {/* /// [PATCH END] */}

          {/* Duplicate warning */}
          {dupResult?.hasActiveRequest && (
            <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2.5">
              <svg className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <p className="text-sm text-yellow-800">
                이 위치에 진행 중인 요청이 <span className="font-semibold">{dupResult.count}건</span> 있습니다
              </p>
            </div>
          )}

          {/* 3. 카테고리 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              카테고리 <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as RequestCategory)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* 4. 제목 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              제목 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleEdited(true);
              }}
              placeholder="요청 제목을 입력하세요"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {titleEdited && (
              <button
                type="button"
                onClick={() => {
                  setTitleEdited(false);
                  const catLabel = REQUEST_CATEGORY_LABEL[category] ?? '';
                  const room = roomNumber.trim();
                  setTitle(room ? `${catLabel} — ${room}` : catLabel);
                }}
                className="text-xs text-blue-500 hover:text-blue-700 mt-1 transition-colors"
              >
                자동 생성으로 되돌리기
              </button>
            )}
          </div>

          {/* 5. 작업 내용 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              작업 내용 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="어떤 작업이 필요한지 상세히 입력해주세요"
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* 6. 사진 첨부 */}
          <PhotoUpload
            value={photo}
            onChange={setPhoto}
            label="사진 첨부"
          />

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="w-full bg-blue-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {createMutation.isPending ? '등록 중...' : '요청 등록'}
          </button>
        </div>
      </div>
    </div>
  );
}
