'use client';

import { useState, useMemo } from 'react';
import type { FacilityRequest, FacilityRequestStatus } from '@/types';
import { REQUEST_CATEGORY_LABEL } from '@/types';

// ================================================================
// 지점 → 위치 → 요청 목록을 계층적으로 그룹핑하는 아코디언 컴포넌트
// ================================================================

interface BranchGroupedItem extends FacilityRequest {
  isEmergency?: boolean;
  priority?: string;
  plannedWorkDate?: string | null;
  assignedTo?: { id: string; name: string } | null;
  completedAt?: string | null;
  qcVerifiedAt?: string | null;
  status: FacilityRequestStatus;
}

interface BranchGroupedListProps<T extends BranchGroupedItem> {
  items: T[];
  onSelect: (id: string) => void;
  selectedId: string | null;
  renderExtra?: (item: T) => React.ReactNode;
  emptyText?: string;
}

// 위치 없는 항목의 키
const NO_LOCATION = '__no_location__';

export function BranchGroupedList<T extends BranchGroupedItem>({
  items,
  onSelect,
  selectedId,
  renderExtra,
  emptyText = '없음',
}: BranchGroupedListProps<T>) {
  // 펼쳐진 지점/위치 상태 관리
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set());
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());

  // 지점별 → 위치별 그룹핑
  const grouped = useMemo(() => {
    const branchMap = new Map<
      string,
      {
        branch: { id: string; name: string; code: string };
        locations: Map<string, { location: { id: string; name: string } | null; items: T[] }>;
        totalCount: number;
        emergencyCount: number;
      }
    >();

    for (const item of items) {
      const bKey = item.branch.id;
      if (!branchMap.has(bKey)) {
        branchMap.set(bKey, {
          branch: item.branch,
          locations: new Map(),
          totalCount: 0,
          emergencyCount: 0,
        });
      }
      const group = branchMap.get(bKey)!;
      group.totalCount++;
      if (item.isEmergency) group.emergencyCount++;

      const lKey = item.location?.id ?? NO_LOCATION;
      if (!group.locations.has(lKey)) {
        group.locations.set(lKey, {
          location: item.location ?? null,
          items: [],
        });
      }
      group.locations.get(lKey)!.items.push(item);
    }

    // 지점명 가나다순 정렬
    return Array.from(branchMap.entries()).sort((a, b) =>
      a[1].branch.name.localeCompare(b[1].branch.name, 'ko'),
    );
  }, [items]);

  if (items.length === 0) {
    return <p className="text-xs text-gray-400 text-center py-6">{emptyText}</p>;
  }

  // 첫 로드 시 전부 접혀있으면 불편하므로, 아이템 있는 첫번째 지점은 자동 펼침
  // → 사용자가 명시적으로 토글하면 그 상태 유지
  function isBranchExpanded(branchId: string): boolean {
    return expandedBranches.has(branchId);
  }

  function toggleBranch(branchId: string) {
    setExpandedBranches((prev) => {
      const next = new Set(prev);
      if (next.has(branchId)) {
        next.delete(branchId);
      } else {
        next.add(branchId);
      }
      return next;
    });
  }

  function isLocationExpanded(key: string): boolean {
    return expandedLocations.has(key);
  }

  function toggleLocation(key: string) {
    setExpandedLocations((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <div className="space-y-1.5">
      {grouped.map(([branchId, group]) => {
        const branchOpen = isBranchExpanded(branchId);
        const locations = Array.from(group.locations.entries());

        return (
          <div key={branchId} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* 지점 헤더 */}
            <button
              onClick={() => toggleBranch(branchId)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors ${
                branchOpen ? 'bg-gray-100' : 'bg-white hover:bg-gray-50'
              }`}
            >
              <span className={`text-xs transition-transform ${branchOpen ? 'rotate-90' : ''}`}>
                ▶
              </span>
              <span className="text-sm font-semibold text-gray-800">{group.branch.name}</span>
              <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 ml-auto">
                {group.totalCount}건
              </span>
              {group.emergencyCount > 0 && (
                <span className="text-xs bg-red-100 text-red-600 rounded-full px-2 py-0.5">
                  🚨 {group.emergencyCount}
                </span>
              )}
            </button>

            {/* 위치 목록 (지점 펼침 시) */}
            {branchOpen && (
              <div className="border-t border-gray-100">
                {locations.map(([locKey, locGroup]) => {
                  const locFullKey = `${branchId}__${locKey}`;
                  const locOpen = isLocationExpanded(locFullKey);
                  const locName = locGroup.location?.name ?? '위치 미지정';

                  return (
                    <div key={locKey} className="border-b border-gray-50 last:border-b-0">
                      {/* 위치 헤더 */}
                      <button
                        onClick={() => toggleLocation(locFullKey)}
                        className={`w-full flex items-center gap-2 px-5 py-2 text-left transition-colors ${
                          locOpen ? 'bg-blue-50/50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <span className={`text-[10px] text-gray-400 transition-transform ${locOpen ? 'rotate-90' : ''}`}>
                          ▶
                        </span>
                        <span className="text-xs font-medium text-gray-700">{locName}</span>
                        <span className="text-[10px] text-gray-400 ml-auto">
                          {locGroup.items.length}건
                        </span>
                      </button>

                      {/* 요청 목록 (위치 펼침 시) */}
                      {locOpen && (
                        <div className="px-4 pb-2 space-y-1">
                          {locGroup.items.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => onSelect(item.id)}
                              className={`w-full text-left px-3 py-2 rounded-md border transition-colors text-xs ${
                                selectedId === item.id
                                  ? 'border-blue-500 bg-blue-50'
                                  : item.isEmergency
                                    ? 'border-red-200 bg-red-50 hover:border-red-300'
                                    : 'border-gray-100 bg-white hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-1 flex-1 min-w-0">
                                  {item.isEmergency && <span className="text-red-500 flex-shrink-0">🚨</span>}
                                  <span className="font-medium text-gray-900 line-clamp-1">{item.description || item.title}</span>
                                </div>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 flex-shrink-0 whitespace-nowrap">
                                  {REQUEST_CATEGORY_LABEL[item.category]}
                                </span>
                              </div>
                              {/* 부가 정보 */}
                              <div className="mt-1 flex items-center gap-2 text-gray-400 flex-wrap">
                                {item.assignedTo && (
                                  <span>담당: {item.assignedTo.name}</span>
                                )}
                                {item.plannedWorkDate && (
                                  <span className="text-blue-500">
                                    예정: {new Date(item.plannedWorkDate).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                                  </span>
                                )}
                                <span className="ml-auto text-gray-300">
                                  {new Date(item.createdAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                                </span>
                              </div>
                              {renderExtra?.(item)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
