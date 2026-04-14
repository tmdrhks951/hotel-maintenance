'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQcCompleted } from '@/hooks/useQcQueue';
import BranchFilter from '@/components/ui/BranchFilter';
import StatusBadge from '@/components/ui/StatusBadge';
import PriorityBadge from '@/components/ui/PriorityBadge';
import { REQUEST_CATEGORY_LABEL } from '@/types';
import type { FacilityRequestCard } from '@/types';
import { groupByDateThenBranch } from '@/lib/groupCards';

// ================================================================
// 유틸
// ================================================================

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
// 카드
// ================================================================

function VerifyCard({ card }: { card: FacilityRequestCard }) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/requests/${card.id}`)}
      className="bg-white border border-gray-200 rounded-lg p-3.5 cursor-pointer hover:shadow-sm hover:border-gray-300 transition-all space-y-1.5"
    >
      {/* 1순위 메인: 지점 + 객실 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-base font-bold text-gray-900 truncate">
            {card.branch.name}
            {card.roomNumber && <span className="ml-1.5">{card.roomNumber}</span>}
          </div>
          {/* 2순위 메인: 위치 */}
          {card.location && (
            <div className="text-sm text-gray-700 truncate mt-0.5">{card.location.name}</div>
          )}
        </div>
        <PriorityBadge priority={card.priority} isEmergency={card.isEmergency} />
      </div>

      {/* 3순위 보조: 카테고리 + 작업내용(title) + 상태 */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
          {REQUEST_CATEGORY_LABEL[card.category]}
        </span>
        <span className="text-xs text-gray-500 truncate flex-1 min-w-0">{card.title}</span>
        <StatusBadge status={card.status} />
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{card.assignedTo ? card.assignedTo.name : '미배정'}</span>
        <span>{timeAgo(card.updatedAt)}</span>
      </div>
    </div>
  );
}

// ================================================================
// 메인 페이지
// ================================================================

export default function QcVerifyPage() {
  const [branchId, setBranchId] = useState<string | null>(null);
  const { data, isLoading } = useQcCompleted(branchId ?? undefined);

  const cards = data?.doneByQc ?? [];

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">QC 검증</h1>
        <BranchFilter value={branchId} onChange={setBranchId} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : cards.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-16">데이터가 없습니다</p>
      ) : (
        /* [PATCH] 날짜 → 지점 2단 그룹핑 */
        <div className="space-y-5">
          {groupByDateThenBranch(cards, (c) => c.updatedAt).map((g) => (
            <div key={g.dateKey} className="space-y-3">
              <div className="text-xs font-semibold text-gray-500 border-b border-gray-100 pb-1">
                {g.dateLabel}
              </div>
              {g.branches.map((b) => (
                <div key={b.branchId} className="space-y-2">
                  <div className="text-[11px] font-medium text-gray-400 pl-1">{b.branchName}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {b.items.map((c) => (
                      <VerifyCard key={c.id} card={c} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
