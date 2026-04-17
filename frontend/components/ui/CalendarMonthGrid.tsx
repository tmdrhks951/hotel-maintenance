'use client';

/// [PATCH] STEP 3: 커스텀 Tailwind 달력 — 월 단위 7열 그리드.
///   • 외부 라이브러리 없이 구성.
///   • 한 달치 셀을 보여주고, 상단 prev/next 버튼으로 월 이동.
///   • 각 날짜 셀에는 "지점별 배지"가 렌더링되며 (같은 지점 N건 → "덕수궁 3").
///   • 날짜 셀을 클릭하면 onSelectDate(dateKey)로 상위에 전달 → 하단 패널로 상세 노출.

import { useMemo } from 'react';
import type { CalendarCard } from '@/types';

export interface CalendarMonthGridProps {
  monthStart: Date;                 // 해당 월 1일 00:00 KST
  items: CalendarCard[];            // 달력 범위 내 전체 카드 (달력이 자체적으로 월에 맞춰 필터)
  selectedDateKey: string | null;
  onSelectDate: (dateKey: string | null) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  canPrev: boolean;
  canNext: boolean;
  myBranchIds: Set<string>;         // 본인 지점 배지 강조용
}

/// KST 기준 YYYY-MM-DD 추출
function toKstDateKey(iso: string): string {
  const kst = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function formatMonthTitle(d: Date): string {
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });
}

const DAY_OF_WEEK = ['일', '월', '화', '수', '목', '금', '토'];

export default function CalendarMonthGrid({
  monthStart,
  items,
  selectedDateKey,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  canPrev,
  canNext,
  myBranchIds,
}: CalendarMonthGridProps) {
  // 1) 월의 첫날 ~ 마지막날 계산 (로컬 기준 — monthStart가 KST 1일 00:00 이라 로컬은 UTC-9 오프셋이 있을 수 있으나, getFullYear/Month/Date는 로컬 기준이라 서버리스 환경에서 이상해질 수 있음)
  //    간단화를 위해 monthStart는 "해당 월 1일" 로컬 Date 로 받는 전제(상위에서 KST 달 기준으로 new Date(year, month, 1) 방식 유지).
  const year  = monthStart.getFullYear();
  const month = monthStart.getMonth(); // 0-based

  // 2) 첫 주 시작(일요일) 오프셋 계산
  const firstDay = new Date(year, month, 1);
  const leadingBlanks = firstDay.getDay(); // 0=일
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 3) 일자별 → 지점별 집계
  const perDateBranch = useMemo(() => {
    const map = new Map<string, Map<string, { name: string; count: number }>>();
    for (const c of items) {
      const key = toKstDateKey(c.plannedWorkDate);
      const branches = map.get(key) ?? new Map();
      const entry = branches.get(c.branch.id) ?? { name: c.branch.name, count: 0 };
      entry.count += 1;
      branches.set(c.branch.id, entry);
      map.set(key, branches);
    }
    return map;
  }, [items]);

  // 4) 오늘 key (KST)
  const todayKey = useMemo(() => {
    const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
    return kstNow.toISOString().slice(0, 10);
  }, []);

  // 5) 그리드 생성 — leading blanks + 실제 날짜들 (6주 x 7 = 42칸까지 빈칸 채움)
  const cells: Array<
    | { kind: 'blank'; key: string }
    | { kind: 'day'; key: string; dateKey: string; day: number; dow: number }
  > = [];
  for (let i = 0; i < leadingBlanks; i++) {
    cells.push({ kind: 'blank', key: `b${i}` });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ kind: 'day', key: dateKey, dateKey, day: d, dow: dateObj.getDay() });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ kind: 'blank', key: `t${cells.length}` });
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* 헤더 — 월 이동 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <button
          type="button"
          onClick={onPrevMonth}
          disabled={!canPrev}
          className="px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="이전 달"
        >
          ‹ 이전
        </button>
        <h2 className="text-base font-semibold text-gray-900">{formatMonthTitle(firstDay)}</h2>
        <button
          type="button"
          onClick={onNextMonth}
          disabled={!canNext}
          className="px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="다음 달"
        >
          다음 ›
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
        {DAY_OF_WEEK.map((d, i) => (
          <div
            key={d}
            className={`py-2 text-center text-xs font-semibold ${
              i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-600'
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* 날짜 셀 */}
      <div className="grid grid-cols-7">
        {cells.map((cell) => {
          if (cell.kind === 'blank') {
            return <div key={cell.key} className="min-h-[96px] border-r border-b border-gray-100 bg-gray-50/30" />;
          }
          const branches = perDateBranch.get(cell.dateKey);
          const isToday = cell.dateKey === todayKey;
          const isSelected = cell.dateKey === selectedDateKey;
          const hasItems = !!branches && branches.size > 0;

          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => onSelectDate(isSelected ? null : cell.dateKey)}
              className={[
                'min-h-[96px] border-r border-b border-gray-100 p-1.5 text-left transition-colors',
                isSelected
                  ? 'bg-blue-50 ring-2 ring-inset ring-blue-400'
                  : hasItems
                  ? 'hover:bg-blue-50/60'
                  : 'hover:bg-gray-50',
              ].join(' ')}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={[
                    'text-xs font-semibold',
                    cell.dow === 0 ? 'text-red-500' : cell.dow === 6 ? 'text-blue-500' : 'text-gray-700',
                    isToday ? 'bg-blue-600 text-white rounded-full w-5 h-5 inline-flex items-center justify-center' : '',
                  ].join(' ')}
                >
                  {cell.day}
                </span>
                {hasItems && (
                  <span className="text-[10px] text-gray-400">
                    {Array.from(branches!.values()).reduce((n, b) => n + b.count, 0)}건
                  </span>
                )}
              </div>
              {hasItems && (
                <div className="space-y-0.5">
                  {Array.from(branches!.entries()).slice(0, 3).map(([branchId, b]) => (
                    <div
                      key={branchId}
                      className={[
                        'text-[10px] px-1 py-0.5 rounded truncate',
                        myBranchIds.has(branchId)
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : 'bg-gray-100 text-gray-600',
                      ].join(' ')}
                    >
                      {b.name} {b.count}
                    </div>
                  ))}
                  {branches!.size > 3 && (
                    <div className="text-[10px] text-gray-400 pl-1">+{branches!.size - 3}개 지점</div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
