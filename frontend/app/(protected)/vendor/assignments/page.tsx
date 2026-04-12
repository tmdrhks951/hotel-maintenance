'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import StatusBadge from '@/components/ui/StatusBadge';
import PriorityBadge from '@/components/ui/PriorityBadge';
import { REQUEST_CATEGORY_LABEL } from '@/types';
import type { ApiResponse, FacilityRequestCard } from '@/types';

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

function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
  });
}

// ================================================================
// 배정 작업 조회 훅
// ================================================================

function useVendorAssignments() {
  return useQuery({
    queryKey: ['vendor-assignments'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<FacilityRequestCard[]>>(
        '/facility-requests/vendor-assignments',
      );
      return data.data;
    },
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
  });
}

// ================================================================
// 카드 컴포넌트
// ================================================================

function AssignmentCard({ card }: { card: FacilityRequestCard }) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/requests/${card.id}`)}
      className="bg-white border border-gray-200 rounded-lg p-3.5 cursor-pointer hover:shadow-sm hover:border-gray-300 transition-all space-y-2"
    >
      {/* 상단: 제목 + 우선순위 */}
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-gray-900 line-clamp-2 flex-1">
          {card.title}
        </h4>
        <PriorityBadge priority={card.priority} isEmergency={card.isEmergency} />
      </div>

      {/* 지점 + 카테고리 + 상태 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500">{card.branch.name}</span>
        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
          {REQUEST_CATEGORY_LABEL[card.category]}
        </span>
        <StatusBadge status={card.status} />
      </div>

      {/* 하단: 요청자 + 일정/시간 */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{card.createdBy?.name ?? '-'}</span>
        <span>
          {card.plannedWorkDate
            ? `예정 ${formatShortDate(card.plannedWorkDate)}`
            : timeAgo(card.createdAt)}
        </span>
      </div>
    </div>
  );
}

// ================================================================
// 메인 페이지
// ================================================================

export default function VendorAssignmentsPage() {
  const { data, isLoading } = useVendorAssignments();
  const items = data ?? [];

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-5">
        <h1 className="text-xl font-bold text-gray-900">배정된 작업</h1>
        {!isLoading && items.length > 0 && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
            {items.length}
          </span>
        )}
      </div>

      {/* 본문 */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-16">
          현재 배정된 작업이 없습니다
        </p>
      ) : (
        <div className="space-y-2.5">
          {items.map((card) => (
            <AssignmentCard key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}
