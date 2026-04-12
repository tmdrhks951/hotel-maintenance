'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useEscKey } from '@/hooks/useEscKey';
import { useAppStore } from '@/stores/appStore';
import { useBranches } from '@/hooks/useBranches';
import {
  useQcQueue,
  useQcCompleted,
  useQcHistory,
  useQcVerify,
  useFacilityRequestDetail,
  useQcReview,
  useUpdateSchedule,
  useAssignWorker,
  useAssignableUsers,
  useCompleteWork,
} from '@/hooks/useQcQueue';
import type {
  FacilityRequestCard,
  FacilityRequestDetail,
  QcHistoryCard,
  Priority,
  QcReviewAction,
  WorkAction,
  RequestCategory,
} from '@/types';
import {
  REQUEST_CATEGORY_LABEL,
  REQUEST_STATUS_LABEL,
  PRIORITY_LABEL,
  WORK_ACTIONS,
  WORK_ACTION_ITEMS,
  generateCompletionText,
} from '@/types';
import { PhotoComparison } from '@/components/PhotoComparison';
import { StatusTimeline } from '@/components/StatusTimeline';
import { CommentSection } from '@/components/CommentSection';
import { WorkHistoryModal } from '@/components/WorkHistoryModal';

// ================================================================
// localStorage 최근 문구 유틸
// ================================================================

const RECENT_KEY = 'hotel_recent_work_phrases';
const MAX_RECENT = 5;

function loadRecentPhrases(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveRecentPhrase(phrase: string) {
  if (typeof window === 'undefined') return;
  const phrases = loadRecentPhrases().filter((p) => p !== phrase);
  phrases.unshift(phrase);
  localStorage.setItem(RECENT_KEY, JSON.stringify(phrases.slice(0, MAX_RECENT)));
}

// ================================================================
// 우선순위 뱃지 색상
// ================================================================

function PriorityBadge({ priority }: { priority: Priority }) {
  const cls =
    priority === 'URGENT'
      ? 'bg-red-100 text-red-700'
      : priority === 'HIGH'
        ? 'bg-orange-100 text-orange-700'
        : 'bg-gray-100 text-gray-600';
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${cls}`}>
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

// ================================================================
// 요청 카드
// ================================================================

// ================================================================
// 필터 / 정렬 헬퍼
// ================================================================

type SortKey = 'newest' | 'oldest' | 'priority';

const SORT_LABELS: Record<SortKey, string> = {
  newest:   '최신순',
  oldest:   '오래된순',
  priority: '긴급우선',
};

const PRIORITY_SCORE: Record<string, number> = { URGENT: 3, HIGH: 2, NORMAL: 1 };

function applyFiltersAndSort(
  items: FacilityRequestCard[],
  category: RequestCategory | 'all',
  sort: SortKey,
): FacilityRequestCard[] {
  let result = category === 'all' ? items : items.filter((r) => r.category === category);
  return [...result].sort((a, b) => {
    if (sort === 'priority') {
      const scoreA = (a.isEmergency ? 10 : 0) + (PRIORITY_SCORE[a.priority] ?? 0);
      const scoreB = (b.isEmergency ? 10 : 0) + (PRIORITY_SCORE[b.priority] ?? 0);
      if (scoreB !== scoreA) return scoreB - scoreA;
    }
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    return sort === 'oldest' ? ta - tb : tb - ta;
  });
}

// ================================================================
// 카드 색상
// ================================================================

function requestCardColor(req: FacilityRequestCard, selected: boolean): string {
  if (selected) return 'border-blue-500 bg-blue-50';
  if (req.isEmergency)            return 'border-red-400 bg-red-50 hover:brightness-95';
  if (req.priority === 'URGENT')  return 'border-red-300 bg-red-50 hover:brightness-95';
  if (req.priority === 'HIGH')    return 'border-orange-300 bg-orange-50 hover:brightness-95';
  return 'border-gray-200 bg-white hover:border-gray-300';
}

function RequestCard({
  req,
  selected,
  onClick,
}: {
  req: FacilityRequestCard;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${requestCardColor(req, selected)}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-900 line-clamp-2 flex-1">
          {req.isEmergency && (
            <span className="inline-block mr-1 text-red-600 font-bold">🚨</span>
          )}
          {req.title}
        </p>
        <PriorityBadge priority={req.priority} />
      </div>
      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500">
          {REQUEST_CATEGORY_LABEL[req.category]}
        </span>
        {req.location && (
          <span className="text-xs text-gray-400">· {req.location.name}</span>
        )}
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {new Date(req.createdAt).toLocaleDateString('ko-KR')}
        </span>
        {req.assignedTo && (
          <span className="text-xs text-blue-600">담당: {req.assignedTo.name}</span>
        )}
        {req.plannedWorkDate && (
          <span className="text-xs text-green-600">
            {new Date(req.plannedWorkDate).toLocaleDateString('ko-KR')}
          </span>
        )}
      </div>
    </button>
  );
}

// ================================================================
// 완료 이력 카드
// ================================================================

function HistoryCard({
  item,
  selected,
  onClick,
}: {
  item: QcHistoryCard;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${
        selected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-900 line-clamp-2 flex-1">{item.title}</p>
        {item._count.comments > 0 && (
          <span className="flex-shrink-0 text-xs bg-blue-600 text-white rounded-full px-2 py-0.5">
            💬 {item._count.comments}
          </span>
        )}
      </div>
      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500">{REQUEST_CATEGORY_LABEL[item.category]}</span>
        {item.location && (
          <span className="text-xs text-gray-400">· {item.location.name}</span>
        )}
      </div>
      <div className="mt-1.5 text-xs text-gray-400 space-y-0.5">
        {item.completedAt && (
          <div>작업 완료: {new Date(item.completedAt).toLocaleDateString('ko-KR')}</div>
        )}
        {item.operationsConfirmedAt && (
          <div className="text-teal-600">
            운영팀 확인: {new Date(item.operationsConfirmedAt).toLocaleDateString('ko-KR')}
            {item.operationsConfirmedBy && (
              <span className="ml-1">({item.operationsConfirmedBy.name})</span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}

// ================================================================
// 큐 섹션 (신규/판단필요/진행중)
// ================================================================

function QueueSection({
  title,
  count,
  items,
  selectedId,
  onSelect,
  accent,
}: {
  title: string;
  count: number;
  items: FacilityRequestCard[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  accent: string;
}) {
  return (
    <div className="flex flex-col min-w-0">
      <div className={`flex items-center gap-2 mb-3 pb-2 border-b-2 ${accent}`}>
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
        <span className="text-xs bg-gray-200 text-gray-600 rounded-full px-2 py-0.5">
          {count}
        </span>
      </div>
      <div className="space-y-2 overflow-y-auto flex-1">
        {items.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">없음</p>
        ) : (
          items.map((req) => (
            <RequestCard
              key={req.id}
              req={req}
              selected={selectedId === req.id}
              onClick={() => onSelect(req.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}


// ================================================================
// STEP 7: 작업 완료 등록 폼
// ================================================================

function CompletionForm({
  req,
  requestId,
  onClose,
  onBack,
}: {
  req: FacilityRequestDetail;
  requestId: string;
  onClose: () => void;
  onBack: () => void;
}) {
  const completeMutation = useCompleteWork(requestId);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [workAction, setWorkAction] = useState<WorkAction | null>(null);
  const [workItem, setWorkItem] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [recentPhrases, setRecentPhrases] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRecentPhrases(loadRecentPhrases());
  }, []);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  }

  const actionItems =
    workAction ? (WORK_ACTION_ITEMS[workAction][req.category] ?? WORK_ACTION_ITEMS[workAction]['OTHER'] ?? []) : [];

  const generatedText =
    workAction && workItem
      ? generateCompletionText(req.category, workAction, workItem)
      : '';

  async function handleSubmit() {
    if (!photoFile) { setError('완료 사진을 첨부해주세요'); return; }
    if (!workAction) { setError('작업 유형을 선택해주세요'); return; }
    if (!workItem) { setError('작업 항목을 선택해주세요'); return; }

    setError('');
    const fd = new FormData();
    // 한글/특수문자 파일명은 busboy가 파싱 실패하므로 안전한 파일명으로 변환
    const ext = photoFile.name.split('.').pop()?.toLowerCase() || 'jpg';
    fd.append('image', photoFile, `photo_${Date.now()}.${ext}`);
    fd.append('workAction', workAction);
    fd.append('workItem', workItem);
    fd.append('generatedText', generatedText);
    if (note.trim()) fd.append('note', note.trim());

    try {
      await completeMutation.mutateAsync(fd);
      saveRecentPhrase(note.trim() || generatedText);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '등록 실패');
    }
  }

  return (
    <div className="p-5 space-y-5">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 text-sm">
          ←
        </button>
        <h4 className="text-sm font-semibold text-gray-900">작업 완료 등록</h4>
        <span className="ml-auto text-xs text-gray-400 truncate max-w-32">{req.title}</span>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </div>
      )}

      {/* 완료 사진 */}
      <section>
        <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          완료 사진 <span className="text-red-500">*</span>
        </h5>
        {photoPreview ? (
          <div className="relative">
            <img
              src={photoPreview}
              alt="완료 사진"
              className="w-full rounded-lg object-cover max-h-48"
            />
            <button
              onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
              className="absolute top-2 right-2 bg-black/50 text-white text-xs rounded px-2 py-1"
            >
              다시 찍기
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-blue-400 transition-colors"
          >
            <span className="text-2xl">📷</span>
            <span className="text-xs text-gray-500">사진 촬영 / 선택</span>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoChange}
          className="hidden"
        />
      </section>

      {/* 1차: 작업 유형 */}
      <section>
        <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          작업 유형 <span className="text-red-500">*</span>
        </h5>
        <div className="grid grid-cols-3 gap-2">
          {WORK_ACTIONS.map((action) => (
            <button
              key={action}
              onClick={() => { setWorkAction(action); setWorkItem(''); }}
              className={`py-2 text-sm rounded border transition-colors ${
                workAction === action
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {action}
            </button>
          ))}
        </div>
      </section>

      {/* 2차: 작업 항목 */}
      {workAction && actionItems.length > 0 && (
        <section>
          <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            작업 항목 <span className="text-red-500">*</span>
          </h5>
          <div className="flex flex-wrap gap-2">
            {actionItems.map((item) => (
              <button
                key={item}
                onClick={() => setWorkItem(item)}
                className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                  workItem === item
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 자동 생성 문구 */}
      {generatedText && (
        <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2">
          <p className="text-xs text-blue-500 mb-0.5">완료 문구</p>
          <p className="text-sm font-medium text-blue-800">{generatedText}</p>
        </div>
      )}

      {/* 추가 메모 */}
      <section>
        <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          추가 메모 (선택)
        </h5>
        <input
          type="text"
          placeholder="추가 내용 입력"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-500"
        />
        {/* 최근 문구 */}
        {recentPhrases.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {recentPhrases.map((p, i) => (
              <button
                key={i}
                onClick={() => setNote(p)}
                className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 truncate max-w-40"
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 제출 */}
      <button
        onClick={handleSubmit}
        disabled={completeMutation.isPending || !photoFile || !workAction || !workItem}
        className="w-full py-3 text-sm font-medium rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {completeMutation.isPending ? '등록 중...' : '완료 등록'}
      </button>
    </div>
  );
}

// ================================================================
// 요청 상세 모달
// ================================================================

function RequestDetailModal({
  requestId,
  onClose,
}: {
  requestId: string;
  onClose: () => void;
}) {
  const { user } = useAppStore();
  const { data: req, isLoading } = useFacilityRequestDetail(requestId);
  const reviewMutation = useQcReview(requestId);

  useEscKey(onClose);
  const verifyMutation = useQcVerify(requestId);
  const scheduleMutation = useUpdateSchedule(requestId);
  const assignMutation = useAssignWorker(requestId);

  // 담당자 후보 — req가 로드된 후 branchId로 조회
  const { data: assignableUsers = [] } = useAssignableUsers(req?.branchId);

  // 완료 등록 폼 표시 여부
  const [isCompleting, setIsCompleting] = useState(false);

  // 로컬 폼 상태
  const [isEmergency, setIsEmergency] = useState<boolean | undefined>(undefined);
  const [emergencyReason, setEmergencyReason] = useState('');
  const [priority, setPriority] = useState<Priority | undefined>(undefined);
  const [judgementReason, setJudgementReason] = useState('');
  const [plannedDate, setPlannedDate] = useState('');
  const [scheduleReason, setScheduleReason] = useState('');
  const [assigneeId, setAssigneeId] = useState('');

  // req 로드 후 초기화 (최초 1회)
  const [initialized, setInitialized] = useState(false);
  if (req && !initialized) {
    setIsEmergency(req.isEmergency);
    setEmergencyReason(req.emergencyReason ?? '');
    setPriority(req.priority);
    setPlannedDate(
      req.plannedWorkDate
        ? new Date(req.plannedWorkDate).toISOString().split('T')[0]
        : '',
    );
    setAssigneeId(req.assignedToId ?? '');
    setInitialized(true);
  }

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function showSuccess(msg: string) {
    setSuccess(msg);
    setError('');
    setTimeout(() => setSuccess(''), 2500);
  }

  // 긴급/우선순위 저장
  async function handleJudgement() {
    if (isEmergency && !emergencyReason.trim()) {
      setError('긴급 사유를 입력해주세요');
      return;
    }
    setError('');
    try {
      await reviewMutation.mutateAsync({
        isEmergency,
        emergencyReason: isEmergency ? emergencyReason : undefined,
        priority,
        reason: judgementReason || undefined,
      });
      showSuccess('저장됐습니다');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '저장 실패');
    }
  }

  // 상태 전이 (판단 필요 / 수령 / 되돌리기 / 작업 시작)
  async function handleAction(action: QcReviewAction) {
    setError('');
    try {
      await reviewMutation.mutateAsync({ action, reason: judgementReason || undefined });
      showSuccess(
        action === 'MARK_REVIEW' ? '판단 필요로 이동했습니다' :
        action === 'RECEIVE' ? '수령 처리됐습니다' :
        action === 'REVERT_TO_REQUESTED' ? '신규 요청으로 되돌렸습니다' :
        action === 'START_WORK' ? '작업을 시작했습니다' :
        '처리됐습니다',
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '처리 실패');
    }
  }

  // QC 최종 검토 (DONE_BY_QC → QC_VERIFIED | REOPENED)
  async function handleVerify(action: 'VERIFY' | 'REOPEN') {
    setError('');
    try {
      await verifyMutation.mutateAsync({ action });
      showSuccess(action === 'VERIFY' ? 'QC 검토 완료 처리됐습니다' : '재오픈됐습니다');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '처리 실패');
    }
  }

  // 일정 저장
  async function handleSchedule() {
    if (!plannedDate) {
      setError('날짜를 선택해주세요');
      return;
    }
    setError('');
    try {
      await scheduleMutation.mutateAsync({
        plannedWorkDate: plannedDate,
        reason: scheduleReason || undefined,
      });
      showSuccess('일정이 저장됐습니다');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '저장 실패');
    }
  }

  // 담당자 저장
  async function handleAssign() {
    if (!assigneeId) {
      setError('담당자를 선택해주세요');
      return;
    }
    setError('');
    try {
      await assignMutation.mutateAsync(assigneeId);
      showSuccess('담당자가 배정됐습니다');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '저장 실패');
    }
  }

  // 상태에 따른 액션 버튼
  function renderActionButtons() {
    if (!req) return null;
    const s = req.status;

    if (s === 'PENDING' || s === 'REQUESTED') {
      return (
        <div className="flex gap-2">
          <button
            onClick={() => handleAction('MARK_REVIEW')}
            disabled={reviewMutation.isPending}
            className="flex-1 py-2 text-sm rounded border border-yellow-400 text-yellow-700 hover:bg-yellow-50 disabled:opacity-50"
          >
            판단 필요 마킹
          </button>
          <button
            onClick={() => handleAction('RECEIVE')}
            disabled={reviewMutation.isPending}
            className="flex-1 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            수령
          </button>
        </div>
      );
    }

    if (s === 'REVIEW_REQUIRED') {
      return (
        <div className="flex gap-2">
          <button
            onClick={() => handleAction('REVERT_TO_REQUESTED')}
            disabled={reviewMutation.isPending}
            className="py-2 px-3 text-sm rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            ← 되돌리기
          </button>
          <button
            onClick={() => handleAction('RECEIVE')}
            disabled={reviewMutation.isPending}
            className="flex-1 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            수령 처리
          </button>
        </div>
      );
    }

    if (s === 'RECEIVED' || s === 'SCHEDULED') {
      return (
        <div className="flex gap-2">
          <button
            onClick={() => handleAction('REVERT_TO_REQUESTED')}
            disabled={reviewMutation.isPending}
            className="py-2 px-3 text-sm rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            ← 되돌리기
          </button>
          <button
            onClick={() => handleAction('START_WORK')}
            disabled={reviewMutation.isPending}
            className="flex-1 py-2 text-sm rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
          >
            작업 시작
          </button>
        </div>
      );
    }

    if (s === 'IN_PROGRESS') {
      return (
        <button
          onClick={() => setIsCompleting(true)}
          className="w-full py-2.5 text-sm font-medium rounded bg-green-600 text-white hover:bg-green-700"
        >
          작업 완료 등록
        </button>
      );
    }

    if (s === 'DONE_BY_QC') {
      return (
        <div className="flex gap-2">
          <button
            onClick={() => handleVerify('REOPEN')}
            disabled={verifyMutation.isPending}
            className="py-2 px-3 text-sm rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            ← 재오픈
          </button>
          <button
            onClick={() => handleVerify('VERIFY')}
            disabled={verifyMutation.isPending}
            className="flex-1 py-2 text-sm rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {verifyMutation.isPending ? '처리 중...' : 'QC 검토 완료'}
          </button>
        </div>
      );
    }

    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/30"
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-full sm:max-w-lg bg-white shadow-xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between z-10">
          <h3 className="text-sm font-semibold text-gray-900">요청 상세</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {isLoading && (
          <div className="p-8 text-center text-sm text-gray-400">불러오는 중...</div>
        )}

        {/* 완료 등록 폼 */}
        {req && isCompleting && (
          <CompletionForm
            req={req}
            requestId={requestId}
            onClose={onClose}
            onBack={() => setIsCompleting(false)}
          />
        )}

        {/* 일반 상세 뷰 */}
        {req && !isCompleting && (
          <div className="p-5 space-y-5">
            {/* 피드백 */}
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {error}
              </div>
            )}
            {success && (
              <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
                {success}
              </div>
            )}

            {/* 요청 기본 정보 */}
            <section>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className="text-base font-semibold text-gray-900">{req.title}</h4>
                <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 whitespace-nowrap">
                  {REQUEST_STATUS_LABEL[req.status]}
                </span>
              </div>
              <div className="text-xs text-gray-500 space-y-0.5">
                <div>
                  지점: <span className="text-gray-700">{req.branch.name}</span>
                  {req.location && (
                    <span className="ml-2">위치: <span className="text-gray-700">{req.location.name}</span></span>
                  )}
                </div>
                <div>카테고리: <span className="text-gray-700">{REQUEST_CATEGORY_LABEL[req.category]}</span></div>
                <div className="text-gray-700 mt-1">{req.description}</div>
              </div>
              <PhotoComparison media={req.media} />
              {/* 완료 정보 */}
              {req.completedAt && (
                <div className="mt-2 text-xs text-green-700 bg-green-50 rounded px-2 py-1">
                  QC 완료: {new Date(req.completedAt).toLocaleString('ko-KR')}
                  {req.completedBy && <span className="ml-1">({req.completedBy.name})</span>}
                </div>
              )}
              {/* QC 검토 완료 정보 */}
              {req.qcVerifiedAt && (
                <div className="mt-1 text-xs text-purple-700 bg-purple-50 rounded px-2 py-1">
                  QC 검토: {new Date(req.qcVerifiedAt).toLocaleString('ko-KR')}
                  {req.qcVerifiedBy && <span className="ml-1">({req.qcVerifiedBy.name})</span>}
                </div>
              )}
            </section>

            <hr className="border-gray-100" />

            {/* 판단 섹션 */}
            <section>
              {/* 긴급/우선순위 — 작업 전 단계(신규·판단필요·수령·일정·진행중)에서만 표시 */}
              {['PENDING', 'REQUESTED', 'REVIEW_REQUIRED', 'RECEIVED', 'SCHEDULED', 'IN_PROGRESS'].includes(req.status) && (
                <>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    판단
                  </h4>

                  {/* 긴급 토글 */}
                  <label className="flex items-center gap-2 mb-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isEmergency ?? false}
                      onChange={(e) => setIsEmergency(e.target.checked)}
                      className="w-4 h-4 accent-red-600"
                    />
                    <span className="text-sm font-medium text-gray-800">
                      🚨 긴급 처리
                    </span>
                  </label>

                  {isEmergency && (
                    <input
                      type="text"
                      placeholder="긴급 사유 입력 (필수)"
                      value={emergencyReason}
                      onChange={(e) => setEmergencyReason(e.target.value)}
                      className="w-full mb-2 px-3 py-2 text-sm border border-red-300 rounded focus:outline-none focus:border-red-500"
                    />
                  )}

                  {/* 우선순위 */}
                  <div className="mb-3">
                    <label className="block text-xs text-gray-500 mb-1">우선순위</label>
                    <div className="flex gap-2">
                      {(['NORMAL', 'HIGH', 'URGENT'] as Priority[]).map((p) => (
                        <button
                          key={p}
                          onClick={() => setPriority(p)}
                          className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
                            priority === p
                              ? p === 'URGENT'
                                ? 'bg-red-600 text-white border-red-600'
                                : p === 'HIGH'
                                  ? 'bg-orange-500 text-white border-orange-500'
                                  : 'bg-blue-600 text-white border-blue-600'
                              : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {PRIORITY_LABEL[p]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 사유 (선택) */}
                  <input
                    type="text"
                    placeholder="판단 사유 (선택사항)"
                    value={judgementReason}
                    onChange={(e) => setJudgementReason(e.target.value)}
                    className="w-full mb-2 px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-500"
                  />

                  <button
                    onClick={handleJudgement}
                    disabled={reviewMutation.isPending}
                    className="w-full py-2 text-sm rounded bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50 mb-3"
                  >
                    {reviewMutation.isPending ? '저장 중...' : '긴급 / 우선순위 저장'}
                  </button>
                </>
              )}

              {/* 상태 전이 버튼 */}
              {renderActionButtons()}
            </section>

            <hr className="border-gray-100" />

            {/* 일정 섹션 — 수령 이후 상태에서만 표시 */}
            {['RECEIVED', 'SCHEDULED', 'IN_PROGRESS'].includes(req.status) && (
              <section>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  예정일
                  {req.scheduleChangeCount > 0 && (
                    <span className="ml-2 text-orange-500 normal-case">
                      변경 {req.scheduleChangeCount}회
                    </span>
                  )}
                </h4>
                <input
                  type="date"
                  value={plannedDate}
                  onChange={(e) => setPlannedDate(e.target.value)}
                  className="w-full mb-2 px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="일정 사유 (선택사항)"
                  value={scheduleReason}
                  onChange={(e) => setScheduleReason(e.target.value)}
                  className="w-full mb-2 px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={handleSchedule}
                  disabled={scheduleMutation.isPending}
                  className="w-full py-2 text-sm rounded border border-green-500 text-green-700 hover:bg-green-50 disabled:opacity-50"
                >
                  {scheduleMutation.isPending ? '저장 중...' : '일정 저장'}
                </button>
              </section>
            )}

            <hr className="border-gray-100" />

            {/* 담당자 섹션 */}
            <section>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                담당자
              </h4>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full mb-2 px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-500"
              >
                <option value="">담당자 선택</option>
                {assignableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
              <button
                onClick={handleAssign}
                disabled={assignMutation.isPending}
                className="w-full py-2 text-sm rounded border border-blue-500 text-blue-700 hover:bg-blue-50 disabled:opacity-50"
              >
                {assignMutation.isPending ? '저장 중...' : '담당자 저장'}
              </button>
            </section>

            {/* 처리 이력 */}
            <StatusTimeline logs={req.statusLogs} />

            {/* 댓글 */}
            {user && (
              <CommentSection
                requestId={requestId}
                currentUserId={user.id}
                currentRole={user.role}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ================================================================
// QC 큐 페이지 (메인)
// ================================================================

export default function QcPage() {
  const { user } = useAppStore();
  const [selectedId,    setSelectedId]    = useState<string | null>(null);
  const [viewMode,      setViewMode]      = useState<'queue' | 'history'>('queue');
  const [showHistory,   setShowHistory]   = useState(false);
  const [filterBranch,  setFilterBranch]  = useState<string>('');          // ADMIN 지점 필터
  const [filterCategory,setFilterCategory]= useState<RequestCategory | 'all'>('all');
  const [sortBy,        setSortBy]        = useState<SortKey>('newest');

  // 지점 목록 (ADMIN 전용)
  const { data: branches = [] } = useBranches(true);

  // QC는 자신의 지점만, ADMIN은 선택한 지점(없으면 전체)
  const branchId = user?.role === 'QC' ? user.branchId : (filterBranch || undefined);
  const { data, isLoading, error, refetch } = useQcQueue(branchId);
  const { data: completedData, refetch: refetchCompleted } = useQcCompleted(branchId);
  const { data: historyData = [], refetch: refetchHistory } = useQcHistory(branchId);

  if (!user || (user.role !== 'QC' && user.role !== 'ADMIN')) {
    return (
      <div className="text-center py-20 text-sm text-gray-400">
        QC 또는 ADMIN 계정만 접근 가능합니다
      </div>
    );
  }

  const newRequests    = useMemo(() => applyFiltersAndSort(data?.newRequests    ?? [], filterCategory, sortBy), [data, filterCategory, sortBy]);
  const reviewRequired = useMemo(() => applyFiltersAndSort(data?.reviewRequired ?? [], filterCategory, sortBy), [data, filterCategory, sortBy]);
  const inProgress     = useMemo(() => applyFiltersAndSort(data?.inProgress     ?? [], filterCategory, sortBy), [data, filterCategory, sortBy]);
  const doneByQc       = useMemo(() => applyFiltersAndSort(completedData?.doneByQc ?? [], filterCategory, sortBy), [completedData, filterCategory, sortBy]);

  return (
    <div className="h-full">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">QC 작업 큐</h1>
            {viewMode === 'queue' && (
              <p className="text-xs text-gray-400 mt-0.5">
                총 {newRequests.length + reviewRequired.length + inProgress.length + doneByQc.length}건 진행 중
              </p>
            )}
            {viewMode === 'history' && (
              <p className="text-xs text-gray-400 mt-0.5">
                완료 이력 {historyData.length}건
              </p>
            )}
          </div>
          {/* 뷰 토글 */}
          <div className="flex rounded border border-gray-200 overflow-hidden text-xs">
            <button
              onClick={() => { setViewMode('queue'); setSelectedId(null); }}
              className={`px-3 py-1.5 transition-colors ${
                viewMode === 'queue'
                  ? 'bg-gray-800 text-white'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              큐
            </button>
            <button
              onClick={() => { setViewMode('history'); setSelectedId(null); refetchHistory(); }}
              className={`px-3 py-1.5 transition-colors border-l border-gray-200 ${
                viewMode === 'history'
                  ? 'bg-gray-800 text-white'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              완료 이력
              {historyData.length > 0 && viewMode !== 'history' && (
                <span className="ml-1.5 bg-blue-500 text-white rounded-full px-1.5 text-[10px]">
                  {historyData.length}
                </span>
              )}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(true)}
            className="text-xs text-gray-500 hover:text-blue-600 border border-gray-200 rounded px-2 py-1 flex items-center gap-1"
            title="작업 이력 조회"
          >
            📅 이력
          </button>
          <button
            onClick={() => { refetch(); refetchCompleted(); if (viewMode === 'history') refetchHistory(); }}
            className="text-xs text-gray-500 hover:text-blue-600 border border-gray-200 rounded px-2 py-1"
          >
            새로고침
          </button>
        </div>
      </div>

      {/* 필터 바 */}
      {viewMode === 'queue' && (
        <div className="space-y-2 mb-3">
          {/* 1행: 지점 필터 + 정렬 */}
          <div className="flex items-center gap-2">
            {user.role === 'ADMIN' && branches.length > 0 && (
              <select
                value={filterBranch}
                onChange={(e) => { setFilterBranch(e.target.value); setSelectedId(null); }}
                className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-blue-400"
              >
                <option value="">전체 지점</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}
            <div className="ml-auto flex rounded border border-gray-200 overflow-hidden text-xs">
              {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setSortBy(key)}
                  className={`px-2.5 py-1.5 transition-colors border-l border-gray-200 first:border-l-0 ${
                    sortBy === key
                      ? 'bg-gray-800 text-white'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {SORT_LABELS[key]}
                </button>
              ))}
            </div>
          </div>
          {/* 2행: 카테고리 칩 (가로 스크롤) */}
          <div className="flex gap-1 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
            <button
              onClick={() => setFilterCategory('all')}
              className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                filterCategory === 'all'
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
              }`}
            >
              전체
            </button>
            {(Object.keys(REQUEST_CATEGORY_LABEL) as RequestCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  filterCategory === cat
                    ? 'bg-gray-800 text-white border-gray-800'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                }`}
              >
                {REQUEST_CATEGORY_LABEL[cat]}
              </button>
            ))}
          </div>
        </div>
      )}

      {isLoading && viewMode === 'queue' && (
        <div className="text-center py-20 text-sm text-gray-400">로딩 중...</div>
      )}

      {error && viewMode === 'queue' && (
        <div className="text-center py-10 text-sm text-red-500">
          <p>데이터를 불러오지 못했습니다</p>
          <p className="mt-1 text-xs text-red-400 font-mono">
            {error instanceof Error ? error.message : String(error)}
          </p>
        </div>
      )}

      {/* 큐 뷰 */}
      {viewMode === 'queue' && (data || completedData) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 lg:h-[calc(100vh-250px)]">
          <QueueSection
            title="신규 요청"
            count={newRequests.length}
            items={newRequests}
            selectedId={selectedId}
            onSelect={setSelectedId}
            accent="border-blue-400"
          />
          <QueueSection
            title="판단 필요"
            count={reviewRequired.length}
            items={reviewRequired}
            selectedId={selectedId}
            onSelect={setSelectedId}
            accent="border-yellow-400"
          />
          <QueueSection
            title="진행 중"
            count={inProgress.length}
            items={inProgress}
            selectedId={selectedId}
            onSelect={setSelectedId}
            accent="border-green-400"
          />
          <QueueSection
            title="QC 완료"
            count={doneByQc.length}
            items={doneByQc}
            selectedId={selectedId}
            onSelect={setSelectedId}
            accent="border-purple-400"
          />
        </div>
      )}

      {/* 완료 이력 뷰 */}
      {viewMode === 'history' && (
        <div className="max-w-2xl">
          {historyData.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-20">완료된 요청이 없습니다</p>
          ) : (
            <div className="space-y-2 overflow-y-auto h-[calc(100vh-200px)]">
              {historyData.map((item) => (
                <HistoryCard
                  key={item.id}
                  item={item}
                  selected={selectedId === item.id}
                  onClick={() => setSelectedId(item.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 상세 모달 */}
      {selectedId && (
        <RequestDetailModal
          requestId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}

      {/* 작업 이력 모달 */}
      {showHistory && (
        <WorkHistoryModal
          onClose={() => setShowHistory(false)}
          branchId={user?.role === 'QC' ? user.branchId : undefined}
        />
      )}
    </div>
  );
}
