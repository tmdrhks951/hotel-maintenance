'use client';

/// [PATCH] STEP 3: 달력 페이지 본문 — 달력 + 선택 일자 상세 패널.
///   • /operations/calendar 와 /qc/calendar 에서 공통 사용.
///   • 범위: 당일 기준 ±1개월 (2개월 윈도우).
///   • 기본 상태: 이번 달 표시, 선택 일자는 오늘.
///   • 달 이동은 2개월 범위 내에서만.
///   • 선택 일자 하단 패널은 지점별로 그룹핑된 카드 리스트.

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCalendarView } from '@/hooks/useQcQueue';
import { useAuthStore } from '@/stores/authStore';
import CalendarMonthGrid from './CalendarMonthGrid';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';
import { REQUEST_CATEGORY_LABEL } from '@/types';
import type { CalendarCard } from '@/types';

function kstToday(): Date {
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const y = kstNow.getUTCFullYear();
  const m = kstNow.getUTCMonth();
  const d = kstNow.getUTCDate();
  return new Date(y, m, d); // 로컬 기준 오늘 자정 (UI 용도로만 사용)
}

function monthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function formatYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export interface CalendarViewPanelProps {
  branchId?: string | null;
}

export default function CalendarViewPanel({ branchId }: CalendarViewPanelProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const myBranchIds = useMemo(() => {
    if (!user) return new Set<string>();
    if (user.branchIds && user.branchIds.length > 0) return new Set(user.branchIds);
    if (user.branchId) return new Set([user.branchId]);
    return new Set<string>();
  }, [user]);

  const today = useMemo(() => kstToday(), []);
  const todayKey = formatYmd(today);

  // 2개월 범위 — 전월 1일 ~ 익월 말일
  const rangeStart = useMemo(() => addMonths(today, -1), [today]);
  const rangeEnd = useMemo(() => {
    const next = addMonths(today, 2); // 익월의 다음 달 1일
    return new Date(next.getFullYear(), next.getMonth(), 0); // → 익월 말일
  }, [today]);

  // 현재 표시 월 (기본: 이번 달)
  const [viewMonth, setViewMonth] = useState<Date>(() => monthStart(today));
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(todayKey);

  const canPrev = monthStart(viewMonth) > monthStart(rangeStart);
  const canNext = monthStart(viewMonth) < monthStart(rangeEnd);

  const startDate = formatYmd(rangeStart);
  const endDate   = formatYmd(rangeEnd);

  const { data, isLoading } = useCalendarView({ startDate, endDate, branchId });
  const items = data?.items ?? [];

  // 선택 일자의 카드들을 지점별 그룹
  const selectedGroups = useMemo(() => {
    if (!selectedDateKey) return [];
    const sameDay = items.filter((c) => toKstDateKey(c.plannedWorkDate) === selectedDateKey);
    const byBranch = new Map<string, { name: string; items: CalendarCard[] }>();
    for (const c of sameDay) {
      const entry = byBranch.get(c.branch.id) ?? { name: c.branch.name, items: [] };
      entry.items.push(c);
      byBranch.set(c.branch.id, entry);
    }
    return Array.from(byBranch.entries())
      .map(([branchId, v]) => ({ branchId, branchName: v.name, items: v.items }))
      .sort((a, b) => {
        const aMine = myBranchIds.has(a.branchId) ? 0 : 1;
        const bMine = myBranchIds.has(b.branchId) ? 0 : 1;
        if (aMine !== bMine) return aMine - bMine;
        return a.branchName.localeCompare(b.branchName);
      });
  }, [items, selectedDateKey, myBranchIds]);

  const selectedLabel = useMemo(() => {
    if (!selectedDateKey) return null;
    const [y, m, d] = selectedDateKey.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
  }, [selectedDateKey]);

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <CalendarMonthGrid
          monthStart={viewMonth}
          items={items}
          selectedDateKey={selectedDateKey}
          onSelectDate={setSelectedDateKey}
          onPrevMonth={() => setViewMonth((m) => addMonths(m, -1))}
          onNextMonth={() => setViewMonth((m) => addMonths(m, 1))}
          canPrev={canPrev}
          canNext={canNext}
          myBranchIds={myBranchIds}
        />
      )}

      {/* 하단 상세 패널 */}
      {selectedDateKey && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-base font-bold text-gray-900">
              📅 {selectedLabel}
            </h3>
            <span className="text-xs text-gray-500">
              {selectedGroups.reduce((n, g) => n + g.items.length, 0)}건
            </span>
          </div>

          {selectedGroups.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">해당 일자에 예정된 작업이 없습니다.</p>
          ) : (
            <div className="space-y-4">
              {selectedGroups.map((g) => (
                <div key={g.branchId} className="space-y-1.5">
                  <div
                    className={[
                      'text-xs font-semibold pb-1 border-b',
                      myBranchIds.has(g.branchId)
                        ? 'text-blue-700 border-blue-200'
                        : 'text-gray-500 border-gray-100',
                    ].join(' ')}
                  >
                    {g.branchName} · {g.items.length}건
                  </div>
                  <div className="space-y-1.5">
                    {g.items.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => router.push(`/requests/${c.id}`)}
                        className="w-full text-left bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded p-2 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">
                              {c.roomNumber && <span className="mr-1">{c.roomNumber}</span>}
                              {c.location?.name ?? c.title}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                              <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                                {REQUEST_CATEGORY_LABEL[c.category]}
                              </span>
                              <span className="text-xs text-gray-500 truncate">{c.title}</span>
                              <StatusBadge status={c.status} />
                            </div>
                          </div>
                          <PriorityBadge priority={c.priority} isEmergency={c.isEmergency} />
                        </div>
                        {c.assignedTo && (
                          <div className="text-[11px] text-gray-400 mt-1">담당: {c.assignedTo.name}</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function toKstDateKey(iso: string): string {
  const kst = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}
