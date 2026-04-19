'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQcHistory, useToggleQcReport } from '@/hooks/useQcQueue';
import { useAuthStore } from '@/stores/authStore';
import BranchFilter from '@/components/ui/BranchFilter';
import StatusBadge from '@/components/ui/StatusBadge';
import { REQUEST_CATEGORY_LABEL, REQUEST_STATUS_LABEL } from '@/types';
import type { QcHistoryCard } from '@/types';
import { groupByDateThenBranch } from '@/lib/groupCards';
import { exportToCsv } from '@/lib/exportExcel';

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

/// [PATCH] 답변 읽음 상태 — localStorage 기반 (페이지별 분리 키)
const READ_STORAGE_KEY = 'qc_history_answer_read_v1';

function getReadMap(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(READ_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function markAnswerRead(requestId: string) {
  if (typeof window === 'undefined') return;
  try {
    const map = getReadMap();
    map[requestId] = new Date().toISOString();
    window.localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

function useUnreadAnswer(card: Pick<QcHistoryCard, 'id' | '_count' | 'comments'>) {
  const [readAt, setReadAt] = useState<string | null>(null);
  useEffect(() => {
    setReadAt(getReadMap()[card.id] ?? null);
  }, [card.id]);

  const hasAnswer = (card._count?.comments ?? 0) > 0;
  const latestCommentAt = card.comments?.[0]?.createdAt ?? null;
  const hasUnreadAnswer =
    hasAnswer && !!latestCommentAt && (!readAt || readAt < latestCommentAt);

  const markRead = () => {
    if (hasUnreadAnswer) {
      markAnswerRead(card.id);
      setReadAt(new Date().toISOString());
    }
  };

  return { hasUnreadAnswer, markRead };
}

// ================================================================
// [PATCH] QC 팀장 보고 체크 셀 — 팀장급만 토글, 그 외는 read-only 뱃지
// ================================================================

function QcReportCell({
  card,
  canToggle,
}: {
  card: QcHistoryCard;
  canToggle: boolean;
}) {
  const toggle = useToggleQcReport(card.id);
  const reported = card.qcReported ?? false;

  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canToggle || toggle.isPending) return;
    toggle.mutate({ reported: !reported });
  };

  if (!canToggle) {
    return reported ? (
      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
        보고
      </span>
    ) : (
      <span className="text-xs text-gray-300">-</span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={toggle.isPending}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold transition-colors disabled:opacity-50 ${
        reported
          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
      }`}
    >
      <span
        className={`inline-block w-3 h-3 rounded-sm border ${
          reported ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-400'
        }`}
      />
      {reported ? '보고' : '미보고'}
    </button>
  );
}

// ================================================================
// 테이블 행 (데스크탑)
// ================================================================

function HistoryRow({ card, canToggle }: { card: QcHistoryCard; canToggle: boolean }) {
  const router = useRouter();
  /// [PATCH] 미읽음 답변 하이라이트 — 클릭 시 읽음 처리
  const { hasUnreadAnswer, markRead } = useUnreadAnswer(card);

  return (
    <tr
      onClick={() => {
        markRead();
        router.push(`/requests/${card.id}`);
      }}
      className={`hover:bg-gray-50 cursor-pointer transition-colors ${hasUnreadAnswer ? 'bg-yellow-50/60' : ''}`}
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
      {/* [PATCH] 보고 컬럼 */}
      <td className="px-4 py-3 text-center">
        <QcReportCell card={card} canToggle={canToggle} />
      </td>
      <td className="px-4 py-3 text-xs text-gray-500 text-center">{card._count.comments}</td>
    </tr>
  );
}

// ================================================================
// 카드 (모바일)
// ================================================================

function HistoryCard({ card, canToggle }: { card: QcHistoryCard; canToggle: boolean }) {
  const router = useRouter();
  /// [PATCH] 미읽음 답변 하이라이트 — 클릭 시 읽음 처리
  const { hasUnreadAnswer, markRead } = useUnreadAnswer(card);

  return (
    <div
      onClick={() => {
        markRead();
        router.push(`/requests/${card.id}`);
      }}
      className={`bg-white border border-gray-200 rounded-lg p-3.5 cursor-pointer hover:shadow-sm hover:border-gray-300 transition-all space-y-1.5 ${hasUnreadAnswer ? 'card-answer-glow' : ''}`}
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
        <StatusBadge status={card.status} />
      </div>

      {/* 3순위 보조: 카테고리 + 작업내용(title) + 보고 체크 */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
          {REQUEST_CATEGORY_LABEL[card.category]}
        </span>
        <span className="text-xs text-gray-500 truncate flex-1 min-w-0">{card.title}</span>
        {/* [PATCH] 보고 체크 */}
        <QcReportCell card={card} canToggle={canToggle} />
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{card.completedBy?.name ?? '-'}</span>
        <div className="flex items-center gap-3">
          <span>{formatDate(card.completedAt)}</span>
          {card._count.comments > 0 && (
            <span className="text-gray-500">답변 {card._count.comments}</span>
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
  /// [PATCH] QC 팀장급(TEAM_LEADER/DEPUTY_LEADER)만 보고 체크 토글 가능
  const user = useAuthStore((s) => s.user);
  const canToggleReport =
    user?.role === 'QC' &&
    (user?.position === 'TEAM_LEADER' || user?.position === 'DEPUTY_LEADER');

  /// [PATCH] Excel 내보내기 — QC 팀장/부팀장 또는 ADMIN 에게만 노출
  const canExport =
    user?.role === 'ADMIN' ||
    (user?.role === 'QC' &&
      (user?.position === 'TEAM_LEADER' || user?.position === 'DEPUTY_LEADER'));

  const items = data ?? [];

  function handleExport() {
    const headers = ['제목', '카테고리', '상태', '지점', '객실', '완료자', '완료일', '보고여부', '답변수'];
    const rows = items.map((item) => [
      item.title,
      REQUEST_CATEGORY_LABEL[item.category],
      REQUEST_STATUS_LABEL[item.status],
      item.branch.name,
      item.roomNumber ?? '-',
      item.completedBy?.name ?? '-',
      formatDate(item.completedAt),
      item.qcReported ? '보고' : '미보고',
      String(item._count?.comments ?? 0),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    const filename = `QC작업이력_${today}`;
    exportToCsv(filename, headers, rows);
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">QC 작업 이력</h1>
        <div className="flex items-center gap-2">
          <BranchFilter value={branchId} onChange={setBranchId} />
          {canExport && (
            <button
              type="button"
              onClick={handleExport}
              disabled={items.length === 0}
              className="px-3 py-1.5 border border-gray-300 text-sm font-medium text-gray-700 rounded hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="현재 필터 결과를 Excel(CSV)로 내보내기"
            >
              Excel 내보내기
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-16">데이터가 없습니다</p>
      ) : (
        <>
          {/* 모바일: 날짜 → 지점 그룹 카드 목록 */}
          <div className="lg:hidden space-y-4">
            {groupByDateThenBranch(
              items,
              (c) => c.operationsConfirmedAt ?? c.completedAt ?? c.updatedAt,
            ).map((g) => (
              <div key={g.dateKey} className="space-y-2">
                <div className="text-xs font-semibold text-gray-500 border-b border-gray-100 pb-1">
                  {g.dateLabel}
                </div>
                {g.branches.map((b) => (
                  <div key={b.branchId} className="space-y-2 pl-1">
                    <div className="text-[11px] font-medium text-gray-400">{b.branchName}</div>
                    <div className="space-y-2.5">
                      {b.items.map((c) => (
                        <HistoryCard key={c.id} card={c} canToggle={canToggleReport} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
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
                  {/* [PATCH] 보고 컬럼 */}
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">보고</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">답변</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((c) => (
                  <HistoryRow key={c.id} card={c} canToggle={canToggleReport} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
