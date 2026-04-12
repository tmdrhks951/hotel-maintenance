'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQcQueue, useQcReview } from '@/hooks/useQcQueue';
import BranchFilter from '@/components/ui/BranchFilter';
import StatusBadge from '@/components/ui/StatusBadge';
import PriorityBadge from '@/components/ui/PriorityBadge';
import { REQUEST_CATEGORY_LABEL } from '@/types';
import type { FacilityRequestCard } from '@/types';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  return `${day}일 전`;
}

// ================================================================
// 카드 컴포넌트
// ================================================================

function RequestCard({ card, onQuickAction }: {
  card: FacilityRequestCard;
  onQuickAction?: (action: string) => void;
}) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/requests/${card.id}`)}
      className="bg-white border border-gray-200 rounded-lg p-3.5 cursor-pointer hover:shadow-sm hover:border-gray-300 transition-all space-y-2"
    >
      {/* 상단: 제목 + 뱃지 */}
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-gray-900 line-clamp-2 flex-1">{card.title}</h4>
        <PriorityBadge priority={card.priority} isEmergency={card.isEmergency} />
      </div>

      {/* 지점 + 카테고리 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500">{card.branch.name}</span>
        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
          {REQUEST_CATEGORY_LABEL[card.category]}
        </span>
        <StatusBadge status={card.status} />
      </div>

      {/* 담당자 + 일정 */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{card.assignedTo ? card.assignedTo.name : '미배정'}</span>
        <span>
          {card.plannedWorkDate
            ? new Date(card.plannedWorkDate).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
            : timeAgo(card.createdAt)}
        </span>
      </div>

      {/* 빠른 액션 */}
      {onQuickAction && (
        <div className="flex gap-2 pt-1 border-t border-gray-100">
          {card.status === 'REQUESTED' && (
            <button
              onClick={(e) => { e.stopPropagation(); onQuickAction('RECEIVE'); }}
              className="flex-1 text-xs py-1.5 rounded bg-blue-50 text-blue-700 font-medium hover:bg-blue-100"
            >
              수령
            </button>
          )}
          {(card.status === 'RECEIVED' || card.status === 'SCHEDULED') && (
            <button
              onClick={(e) => { e.stopPropagation(); onQuickAction('START_WORK'); }}
              className="flex-1 text-xs py-1.5 rounded bg-purple-50 text-purple-700 font-medium hover:bg-purple-100"
            >
              작업 시작
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ================================================================
// 칸반 컬럼
// ================================================================

function KanbanColumn({ title, count, color, children }: {
  title: string;
  count: number;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-0">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>{count}</span>
      </div>
      <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
        {count === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8">대기 중인 요청 없음</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

// ================================================================
// 메인 페이지
// ================================================================

export default function QcQueuePage() {
  const [branchId, setBranchId] = useState<string | null>(null);
  const { data, isLoading } = useQcQueue(branchId ?? undefined);

  // 빠른 액션 핸들러 — 각 카드에서 requestId 캡처
  function QuickActionCard({ card }: { card: FacilityRequestCard }) {
    const review = useQcReview(card.id);
    const handleAction = (action: string) => {
      review.mutate({ action: action as 'RECEIVE' | 'START_WORK' });
    };
    return <RequestCard card={card} onQuickAction={handleAction} />;
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">QC 대기열</h1>
        <BranchFilter value={branchId} onChange={setBranchId} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <>
          {/* 모바일: 탭형 */}
          <div className="lg:hidden space-y-6">
            <KanbanColumn title="신규 요청" count={data?.newRequests.length ?? 0} color="bg-blue-100 text-blue-700">
              {data?.newRequests.map((c) => <QuickActionCard key={c.id} card={c} />)}
            </KanbanColumn>
            <KanbanColumn title="검토 필요" count={data?.reviewRequired.length ?? 0} color="bg-yellow-100 text-yellow-700">
              {data?.reviewRequired.map((c) => <QuickActionCard key={c.id} card={c} />)}
            </KanbanColumn>
            <KanbanColumn title="작업 중" count={data?.inProgress.length ?? 0} color="bg-purple-100 text-purple-700">
              {data?.inProgress.map((c) => <QuickActionCard key={c.id} card={c} />)}
            </KanbanColumn>
          </div>

          {/* 데스크탑: 3열 칸반 */}
          <div className="hidden lg:grid lg:grid-cols-3 gap-5">
            <KanbanColumn title="신규 요청" count={data?.newRequests.length ?? 0} color="bg-blue-100 text-blue-700">
              {data?.newRequests.map((c) => <QuickActionCard key={c.id} card={c} />)}
            </KanbanColumn>
            <KanbanColumn title="검토 필요" count={data?.reviewRequired.length ?? 0} color="bg-yellow-100 text-yellow-700">
              {data?.reviewRequired.map((c) => <QuickActionCard key={c.id} card={c} />)}
            </KanbanColumn>
            <KanbanColumn title="작업 중" count={data?.inProgress.length ?? 0} color="bg-purple-100 text-purple-700">
              {data?.inProgress.map((c) => <QuickActionCard key={c.id} card={c} />)}
            </KanbanColumn>
          </div>
        </>
      )}
    </div>
  );
}
