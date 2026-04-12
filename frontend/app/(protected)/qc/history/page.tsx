'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQcHistory } from '@/hooks/useQcQueue';
import BranchFilter from '@/components/ui/BranchFilter';
import StatusBadge from '@/components/ui/StatusBadge';
import { REQUEST_CATEGORY_LABEL } from '@/types';
import type { QcHistoryCard } from '@/types';

// ================================================================
// 유틸
// ================================================================

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
}

// ================================================================
// 테이블 행 (데스크탑)
// ================================================================

function HistoryRow({ card }: { card: QcHistoryCard }) {
  const router = useRouter();

  return (
    <tr
      onClick={() => router.push(`/requests/${card.id}`)}
      className="hover:bg-gray-50 cursor-pointer transition-colors"
    >
      <td className="px-4 py-3 text-sm text-gray-900 font-medium max-w-[240px] truncate">
        {card.title}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={card.status} />
      </td>
      <td className="px-4 py-3 text-xs text-gray-600">
        {REQUEST_CATEGORY_LABEL[card.category]}
      </td>
      <td className="px-4 py-3 text-xs text-gray-600">{card.branch.name}</td>
      <td className="px-4 py-3 text-xs text-gray-600">{card.completedBy?.name ?? '-'}</td>
      <td className="px-4 py-3 text-xs text-gray-500">{formatDate(card.completedAt)}</td>
      <td className="px-4 py-3 text-xs text-gray-500 text-center">{card._count.comments}</td>
    </tr>
  );
}

// ================================================================
// 카드 (모바일)
// ================================================================

function HistoryCard({ card }: { card: QcHistoryCard }) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/requests/${card.id}`)}
      className="bg-white border border-gray-200 rounded-lg p-3.5 cursor-pointer hover:shadow-sm hover:border-gray-300 transition-all space-y-2"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-gray-900 line-clamp-2 flex-1">{card.title}</h4>
        <StatusBadge status={card.status} />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500">{card.branch.name}</span>
        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
          {REQUEST_CATEGORY_LABEL[card.category]}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{card.completedBy?.name ?? '-'}</span>
        <div className="flex items-center gap-3">
          <span>{formatDate(card.completedAt)}</span>
          {card._count.comments > 0 && (
            <span className="text-gray-500">댓글 {card._count.comments}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ================================================================
// 메인 페이지
// ================================================================

export default function QcHistoryPage() {
  const [branchId, setBranchId] = useState<string | null>(null);
  const { data, isLoading } = useQcHistory(branchId ?? undefined);

  const items = data ?? [];

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">QC 작업 이력</h1>
        <BranchFilter value={branchId} onChange={setBranchId} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-16">데이터가 없습니다</p>
      ) : (
        <>
          {/* 모바일: 카드 목록 */}
          <div className="lg:hidden space-y-2.5">
            {items.map((c) => (
              <HistoryCard key={c.id} card={c} />
            ))}
          </div>

          {/* 데스크탑: 테이블 */}
          <div className="hidden lg:block bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">제목</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">카테고리</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">지점</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">완료자</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">완료일</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">댓글</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((c) => (
                  <HistoryRow key={c.id} card={c} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
