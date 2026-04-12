'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import BranchFilter from '@/components/ui/BranchFilter';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  useKpiSummary,
  useAgingRequests,
  useReopenedRequests,
  useRepeatIssues,
} from '@/hooks/useAdmin';
import { REQUEST_CATEGORY_LABEL } from '@/types';
import type { AdminFilters } from '@/types';

type Tab = 'aging' | 'reopened' | 'repeat';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [branchId, setBranchId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tab, setTab] = useState<Tab>('aging');

  const filters: AdminFilters = {
    branchId: branchId ?? undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  };

  const { data: kpi, isLoading: kpiLoading } = useKpiSummary(filters);
  const { data: aging } = useAgingRequests(filters);
  const { data: reopened } = useReopenedRequests(filters);
  const { data: repeat } = useRepeatIssues(filters);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-bold text-gray-900">KPI 대시보드</h1>
        <p className="text-xs text-gray-400 mt-0.5">시설 관리 현황 요약</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <BranchFilter value={branchId} onChange={setBranchId} />
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-400">~</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {(startDate || endDate || branchId) && (
          <button
            onClick={() => { setBranchId(null); setStartDate(''); setEndDate(''); }}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            초기화
          </button>
        )}
      </div>

      {kpiLoading ? (
        <div className="text-center py-16 text-sm text-gray-400">불러오는 중...</div>
      ) : kpi ? (
        <>
          {/* KPI Cards - Row 1 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <KpiCard label="전체 요청" value={kpi.total} />
            <KpiCard label="미처리 건" value={kpi.totalOpen} color="text-orange-600" />
            <KpiCard label="긴급 미처리" value={kpi.emergencyOpen} color="text-red-600" />
            <KpiCard
              label="평균 처리 시간"
              value={kpi.avgClosureHours != null ? `${kpi.avgClosureHours.toFixed(1)}h` : '-'}
            />
          </div>

          {/* KPI Cards - Row 2 */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <KpiCard
              label="재오픈율"
              value={`${kpi.reopenRate.toFixed(1)}%`}
              sub={`${kpi.everReopenedCount}건`}
              color="text-yellow-600"
            />
            <KpiCard
              label="반복 이슈"
              value={kpi.repeatIssuesCount}
              color="text-purple-600"
            />
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-4">
            <div className="flex gap-6">
              {([
                { key: 'aging' as Tab, label: '장기 미처리', count: aging?.length ?? 0 },
                { key: 'reopened' as Tab, label: '재오픈 건', count: reopened?.total ?? 0 },
                { key: 'repeat' as Tab, label: '반복 이슈', count: repeat?.length ?? 0 },
              ]).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                    tab === t.key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {t.label}
                  {t.count > 0 && (
                    <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5">
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          {tab === 'aging' && (
            <div className="overflow-x-auto">
              {!aging?.length ? (
                <p className="text-center py-12 text-sm text-gray-400">장기 미처리 건이 없습니다</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                      <th className="pb-2 pr-4 font-medium">제목</th>
                      <th className="pb-2 pr-4 font-medium">상태</th>
                      <th className="pb-2 pr-4 font-medium">카테고리</th>
                      <th className="pb-2 pr-4 font-medium">지점</th>
                      <th className="pb-2 pr-4 font-medium">경과(일)</th>
                      <th className="pb-2 font-medium">담당자</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aging.map((r) => (
                      <tr
                        key={r.id}
                        onClick={() => router.push(`/requests/${r.id}`)}
                        className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                      >
                        <td className="py-2.5 pr-4 text-gray-900 font-medium truncate max-w-[200px]">{r.title}</td>
                        <td className="py-2.5 pr-4"><StatusBadge status={r.status} /></td>
                        <td className="py-2.5 pr-4 text-gray-600">{REQUEST_CATEGORY_LABEL[r.category]}</td>
                        <td className="py-2.5 pr-4 text-gray-600">{r.branch.name}</td>
                        <td className="py-2.5 pr-4 font-semibold text-red-600">{r.agingDays}</td>
                        <td className="py-2.5 text-gray-600">{r.assignedTo?.name ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === 'reopened' && (
            <div className="overflow-x-auto">
              {!reopened?.requests?.length ? (
                <p className="text-center py-12 text-sm text-gray-400">재오픈 건이 없습니다</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                      <th className="pb-2 pr-4 font-medium">제목</th>
                      <th className="pb-2 pr-4 font-medium">상태</th>
                      <th className="pb-2 pr-4 font-medium">카테고리</th>
                      <th className="pb-2 pr-4 font-medium">지점</th>
                      <th className="pb-2 font-medium">등록일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reopened.requests.map((r) => (
                      <tr
                        key={r.id}
                        onClick={() => router.push(`/requests/${r.id}`)}
                        className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                      >
                        <td className="py-2.5 pr-4 text-gray-900 font-medium truncate max-w-[200px]">{r.title}</td>
                        <td className="py-2.5 pr-4"><StatusBadge status={r.status} /></td>
                        <td className="py-2.5 pr-4 text-gray-600">{REQUEST_CATEGORY_LABEL[r.category]}</td>
                        <td className="py-2.5 pr-4 text-gray-600">{r.branch.name}</td>
                        <td className="py-2.5 text-gray-500">{new Date(r.createdAt).toLocaleDateString('ko-KR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === 'repeat' && (
            <div className="overflow-x-auto">
              {!repeat?.length ? (
                <p className="text-center py-12 text-sm text-gray-400">반복 이슈가 없습니다</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                      <th className="pb-2 pr-4 font-medium">위치</th>
                      <th className="pb-2 pr-4 font-medium">카테고리</th>
                      <th className="pb-2 font-medium">건수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repeat.map((r, idx) => (
                      <tr key={idx} className="border-b border-gray-50">
                        <td className="py-2.5 pr-4 text-gray-900">
                          {r.location ? `${r.location.branch.name} / ${r.location.name}` : '(위치 미지정)'}
                        </td>
                        <td className="py-2.5 pr-4 text-gray-600">{REQUEST_CATEGORY_LABEL[r.category]}</td>
                        <td className="py-2.5 font-semibold text-purple-600">{r.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

// ----------------------------------------------------------------
// KPI 카드 컴포넌트
// ----------------------------------------------------------------

function KpiCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color ?? 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}
