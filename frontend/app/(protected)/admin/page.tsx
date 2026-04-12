'use client';

import { useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { useKpiSummary, useAgingRequests, useReopenedRequests, useRepeatIssues } from '@/hooks/useAdmin';
import type { AdminFilters, AgingRequest, RepeatIssue } from '@/types';
import { REQUEST_CATEGORY_LABEL, REQUEST_STATUS_LABEL, PRIORITY_LABEL } from '@/types';

// ================================================================
// 섹션 탭
// ================================================================

type AdminTab = 'kpi' | 'aging' | 'reopened' | 'repeat';

// ================================================================
// KPI 카드
// ================================================================

function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className={`bg-white rounded-lg border p-4 ${accent ?? 'border-gray-200'}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ================================================================
// 필터 바
// ================================================================

function FilterBar({
  filters,
  onChange,
  onApply,
}: {
  filters: AdminFilters;
  onChange: (f: AdminFilters) => void;
  onApply: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 mb-4 items-end">
      <div>
        <label className="block text-xs text-gray-500 mb-1">지점 ID</label>
        <input
          type="text"
          placeholder="전체"
          value={filters.branchId ?? ''}
          onChange={(e) => onChange({ ...filters, branchId: e.target.value || undefined })}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-400 w-48"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">시작일</label>
        <input
          type="date"
          value={filters.startDate ?? ''}
          onChange={(e) => onChange({ ...filters, startDate: e.target.value || undefined })}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-400"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">종료일</label>
        <input
          type="date"
          value={filters.endDate ?? ''}
          onChange={(e) => onChange({ ...filters, endDate: e.target.value || undefined })}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-400"
        />
      </div>
      <button
        onClick={onApply}
        className="px-4 py-1.5 text-sm bg-gray-800 text-white rounded hover:bg-gray-700"
      >
        적용
      </button>
      <button
        onClick={() => onChange({})}
        className="px-4 py-1.5 text-sm border border-gray-200 text-gray-500 rounded hover:bg-gray-50"
      >
        초기화
      </button>
    </div>
  );
}

// ================================================================
// KPI 섹션
// ================================================================

function KpiSection({ filters }: { filters: AdminFilters }) {
  const { data, isLoading, error } = useKpiSummary(filters);

  if (isLoading) return <div className="text-sm text-gray-400 py-8 text-center">로딩 중...</div>;
  if (error || !data)
    return <div className="text-sm text-red-500 py-8 text-center">데이터를 불러오지 못했습니다</div>;

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <KpiCard
          label="미처리 건수"
          value={data.totalOpen}
          sub={`전체 ${data.total}건 중`}
          accent="border-orange-200"
        />
        <KpiCard
          label="긴급 미처리"
          value={data.emergencyOpen}
          sub="현재 진행 중"
          accent={data.emergencyOpen > 0 ? 'border-red-300' : 'border-gray-200'}
        />
        <KpiCard
          label="평균 처리시간"
          value={data.avgClosureHours !== null ? `${data.avgClosureHours}h` : '-'}
          sub={`완료 ${data.closedCount}건 기준`}
        />
        <KpiCard
          label="재오픈율"
          value={`${data.reopenRate}%`}
          sub={`재오픈 이력 ${data.everReopenedCount}건`}
          accent={data.reopenRate > 10 ? 'border-yellow-300' : 'border-gray-200'}
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="완료 건수"
          value={data.closedCount}
          sub="CLOSED 상태"
        />
        <KpiCard
          label="반복 고장 위치"
          value={data.repeatIssuesCount}
          sub="2회 이상 발생 위치"
          accent={data.repeatIssuesCount > 0 ? 'border-purple-200' : 'border-gray-200'}
        />
      </div>
    </div>
  );
}

// ================================================================
// 장기 미처리 섹션
// ================================================================

function AgingSection({ filters }: { filters: AdminFilters }) {
  const { data = [], isLoading, error } = useAgingRequests(filters);

  if (isLoading) return <div className="text-sm text-gray-400 py-8 text-center">로딩 중...</div>;
  if (error)
    return <div className="text-sm text-red-500 py-8 text-center">데이터를 불러오지 못했습니다</div>;
  if (data.length === 0)
    return <div className="text-sm text-gray-400 py-8 text-center">미처리 요청이 없습니다</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-xs text-gray-500">
            <th className="text-left py-2 pr-3 font-medium">제목</th>
            <th className="text-left py-2 pr-3 font-medium">지점</th>
            <th className="text-left py-2 pr-3 font-medium">카테고리</th>
            <th className="text-left py-2 pr-3 font-medium">상태</th>
            <th className="text-left py-2 pr-3 font-medium">담당자</th>
            <th className="text-right py-2 font-medium">경과일</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="py-2 pr-3">
                <div className="flex items-center gap-1">
                  {r.isEmergency && <span className="text-red-500 text-xs">🚨</span>}
                  <span className="font-medium text-gray-900 line-clamp-1 max-w-48">{r.title}</span>
                </div>
                {r.location && (
                  <span className="text-xs text-gray-400">{r.location.name}</span>
                )}
              </td>
              <td className="py-2 pr-3 text-xs text-gray-600">{r.branch.name}</td>
              <td className="py-2 pr-3 text-xs text-gray-600">
                {REQUEST_CATEGORY_LABEL[r.category]}
              </td>
              <td className="py-2 pr-3">
                <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                  {REQUEST_STATUS_LABEL[r.status]}
                </span>
              </td>
              <td className="py-2 pr-3 text-xs text-gray-600">
                {r.assignedTo?.name ?? <span className="text-gray-300">미배정</span>}
              </td>
              <td className="py-2 text-right">
                <span
                  className={`text-sm font-semibold ${
                    r.agingDays >= 7
                      ? 'text-red-600'
                      : r.agingDays >= 3
                        ? 'text-orange-500'
                        : 'text-gray-700'
                  }`}
                >
                  {r.agingDays}일
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ================================================================
// 재오픈 건 섹션
// ================================================================

function ReopenedSection({ filters }: { filters: AdminFilters }) {
  const { data, isLoading, error } = useReopenedRequests(filters);

  if (isLoading) return <div className="text-sm text-gray-400 py-8 text-center">로딩 중...</div>;
  if (error || !data)
    return <div className="text-sm text-red-500 py-8 text-center">데이터를 불러오지 못했습니다</div>;
  if (data.requests.length === 0)
    return <div className="text-sm text-gray-400 py-8 text-center">재오픈 건이 없습니다</div>;

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">재오픈 이력 총 {data.total}건</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs text-gray-500">
              <th className="text-left py-2 pr-3 font-medium">제목</th>
              <th className="text-left py-2 pr-3 font-medium">지점</th>
              <th className="text-left py-2 pr-3 font-medium">카테고리</th>
              <th className="text-left py-2 font-medium">현재 상태</th>
            </tr>
          </thead>
          <tbody>
            {data.requests.map((r) => (
              <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-1">
                    {r.isEmergency && <span className="text-red-500 text-xs">🚨</span>}
                    <span className="font-medium text-gray-900 line-clamp-1 max-w-52">{r.title}</span>
                  </div>
                  {r.location && (
                    <span className="text-xs text-gray-400">{r.location.name}</span>
                  )}
                </td>
                <td className="py-2 pr-3 text-xs text-gray-600">{r.branch.name}</td>
                <td className="py-2 pr-3 text-xs text-gray-600">
                  {REQUEST_CATEGORY_LABEL[r.category]}
                </td>
                <td className="py-2">
                  <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                    {REQUEST_STATUS_LABEL[r.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ================================================================
// 반복 고장 섹션
// ================================================================

function RepeatIssuesSection({ filters }: { filters: AdminFilters }) {
  const { data = [], isLoading, error } = useRepeatIssues(filters);

  if (isLoading) return <div className="text-sm text-gray-400 py-8 text-center">로딩 중...</div>;
  if (error)
    return <div className="text-sm text-red-500 py-8 text-center">데이터를 불러오지 못했습니다</div>;
  if (data.length === 0)
    return <div className="text-sm text-gray-400 py-8 text-center">반복 고장 위치가 없습니다</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-xs text-gray-500">
            <th className="text-left py-2 pr-3 font-medium">위치</th>
            <th className="text-left py-2 pr-3 font-medium">지점</th>
            <th className="text-left py-2 pr-3 font-medium">카테고리</th>
            <th className="text-right py-2 font-medium">발생 횟수</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, i) => (
            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="py-2 pr-3 font-medium text-gray-900">
                {item.location?.name ?? item.locationId ?? '알 수 없음'}
              </td>
              <td className="py-2 pr-3 text-xs text-gray-600">
                {item.location?.branch.name ?? '-'}
              </td>
              <td className="py-2 pr-3 text-xs text-gray-600">
                {REQUEST_CATEGORY_LABEL[item.category]}
              </td>
              <td className="py-2 text-right">
                <span
                  className={`text-sm font-bold ${
                    item.count >= 5 ? 'text-red-600' : item.count >= 3 ? 'text-orange-500' : 'text-gray-700'
                  }`}
                >
                  {item.count}회
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ================================================================
// 관리자 대시보드 (메인)
// ================================================================

export default function AdminPage() {
  const { user } = useAppStore();
  const [tab, setTab] = useState<AdminTab>('kpi');
  const [draftFilters, setDraftFilters] = useState<AdminFilters>({});
  const [appliedFilters, setAppliedFilters] = useState<AdminFilters>({});

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="text-center py-20 text-sm text-gray-400">
        ADMIN 계정만 접근 가능합니다
      </div>
    );
  }

  const tabs: { key: AdminTab; label: string }[] = [
    { key: 'kpi', label: 'KPI 요약' },
    { key: 'aging', label: '장기 미처리' },
    { key: 'reopened', label: '재오픈 건' },
    { key: 'repeat', label: '반복 고장' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-900">관리 대시보드</h1>
      </div>

      {/* 필터 */}
      <FilterBar
        filters={draftFilters}
        onChange={setDraftFilters}
        onApply={() => setAppliedFilters(draftFilters)}
      />

      {/* 탭 */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? 'border-gray-800 text-gray-900 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 컨텐츠 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        {tab === 'kpi' && <KpiSection filters={appliedFilters} />}
        {tab === 'aging' && <AgingSection filters={appliedFilters} />}
        {tab === 'reopened' && <ReopenedSection filters={appliedFilters} />}
        {tab === 'repeat' && <RepeatIssuesSection filters={appliedFilters} />}
      </div>
    </div>
  );
}
