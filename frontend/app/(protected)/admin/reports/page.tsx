'use client';

import { useState, useMemo } from 'react';
import { useAppStore } from '@/stores/appStore';
import { useBranches } from '@/hooks/useBranches';
import { useWorkHistory } from '@/hooks/useQcQueue';
import type { WorkHistoryItem } from '@/types';
import { REQUEST_CATEGORY_LABEL, REQUEST_STATUS_LABEL } from '@/types';

// ================================================================
// 날짜 유틸
// ================================================================

function getMonthRange(year: number, month: number) {
  const lastDay = new Date(year, month, 0).getDate();
  return {
    startDate: `${year}-${String(month).padStart(2, '0')}-01`,
    endDate: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  };
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('ko-KR', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ================================================================
// 정렬: 긴급 > 지점 > 위치 > 카테고리
// ================================================================

function sortForReport(items: WorkHistoryItem[]): WorkHistoryItem[] {
  return [...items].sort((a, b) => {
    // 1. 긴급 먼저
    if (a.isEmergency !== b.isEmergency) return a.isEmergency ? -1 : 1;
    // 2. 지점명
    const branchCmp = a.branch.name.localeCompare(b.branch.name, 'ko');
    if (branchCmp !== 0) return branchCmp;
    // 3. 위치명 (없으면 뒤로)
    const locA = a.location?.name ?? 'zzz';
    const locB = b.location?.name ?? 'zzz';
    const locCmp = locA.localeCompare(locB, 'ko');
    if (locCmp !== 0) return locCmp;
    // 4. 카테고리
    const catA = REQUEST_CATEGORY_LABEL[a.category];
    const catB = REQUEST_CATEGORY_LABEL[b.category];
    return catA.localeCompare(catB, 'ko');
  });
}

// ================================================================
// 그룹 키 — 행 사이 변화 감지용
// ================================================================

interface GroupKey {
  isEmergency: boolean;
  branch: string;
  location: string;
  category: string;
}

function getGroupKey(item: WorkHistoryItem): GroupKey {
  return {
    isEmergency: item.isEmergency,
    branch: item.branch.name,
    location: item.location?.name ?? '',
    category: item.category,
  };
}

// ================================================================
// 행 배경 색상 (최대한 낮은 채도)
// ================================================================

// 지점별 교대 색상 — 매우 연한 회색 2종
const BRANCH_COLORS = ['bg-white', 'bg-stone-50/60'];
// 위치별 교대 — 미세한 차이
const LOCATION_SHADES = ['', 'bg-gray-50/40'];

function getRowBg(
  item: WorkHistoryItem,
  branchIdx: number,
  locationIdx: number,
): string {
  // 긴급: 매우 연한 빨간 틴트
  if (item.isEmergency) {
    return locationIdx % 2 === 0 ? 'bg-red-50/40' : 'bg-red-50/60';
  }
  // 비긴급: 지점 교대 + 위치 교대
  if (locationIdx % 2 === 1) {
    return branchIdx % 2 === 0 ? 'bg-gray-50/50' : 'bg-stone-50/70';
  }
  return branchIdx % 2 === 0 ? 'bg-white' : 'bg-stone-50/40';
}

// ================================================================
// CSV 생성 & 다운로드 (새 칼럼 순서)
// ================================================================

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function downloadCSV(data: WorkHistoryItem[], filename: string) {
  const headers = [
    '긴급', '지점', '위치', '카테고리', '제목', '상태',
    '예정일', '완료일', '담당자', '완료자',
    'QC검토일', 'QC검토자', '운영확인일', '운영확인자',
  ];

  const rows = data.map((item) => [
    item.isEmergency ? 'Y' : '',
    item.branch.name,
    item.location?.name ?? '',
    REQUEST_CATEGORY_LABEL[item.category],
    item.title,
    REQUEST_STATUS_LABEL[item.status],
    formatDate(item.plannedWorkDate),
    formatDateTime(item.completedAt),
    item.assignedTo?.name ?? '',
    item.completedBy?.name ?? '',
    formatDateTime(item.qcVerifiedAt),
    item.qcVerifiedBy?.name ?? '',
    formatDateTime(item.operationsConfirmedAt),
    item.operationsConfirmedBy?.name ?? '',
  ]);

  const csvContent =
    '\uFEFF' +
    headers.map(escapeCSV).join(',') + '\n' +
    rows.map((row) => row.map(escapeCSV).join(',')).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// ================================================================
// KPI 카드
// ================================================================

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ================================================================
// 리포트 페이지
// ================================================================

export default function ReportsPage() {
  const { user } = useAppStore();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [branchId, setBranchId] = useState('');

  const { data: branches = [] } = useBranches(true);
  const { startDate, endDate } = getMonthRange(year, month);
  const { data: rawItems = [], isLoading } = useWorkHistory({
    startDate, endDate, branchId: branchId || undefined,
  });

  // 정렬된 데이터
  const sorted = useMemo(() => sortForReport(rawItems), [rawItems]);

  // 접근 제어
  if (!user || (user.role !== 'ADMIN' && user.role !== 'OPERATIONS')) {
    return (
      <div className="text-center py-20 text-sm text-gray-400">
        ADMIN 또는 OPERATIONS 계정만 접근 가능합니다
      </div>
    );
  }

  // KPI
  const totalCount = sorted.length;
  const completedCount = sorted.filter((i) => i.completedAt).length;
  const confirmedCount = sorted.filter((i) => i.operationsConfirmedAt).length;
  const emergencyCount = sorted.filter((i) => i.isEmergency).length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // 카테고리별 집계
  const categoryStats = useMemo(() => {
    const map: Record<string, number> = {};
    sorted.forEach((item) => {
      const label = REQUEST_CATEGORY_LABEL[item.category];
      map[label] = (map[label] ?? 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [sorted]);

  // 월 이동
  function prevMonth() {
    if (month === 1) { setYear(year - 1); setMonth(12); } else setMonth(month - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear(year + 1); setMonth(1); } else setMonth(month + 1);
  }

  const filename = `작업실적_${year}년${month}월${branchId ? '_' + (branches.find((b) => b.id === branchId)?.name ?? '') : ''}.csv`;

  // 그룹 변화 추적용 인덱스
  let branchIdx = 0;
  let locationIdx = 0;
  let prevBranch = '';
  let prevLocation = '';
  let prevEmergency: boolean | null = null;

  return (
    <div className="max-w-5xl mx-auto">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-lg font-bold text-gray-900">월별 작업 실적 리포트</h1>
          <p className="text-xs text-gray-400 mt-0.5">{year}년 {month}월 실적</p>
        </div>
        <button
          onClick={() => downloadCSV(sorted, filename)}
          disabled={isLoading || sorted.length === 0}
          className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          📥 CSV 다운로드
        </button>
      </div>

      {/* 필터 바 */}
      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 px-1">
          <button onClick={prevMonth} className="px-2 py-1.5 text-gray-500 hover:text-gray-800 text-sm">◀</button>
          <span className="text-sm font-medium text-gray-800 px-2 min-w-[100px] text-center">
            {year}년 {month}월
          </span>
          <button onClick={nextMonth} className="px-2 py-1.5 text-gray-500 hover:text-gray-800 text-sm">▶</button>
        </div>
        <select
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-blue-400"
        >
          <option value="">전체 지점</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <KpiCard label="총 요청" value={totalCount} />
        <KpiCard label="작업 완료" value={completedCount} sub={`완료율 ${completionRate}%`} />
        <KpiCard label="운영 확인" value={confirmedCount} />
        <KpiCard label="긴급 건수" value={emergencyCount} />
      </div>

      {/* 카테고리별 분포 */}
      {categoryStats.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-5">
          <h3 className="text-xs font-semibold text-gray-500 mb-3">카테고리별 분포</h3>
          <div className="flex flex-wrap gap-2">
            {categoryStats.map(([label, count]) => (
              <div key={label} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-3 py-1.5">
                <span className="text-sm text-gray-800 font-medium">{label}</span>
                <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 데이터 테이블 */}
      {isLoading && (
        <div className="text-center py-16 text-sm text-gray-400">불러오는 중...</div>
      )}
      {!isLoading && sorted.length === 0 && (
        <div className="text-center py-16 text-sm text-gray-400">
          {year}년 {month}월 작업 실적이 없습니다
        </div>
      )}

      {!isLoading && sorted.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full min-w-[900px] text-xs">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200">
                <th className="py-2.5 px-2.5 text-left font-semibold text-gray-500 w-10">긴급</th>
                <th className="py-2.5 px-2.5 text-left font-semibold text-gray-500">지점</th>
                <th className="py-2.5 px-2.5 text-left font-semibold text-gray-500">위치</th>
                <th className="py-2.5 px-2.5 text-left font-semibold text-gray-500">카테고리</th>
                <th className="py-2.5 px-2.5 text-left font-semibold text-gray-500">제목</th>
                <th className="py-2.5 px-2.5 text-left font-semibold text-gray-500">상태</th>
                <th className="py-2.5 px-2.5 text-left font-semibold text-gray-500">예정일</th>
                <th className="py-2.5 px-2.5 text-left font-semibold text-gray-500">완료일</th>
                <th className="py-2.5 px-2.5 text-left font-semibold text-gray-500">담당자</th>
                <th className="py-2.5 px-2.5 text-left font-semibold text-gray-500">완료자</th>
                <th className="py-2.5 px-2.5 text-left font-semibold text-gray-500">QC검토일</th>
                <th className="py-2.5 px-2.5 text-left font-semibold text-gray-500">QC검토자</th>
                <th className="py-2.5 px-2.5 text-left font-semibold text-gray-500">운영확인일</th>
                <th className="py-2.5 px-2.5 text-left font-semibold text-gray-500">운영확인자</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item, i) => {
                const rows: React.ReactNode[] = [];

                // 긴급/비긴급 구간 전환 — 구분선
                if (prevEmergency !== null && prevEmergency !== item.isEmergency) {
                  branchIdx = 0; locationIdx = 0; prevBranch = ''; prevLocation = '';
                  rows.push(
                    <tr key={`sep-em-${i}`}>
                      <td colSpan={14} className="h-1 bg-gray-200" />
                    </tr>,
                  );
                }
                prevEmergency = item.isEmergency;

                // 지점 변화 — 구분 헤더
                if (item.branch.name !== prevBranch) {
                  if (prevBranch !== '') branchIdx++;
                  prevBranch = item.branch.name;
                  prevLocation = '';
                  locationIdx = 0;
                  rows.push(
                    <tr key={`branch-${i}`} className="border-t-2 border-gray-200">
                      <td colSpan={14} className="py-1.5 px-2.5 bg-gray-50 text-xs font-semibold text-gray-600">
                        {item.isEmergency && <span className="text-red-500 mr-1">🚨 긴급</span>}
                        📍 {item.branch.name}
                      </td>
                    </tr>,
                  );
                }

                // 위치 변화
                const currentLoc = item.location?.name ?? '';
                if (currentLoc !== prevLocation) {
                  locationIdx++;
                  prevLocation = currentLoc;
                }

                const rowBg = getRowBg(item, branchIdx, locationIdx);

                rows.push(
                  <tr key={item.id} className={`border-b border-gray-100/80 ${rowBg}`}>
                    <td className="py-2 px-2.5 text-center">
                      {item.isEmergency ? <span className="text-red-500">🚨</span> : ''}
                    </td>
                    <td className="py-2 px-2.5 text-gray-600">{item.branch.name}</td>
                    <td className="py-2 px-2.5 text-gray-500">{item.location?.name ?? '-'}</td>
                    <td className="py-2 px-2.5 text-gray-600">{REQUEST_CATEGORY_LABEL[item.category]}</td>
                    <td className="py-2 px-2.5 text-gray-900 font-medium max-w-[180px] truncate">{item.title}</td>
                    <td className="py-2 px-2.5">
                      <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                        {REQUEST_STATUS_LABEL[item.status]}
                      </span>
                    </td>
                    <td className="py-2 px-2.5 text-gray-500">{formatDate(item.plannedWorkDate)}</td>
                    <td className="py-2 px-2.5 text-gray-500">{formatDateTime(item.completedAt)}</td>
                    <td className="py-2 px-2.5 text-gray-600">{item.assignedTo?.name ?? '-'}</td>
                    <td className="py-2 px-2.5 text-gray-600">{item.completedBy?.name ?? '-'}</td>
                    <td className="py-2 px-2.5 text-gray-500">{formatDateTime(item.qcVerifiedAt)}</td>
                    <td className="py-2 px-2.5 text-gray-600">{item.qcVerifiedBy?.name ?? '-'}</td>
                    <td className="py-2 px-2.5 text-gray-500">{formatDateTime(item.operationsConfirmedAt)}</td>
                    <td className="py-2 px-2.5 text-gray-600">{item.operationsConfirmedBy?.name ?? '-'}</td>
                  </tr>,
                );

                return rows;
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
