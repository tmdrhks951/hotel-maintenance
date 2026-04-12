'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQcCompleted } from '@/hooks/useQcQueue';
import BranchFilter from '@/components/ui/BranchFilter';
import StatusBadge from '@/components/ui/StatusBadge';
import PriorityBadge from '@/components/ui/PriorityBadge';
import { REQUEST_CATEGORY_LABEL } from '@/types';
import type { FacilityRequestCard } from '@/types';

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
      className="bg-white border border-gray-200 rounded-lg p-3.5 cursor-pointer hover:shadow-sm hover:border-gray-300 transition-all space-y-2"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-gray-900 line-clamp-2 flex-1">{card.title}</h4>
        <PriorityBadge priority={card.priority} isEmergency={card.isEmergency} />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500">{card.branch.name}</span>
        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
          {REQUEST_CATEGORY_LABEL[card.category]}
        </span>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {cards.map((c) => (
            <VerifyCard key={c.id} card={c} />
          ))}
        </div>
      )}
    </div>
  );
}
