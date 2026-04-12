'use client';

import { useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import {
  useOperationsDashboard,
  useFacilityRequestDetail,
  useOperationsConfirm,
} from '@/hooks/useQcQueue';
import type { OperationsCard } from '@/types';
import {
  REQUEST_CATEGORY_LABEL,
  REQUEST_STATUS_LABEL,
} from '@/types';
import { PhotoComparison } from '@/components/PhotoComparison';
import { StatusTimeline } from '@/components/StatusTimeline';
import { CommentSection } from '@/components/CommentSection';
import { WorkHistoryModal } from '@/components/WorkHistoryModal';
import { useEscKey } from '@/hooks/useEscKey';

// ================================================================
// 섹션 정의
// ================================================================

const SECTIONS = [
  { key: 'requested' as const, label: '일정 요청', icon: '📋', accentClass: 'border-orange-300' },
  { key: 'scheduled' as const, label: '일정 확정', icon: '📅', accentClass: 'border-blue-300'   },
  { key: 'today'     as const, label: '금일 진행', icon: '🏃', accentClass: 'border-yellow-400' },
  { key: 'completed' as const, label: '작업 완료', icon: '✅', accentClass: 'border-green-300'  },
] as const;

// ================================================================
// 작업 카드
// ================================================================

function WorkCard({
  req,
  selected,
  onClick,
  showTodayStyle = false,
}: {
  req: OperationsCard;
  selected: boolean;
  onClick: () => void;
  showTodayStyle?: boolean;
}) {
  const isConfirmNeeded = req.status === 'QC_VERIFIED';

  let cardClass: string;
  if (selected) {
    cardClass = 'border-blue-500 bg-blue-50';
  } else if (showTodayStyle) {
    cardClass = isConfirmNeeded
      ? 'border-green-200 bg-green-50 hover:border-green-300'
      : 'border-yellow-200 bg-yellow-50 hover:border-yellow-300';
  } else {
    cardClass = 'border-gray-200 bg-white hover:border-gray-300';
  }

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${cardClass}`}
    >
      {/* 제목 + 배지 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {req.isEmergency && (
            <span className="text-red-500 text-xs flex-shrink-0">🚨</span>
          )}
          <p className="text-sm font-medium text-gray-900 line-clamp-1 flex-1">
            {req.title}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isConfirmNeeded && showTodayStyle && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-700 border border-orange-200 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
              확인필요
            </span>
          )}
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 whitespace-nowrap">
            {REQUEST_STATUS_LABEL[req.status]}
          </span>
        </div>
      </div>

      {/* 카테고리 · 위치 · 지점 */}
      <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500 flex-wrap">
        <span>{REQUEST_CATEGORY_LABEL[req.category]}</span>
        {req.location && <span>· {req.location.name}</span>}
        <span className="text-gray-400">· {req.branch.name}</span>
      </div>

      {/* 작업 예정일 + 담당자 */}
      {req.plannedWorkDate && (
        <div className="mt-1 text-xs text-blue-600">
          작업예정:{' '}
          {new Date(req.plannedWorkDate).toLocaleDateString('ko-KR', {
            month: 'numeric',
            day: 'numeric',
          })}
          {req.assignedTo && (
            <span className="ml-1 text-gray-500">({req.assignedTo.name})</span>
          )}
        </div>
      )}

      {/* QC 검토 완료 */}
      {isConfirmNeeded && req.qcVerifiedAt && (
        <div className="mt-0.5 text-xs text-green-600">
          QC검토완료:{' '}
          {new Date(req.qcVerifiedAt).toLocaleString('ko-KR', {
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
          {req.qcVerifiedBy && (
            <span className="ml-1 text-gray-400">({req.qcVerifiedBy.name})</span>
          )}
        </div>
      )}
    </button>
  );
}

// ================================================================
// 댓글 섹션 래퍼
// ================================================================

function OpsCommentSection({ requestId }: { requestId: string }) {
  const { user } = useAppStore();
  if (!user) return null;
  return (
    <CommentSection
      requestId={requestId}
      currentUserId={user.id}
      currentRole={user.role}
    />
  );
}

// ================================================================
// 요청 상세 패널
// ================================================================

function OpsDetailPanel({
  requestId,
  onClose,
}: {
  requestId: string;
  onClose: () => void;
}) {
  const { data: req, isLoading } = useFacilityRequestDetail(requestId);
  const confirmMutation = useOperationsConfirm(requestId);

  useEscKey(onClose);

  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function showSuccess(msg: string) {
    setSuccess(msg);
    setError('');
    setTimeout(() => setSuccess(''), 2500);
  }

  async function handleConfirm() {
    setError('');
    try {
      await confirmMutation.mutateAsync({ note: note.trim() || undefined });
      showSuccess('확인 완료 처리됐습니다');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '처리 실패');
    }
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

            {/* 기본 정보 */}
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
                    <span className="ml-2">
                      위치: <span className="text-gray-700">{req.location.name}</span>
                    </span>
                  )}
                </div>
                <div>
                  카테고리:{' '}
                  <span className="text-gray-700">
                    {REQUEST_CATEGORY_LABEL[req.category]}
                  </span>
                </div>
                <div className="text-gray-700 mt-1">{req.description}</div>
              </div>

              <PhotoComparison media={req.media} />

              <div className="mt-3 space-y-1">
                {req.completedAt && (
                  <div className="text-xs text-green-700 bg-green-50 rounded px-2 py-1">
                    QC 완료: {new Date(req.completedAt).toLocaleString('ko-KR')}
                    {req.completedBy && (
                      <span className="ml-1">({req.completedBy.name})</span>
                    )}
                  </div>
                )}
                {req.qcVerifiedAt && (
                  <div className="text-xs text-purple-700 bg-purple-50 rounded px-2 py-1">
                    QC 검토: {new Date(req.qcVerifiedAt).toLocaleString('ko-KR')}
                    {req.qcVerifiedBy && (
                      <span className="ml-1">({req.qcVerifiedBy.name})</span>
                    )}
                  </div>
                )}
                {req.operationsConfirmedAt && (
                  <div className="text-xs text-blue-700 bg-blue-50 rounded px-2 py-1">
                    운영팀 확인: {new Date(req.operationsConfirmedAt).toLocaleString('ko-KR')}
                    {req.operationsConfirmedBy && (
                      <span className="ml-1">({req.operationsConfirmedBy.name})</span>
                    )}
                  </div>
                )}
              </div>
            </section>

            <hr className="border-gray-100" />

            {req.assignedTo && (
              <section>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  담당자
                </h4>
                <p className="text-sm text-gray-700">{req.assignedTo.name}</p>
              </section>
            )}

            {/* 운영팀 확인 액션 */}
            {req.status === 'QC_VERIFIED' && (
              <>
                <hr className="border-gray-100" />
                <section>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    확인 메모 (선택)
                  </h4>
                  <input
                    type="text"
                    placeholder="확인 메모 입력"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full mb-3 px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handleConfirm}
                    disabled={confirmMutation.isPending}
                    className="w-full py-3 text-sm font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {confirmMutation.isPending ? '처리 중...' : '확인 완료 (종료)'}
                  </button>
                </section>
              </>
            )}

            <StatusTimeline logs={req.statusLogs} />
            <OpsCommentSection requestId={requestId} />
          </div>
        )}
      </div>
    </div>
  );
}

// ================================================================
// 운영팀 확인 페이지 (메인)
// ================================================================

export default function OperationsPage() {
  const { user } = useAppStore();
  const [selectedId,   setSelectedId]   = useState<string | null>(null);
  const [showHistory,  setShowHistory]  = useState(false);

  const branchId = user?.role === 'OPERATIONS' ? user.branchId : undefined;
  const { data, isLoading, error, refetch } = useOperationsDashboard(branchId);

  if (!user || (user.role !== 'OPERATIONS' && user.role !== 'ADMIN')) {
    return (
      <div className="text-center py-20 text-sm text-gray-400">
        운영팀 또는 ADMIN 계정만 접근 가능합니다
      </div>
    );
  }

  const sectionData: Record<string, OperationsCard[]> = {
    requested: data?.requested ?? [],
    scheduled: data?.scheduled ?? [],
    today:     data?.today     ?? [],
    completed: data?.completed ?? [],
  };

  const confirmNeeded = (data?.today ?? []).filter((r) => r.status === 'QC_VERIFIED').length;

  return (
    <div>
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-gray-900">작업 확인</h1>
          {confirmNeeded > 0 && (
            <p className="text-xs text-orange-500 mt-0.5 font-medium">
              확인 필요 {confirmNeeded}건
            </p>
          )}
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
            onClick={() => refetch()}
            className="text-xs text-gray-500 hover:text-blue-600 border border-gray-200 rounded px-2 py-1"
          >
            새로고침
          </button>
        </div>
      </div>

      {/* 로딩 / 오류 */}
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

      {/* 4개 섹션 — 가로 나열, 각 섹션 아래 목록 바로 표시 */}
      {data && (
        <div className="grid grid-cols-4 gap-4 items-start">
          {SECTIONS.map(({ key, label, icon, accentClass }) => {
            const items = sectionData[key];
            return (
              <div key={key}>
                {/* 섹션 헤더 */}
                <div className={`flex items-center gap-1.5 mb-3 pb-2 border-b-2 ${accentClass}`}>
                  <span className="text-sm">{icon}</span>
                  <h2 className="text-sm font-semibold text-gray-700">{label}</h2>
                  <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 leading-none ml-auto">
                    {items.length}
                  </span>
                </div>
                {/* 카드 목록 */}
                {items.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">없음</p>
                ) : (
                  <div className="space-y-2">
                    {items.map((req) => (
                      <WorkCard
                        key={req.id}
                        req={req}
                        selected={selectedId === req.id}
                        onClick={() => setSelectedId(req.id)}
                        showTodayStyle={key === 'today'}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 상세 패널 */}
      {selectedId && (
        <OpsDetailPanel
          requestId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}

      {/* 작업 이력 모달 */}
      {showHistory && (
        <WorkHistoryModal
          onClose={() => setShowHistory(false)}
          branchId={branchId}
        />
      )}
    </div>
  );
}
