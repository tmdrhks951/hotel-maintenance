'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkHistory, useToggleOpsReport } from '@/hooks/useQcQueue';
import type { WorkHistoryParams } from '@/hooks/useQcQueue';
import { useAuthStore } from '@/stores/authStore';
import BranchFilter from '@/components/ui/BranchFilter';
import StatusBadge from '@/components/ui/StatusBadge';
import { REQUEST_CATEGORY_LABEL, REQUEST_STATUS_LABEL } from '@/types';
import type { WorkHistoryItem } from '@/types';
import { exportToCsv } from '@/lib/exportExcel';
import { groupByDateThenBranch } from '@/lib/groupCards';

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

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthAgoStr(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}

// ================================================================
// [PATCH] 운영팀 보고 체크 셀 — 팀장급만 토글, 그 외는 read-only 뱃지
// ================================================================

function OpsReportCell({
  item,
  canToggle,
}: {
  item: WorkHistoryItem;
  canToggle: boolean;
}) {
  const toggle = useToggleOpsReport(item.id);
  const reported = item.opsReported ?? false;

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

function HistoryRow({ item, canToggle }: { item: WorkHistoryItem; canToggle: boolean }) {
  const router = useRouter();

  return (
    <tr
      onClick={() => router.push(`/requests/${item.id}`)}
      className="hover:bg-gray-50 cursor-pointer transition-colors"
    >
      <td className="px-4 py-3 text-sm text-gray-900 font-medium max-w-[240px] truncate">
        {item.title}
      </td>
      <td className="px-4 py-3 text-xs text-gray-600">
        {REQUEST_CATEGORY_LABEL[item.category]}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={item.status} />
      </td>
      <td className="px-4 py-3 text-xs text-gray-600">{item.branch.name}</td>
      <td className="px-4 py-3 text-xs text-gray-600">{item.assignedTo?.name ?? '-'}</td>
      <td className="px-4 py-3 text-xs text-gray-500">{formatDate(item.plannedWorkDate)}</td>
      <td className="px-4 py-3 text-xs text-gray-500">{formatDate(item.completedAt)}</td>
      {/* [PATCH] 보고 컬럼 */}
      <td className="px-4 py-3 text-center">
        <OpsReportCell item={item} canToggle={canToggle} />
      </td>
    </tr>
  );
}

// ================================================================
// 카드 (모바일)
// ================================================================

function HistoryCard({ item, canToggle }: { item: WorkHistoryItem; canToggle: boolean }) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/requests/${item.id}`)}
      className="bg-white border border-gray-200 rounded-lg p-3.5 cursor-pointer hover:shadow-sm hover:border-gray-300 transition-all space-y-1.5"
    >
      {/* 1순위 메인: 지점 + 객실 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-base font-bold text-gray-900 truncate">
            {item.branch.name}
            {item.roomNumber && <span className="ml-1.5">{item.roomNumber}</span>}
          </div>
          {/* 2순위 메인: 위치 */}
          {item.location && (
            <div className="text-sm text-gray-700 truncate mt-0.5">{item.location.name}</div>
          )}
        </div>
        <StatusBadge status={item.status} />
      </div>

      {/* 3순위 보조: 카테고리 + 작업내용(title) + 보고 체크 */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
          {REQUEST_CATEGORY_LABEL[item.category]}
        </span>
        <span className="text-xs text-gray-500 truncate flex-1 min-w-0">{item.title}</span>
        {/* [PATCH] 보고 체크 */}
        <OpsReportCell item={item} canToggle={canToggle} />
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{item.assignedTo?.name ?? '-'}</span>
        <div className="flex items-center gap-3">
          {item.plannedWorkDate && <span>예정 {formatDate(item.plannedWorkDate)}</span>}
          {item.completedAt && <span>완료 {formatDate(item.completedAt)}</span>}
        </div>
      </div>
    </div>
  );
}

// ================================================================
// 메인 페이지
// ================================================================

export default function OperationsHistoryPage() {
  const [branchId, setBranchId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(monthAgoStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [keyword, setKeyword] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');

  const params: WorkHistoryParams = {
    startDate,
    endDate,
    keyword: searchKeyword || undefined,
    branchId: branchId ?? undefined,
  };

  const { data, isLoading } = useWorkHistory(params);
  const items = data ?? [];

  /// [PATCH] 운영팀 팀장급(TEAM_LEADER/DEPUTY_LEADER)만 보고 체크 토글 가능
  const user = useAuthStore((s) => s.user);
  const canToggleReport =
    user?.role === 'OPERATIONS' &&
    (user?.position === 'TEAM_LEADER' || user?.position === 'DEPUTY_LEADER');

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchKeyword(keyword);
  }

  function handleExport() {
    /// [PATCH] 보고여부 컬럼 CSV에 포함
    const headers = ['제목', '카테고리', '상태', '지점', '담당자', '예정일', '완료일', '보고여부'];
    const rows = items.map((item) => [
      item.title,
      REQUEST_CATEGORY_LABEL[item.category],
      REQUEST_STATUS_LABEL[item.status],
      item.branch.name,
      item.assignedTo?.name ?? '-',
      formatDate(item.plannedWorkDate),
      formatDate(item.completedAt),
      item.opsReported ? '보고' : '미보고',
    ]);
    const filename = `작업이력_${todayStr()}`;
    exportToCsv(filename, headers, rows);
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">작업 이력</h1>
        <BranchFilter value={branchId} onChange={setBranchId} />
      </div>

      {/* 필터 바 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-5">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
          {/* 시작일 */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">시작일</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 종료일 */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">종료일</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 키워드 */}
          <div className="flex flex-col gap-1 flex-1 w-full sm:w-auto">
            <label className="text-xs text-gray-500 font-medium">키워드</label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="제목, 내용 검색..."
              className="border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            />
          </div>

          {/* 검색 버튼 */}
          <button
            type="submit"
            className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
          >
            검색
          </button>

          {/* Excel 내보내기 */}
          <button
            type="button"
            onClick={handleExport}
            disabled={items.length === 0}
            className="px-4 py-1.5 border border-gray-300 text-sm font-medium text-gray-700 rounded hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Excel 내보내기
          </button>
        </form>
      </div>

      {/* 결과 건수 */}
      {!isLoading && (
        <p className="text-xs text-gray-500 mb-3">총 {items.length}건</p>
      )}

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
              (c) => c.operationsConfirmedAt ?? c.completedAt ?? c.plannedWorkDate ?? null,
            ).map((g) => (
              <div key={g.dateKey} className="space-y-2">
                <div className="text-xs font-semibold text-gray-500 border-b border-gray-100 pb-1">
                  {g.dateLabel}
                </div>
                {g.branches.map((b) => (
                  <div key={b.branchId} className="space-y-2 pl-1">
                    <div className="text-[11px] font-medium text-gray-400">{b.branchName}</div>
                    <div className="space-y-2.5">
                      {b.items.map((item) => (
                        <HistoryCard key={item.id} item={item} canToggle={canToggleReport} />
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">카테고리</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">지점</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">담당자</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">예정일</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">완료일</th>
                  {/* [PATCH] 보고 컬럼 */}
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">보고</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <HistoryRow key={item.id} item={item} canToggle={canToggleReport} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
