'use client';

import { useState, useEffect, useMemo } from 'react';
import { useWorkHistory } from '@/hooks/useQcQueue';
import type { WorkHistoryItem } from '@/types';
import { REQUEST_CATEGORY_LABEL, REQUEST_STATUS_LABEL } from '@/types';

// ================================================================
// 유틸
// ================================================================

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getCompletionDate(item: WorkHistoryItem): string | null {
  const raw = item.completedAt ?? item.operationsConfirmedAt;
  return raw ? toDateStr(new Date(raw)) : null;
}

// ================================================================
// 달력 그리드
// ================================================================

function CalendarGrid({
  year, month, activeDates, selectedDate, onDateSelect, onMonthChange,
}: {
  year: number;
  month: number; // 0-indexed
  activeDates: Set<string>;
  selectedDate: string | null;
  onDateSelect: (d: string) => void;
  onMonthChange: (y: number, m: number) => void;
}) {
  const firstDow   = new Date(year, month, 1).getDay();
  const lastDay    = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: lastDay }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () =>
    month === 0 ? onMonthChange(year - 1, 11) : onMonthChange(year, month - 1);
  const nextMonth = () =>
    month === 11 ? onMonthChange(year + 1, 0) : onMonthChange(year, month + 1);

  return (
    <div>
      {/* 월 네비게이션 */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="text-gray-500 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100"
        >
          ◀
        </button>
        <span className="text-sm font-semibold text-gray-800">
          {year}년 {month + 1}월
        </span>
        <button
          onClick={nextMonth}
          className="text-gray-500 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100"
        >
          ▶
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-1">
        {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
          <div
            key={d}
            className={`text-center text-[11px] font-medium py-1 ${
              i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isActive   = activeDates.has(dateStr);
          const isSelected = selectedDate === dateStr;
          const isToday    = dateStr === toDateStr(new Date());
          const col        = i % 7;
          const textColor  =
            col === 0 ? 'text-red-500' : col === 6 ? 'text-blue-500' : 'text-gray-700';

          return (
            <button
              key={i}
              onClick={() => isActive && onDateSelect(dateStr)}
              disabled={!isActive}
              className={`mx-auto w-8 h-8 flex items-center justify-center text-xs rounded-full transition-colors
                ${
                  isSelected
                    ? 'bg-blue-600 text-white font-bold'
                    : isActive
                    ? `bg-blue-50 ${textColor} hover:bg-blue-100 font-semibold ring-1 ring-blue-200`
                    : isToday
                    ? `ring-1 ring-gray-300 ${textColor}`
                    : `${textColor} opacity-30 cursor-default`
                }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ================================================================
// 이력 결과 카드
// ================================================================

export function WorkHistoryCard({ item }: { item: WorkHistoryItem }) {
  const completionDateStr = item.completedAt ?? item.operationsConfirmedAt;
  return (
    <div className="p-3 rounded-lg border border-gray-100 bg-white hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {item.isEmergency && (
            <span className="text-red-500 text-xs flex-shrink-0">🚨</span>
          )}
          <p className="text-sm font-medium text-gray-900 line-clamp-1">{item.title}</p>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 whitespace-nowrap flex-shrink-0">
          {REQUEST_STATUS_LABEL[item.status]}
        </span>
      </div>

      <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500 flex-wrap">
        <span>{REQUEST_CATEGORY_LABEL[item.category]}</span>
        {item.location && <span>· {item.location.name}</span>}
        <span className="text-gray-400">· {item.branch.name}</span>
      </div>

      <div className="mt-1 flex items-center gap-3 text-xs flex-wrap">
        {item.assignedTo && (
          <span className="text-gray-500">담당: {item.assignedTo.name}</span>
        )}
        {item.completedBy && (
          <span className="text-green-600">완료: {item.completedBy.name}</span>
        )}
        {item.operationsConfirmedBy && (
          <span className="text-blue-600">확인: {item.operationsConfirmedBy.name}</span>
        )}
        {completionDateStr && (
          <span className="text-gray-400 ml-auto">
            {new Date(completionDateStr).toLocaleString('ko-KR', {
              month: 'numeric',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        )}
      </div>
    </div>
  );
}

// ================================================================
// 작업 이력 모달 (달력 + 키워드 검색)
// ================================================================

export function WorkHistoryModal({
  onClose,
  branchId,
}: {
  onClose: () => void;
  branchId?: string | null;
}) {
  const today = new Date();
  const [viewYear,     setViewYear]     = useState(today.getFullYear());
  const [viewMonth,    setViewMonth]    = useState(today.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string | null>(toDateStr(today));
  const [keyword,      setKeyword]      = useState('');
  const [queryKeyword, setQueryKeyword] = useState('');

  // 키워드 디바운스 400ms
  useEffect(() => {
    const t = setTimeout(() => setQueryKeyword(keyword), 400);
    return () => clearTimeout(t);
  }, [keyword]);

  // 월 전체 데이터 (달력 하이라이트용)
  const monthStart  = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`;
  const monthLastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
  const monthEnd    = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(monthLastDay).padStart(2, '0')}`;

  const { data: monthData } = useWorkHistory({
    startDate: monthStart,
    endDate:   monthEnd,
    branchId:  branchId ?? undefined,
  });

  // 활성 날짜 Set
  const activeDates = useMemo(() => {
    const s = new Set<string>();
    (monthData ?? []).forEach((item) => {
      const d = getCompletionDate(item);
      if (d) s.add(d);
    });
    return s;
  }, [monthData]);

  // 검색 결과
  const hasSearch = !!(selectedDate || queryKeyword);
  const { data: searchData, isLoading: searchLoading } = useWorkHistory(
    {
      date:     selectedDate ?? undefined,
      keyword:  queryKeyword || undefined,
      branchId: branchId ?? undefined,
    },
    { enabled: hasSearch },
  );

  function handleDateSelect(d: string) {
    setSelectedDate(d);
    setKeyword('');
    setQueryKeyword('');
  }

  function handleMonthChange(y: number, m: number) {
    setViewYear(y);
    setViewMonth(m);
    setSelectedDate(null);
  }

  const resultLabel = selectedDate
    ? `${new Date(selectedDate).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} 작업 목록`
    : queryKeyword
    ? `"${queryKeyword}" 검색 결과`
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 flex-shrink-0">
          <h3 className="text-sm font-semibold text-gray-900">📅 작업 이력</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* 키워드 검색 */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              🔍
            </span>
            <input
              type="text"
              placeholder="작업명, 설명으로 검색..."
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                if (e.target.value) setSelectedDate(null);
              }}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
            />
          </div>

          {/* 달력 (키워드 입력 중엔 숨김) */}
          {!queryKeyword && (
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <CalendarGrid
                year={viewYear}
                month={viewMonth}
                activeDates={activeDates}
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                onMonthChange={handleMonthChange}
              />
            </div>
          )}

          {/* 결과 목록 */}
          {hasSearch && (
            <div>
              {resultLabel && (
                <p className="text-xs font-semibold text-gray-500 mb-2">{resultLabel}</p>
              )}
              {searchLoading && (
                <p className="text-xs text-gray-400 text-center py-6">불러오는 중...</p>
              )}
              {!searchLoading && searchData && searchData.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-6">해당 작업이 없습니다</p>
              )}
              {!searchLoading && searchData && searchData.length > 0 && (
                <div className="space-y-2">
                  {searchData.map((item) => (
                    <WorkHistoryCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
