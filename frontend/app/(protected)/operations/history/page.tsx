'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkHistory } from '@/hooks/useQcQueue';
import type { WorkHistoryParams } from '@/hooks/useQcQueue';
import BranchFilter from '@/components/ui/BranchFilter';
import StatusBadge from '@/components/ui/StatusBadge';
import { REQUEST_CATEGORY_LABEL, REQUEST_STATUS_LABEL } from '@/types';
import type { WorkHistoryItem } from '@/types';
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

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthAgoStr(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}

// ================================================================
// 테이블 행 (데스크탑)
// ================================================================

function HistoryRow({ item }: { item: WorkHistoryItem }) {
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
    </tr>
  );
}

// ================================================================
// 카드 (모바일)
// ================================================================

function HistoryCard({ item }: { item: WorkHistoryItem }) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/requests/${item.id}`)}
      className="bg-white border border-gray-200 rounded-lg p-3.5 cursor-pointer hover:shadow-sm hover:border-gray-300 transition-all space-y-2"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-gray-900 line-clamp-2 flex-1">{item.title}</h4>
        <StatusBadge status={item.status} />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500">{item.branch.name}</span>
        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
          {REQUEST_CATEGORY_LABEL[item.category]}
        </span>
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

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchKeyword(keyword);
  }

  function handleExport() {
    const headers = ['제목', '카테고리', '상태', '지점', '담당자', '예정일', '완료일'];
    const rows = items.map((item) => [
      item.title,
      REQUEST_CATEGORY_LABEL[item.category],
      REQUEST_STATUS_LABEL[item.status],
      item.branch.name,
      item.assignedTo?.name ?? '-',
      formatDate(item.plannedWorkDate),
      formatDate(item.completedAt),
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
          {/* 모바일: 카드 목록 */}
          <div className="lg:hidden space-y-2.5">
            {items.map((item) => (
              <HistoryCard key={item.id} item={item} />
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <HistoryRow key={item.id} item={item} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
