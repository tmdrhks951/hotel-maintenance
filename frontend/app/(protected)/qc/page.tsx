'use client';

import { useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import {
  useQcQueue,
  useFacilityRequestDetail,
  useQcReview,
  useUpdateSchedule,
  useAssignWorker,
  useAssignableUsers,
} from '@/hooks/useQcQueue';
import type {
  FacilityRequestCard,
  FacilityRequestDetail,
  Priority,
  QcReviewAction,
} from '@/types';
import {
  REQUEST_CATEGORY_LABEL,
  REQUEST_STATUS_LABEL,
  PRIORITY_LABEL,
} from '@/types';

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
      className={`w-full text-left p-3 rounded-lg border transition-colors ${
        selected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
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
// 상태 이력
// ================================================================

function StatusLogList({ logs }: { logs: FacilityRequestDetail['statusLogs'] }) {
  if (logs.length === 0) return null;
  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        상태 이력
      </h4>
      <div className="space-y-1.5">
        {logs.map((log) => (
          <div key={log.id} className="text-xs text-gray-500 flex items-start gap-2">
            <span className="text-gray-300 mt-0.5">▸</span>
            <div>
              <span className="font-medium text-gray-700">
                {log.fromStatus ? REQUEST_STATUS_LABEL[log.fromStatus] : '(생성)'} →{' '}
                {REQUEST_STATUS_LABEL[log.toStatus]}
              </span>
              {log.reason && <span className="ml-1 text-gray-400">({log.reason})</span>}
              <span className="ml-2 text-gray-300">
                {log.changedBy.name} ·{' '}
                {new Date(log.createdAt).toLocaleString('ko-KR', {
                  month: 'numeric',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        ))}
      </div>
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
  const { data: req, isLoading } = useFacilityRequestDetail(requestId);
  const reviewMutation = useQcReview(requestId);
  const scheduleMutation = useUpdateSchedule(requestId);
  const assignMutation = useAssignWorker(requestId);

  // 담당자 후보 — req가 로드된 후 branchId로 조회
  const { data: assignableUsers = [] } = useAssignableUsers(req?.branchId);

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

  // 상태 전이 (판단 필요 / 수령)
  async function handleAction(action: QcReviewAction) {
    setError('');
    try {
      await reviewMutation.mutateAsync({ action, reason: judgementReason || undefined });
      showSuccess(
        action === 'MARK_REVIEW' ? '판단 필요로 이동했습니다' :
        action === 'RECEIVE' ? '수령 처리됐습니다' :
        action === 'REVERT_TO_REQUESTED' ? '신규 요청으로 되돌렸습니다' :
        '처리됐습니다',
      );
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

    if (s === 'RECEIVED') {
      return (
        <button
          onClick={() => handleAction('REVERT_TO_REQUESTED')}
          disabled={reviewMutation.isPending}
          className="w-full py-2 text-sm rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          ← 신규 요청으로 되돌리기
        </button>
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
        className="h-full w-full max-w-lg bg-white shadow-xl overflow-y-auto"
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

        {req && (
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
              {/* BEFORE 사진 */}
              {req.media.filter((m) => m.phase === 'BEFORE').map((m) => (
                <img
                  key={m.id}
                  src={m.url}
                  alt="BEFORE"
                  className="mt-2 w-full rounded-lg object-cover max-h-48"
                />
              ))}
            </section>

            <hr className="border-gray-100" />

            {/* 판단 섹션: 긴급 + 우선순위 */}
            <section>
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

              {/* 상태 전이 버튼 */}
              {renderActionButtons()}
            </section>

            <hr className="border-gray-100" />

            {/* 일정 섹션 */}
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

            {/* 상태 이력 */}
            <StatusLogList logs={req.statusLogs} />
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
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // QC는 자신의 지점만, ADMIN은 전체
  const branchId = user?.role === 'QC' ? user.branchId : undefined;
  const { data, isLoading, error, refetch } = useQcQueue(branchId);

  if (!user || (user.role !== 'QC' && user.role !== 'ADMIN')) {
    return (
      <div className="text-center py-20 text-sm text-gray-400">
        QC 또는 ADMIN 계정만 접근 가능합니다
      </div>
    );
  }

  const newRequests = data?.newRequests ?? [];
  const reviewRequired = data?.reviewRequired ?? [];
  const inProgress = data?.inProgress ?? [];

  return (
    <div className="h-full">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">QC 작업 큐</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            총 {newRequests.length + reviewRequired.length + inProgress.length}건 진행 중
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="text-xs text-gray-500 hover:text-blue-600 border border-gray-200 rounded px-2 py-1"
        >
          새로고침
        </button>
      </div>

      {isLoading && (
        <div className="text-center py-20 text-sm text-gray-400">로딩 중...</div>
      )}

      {error && (
        <div className="text-center py-10 text-sm text-red-500">
          <p>데이터를 불러오지 못했습니다</p>
          <p className="mt-1 text-xs text-red-400 font-mono">
            {error instanceof Error ? error.message : String(error)}
          </p>
        </div>
      )}

      {data && (
        <div className="grid grid-cols-3 gap-4 h-[calc(100vh-200px)]">
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
        </div>
      )}

      {/* 상세 모달 */}
      {selectedId && (
        <RequestDetailModal
          requestId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
