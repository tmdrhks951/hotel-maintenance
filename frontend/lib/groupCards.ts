// ================================================================
// 작업 카드 공통 그룹핑 — 날짜 → 지점 (display-only)
//
// QC / 운영팀 6개 화면에서 작업 카드 목록을
// 1순위: 날짜, 2순위: 지점 으로 그룹핑하기 위한 헬퍼.
// 데이터 구조/응답/상태 머신은 건드리지 않는 순수 클라이언트 로직.
// ================================================================

export interface HasBranch {
  branch: { id: string; name: string };
}

export interface DateBranchGroup<T> {
  dateKey: string;
  dateLabel: string;
  branches: Array<{
    branchId: string;
    branchName: string;
    items: T[];
  }>;
}

/**
 * 날짜(YYYY-MM-DD) → 지점(branchId) 2단 그룹핑.
 * - 날짜 desc 정렬 (최신 먼저)
 * - 지점은 한글 가나다순, 단 mineBranchIds 지정 시 본인 지점 최상단
 * - getDate가 null/undefined 반환 시 '_nodate' 그룹으로 말미 배치
 */
export function groupByDateThenBranch<T extends HasBranch>(
  items: T[],
  getDate: (item: T) => string | null | undefined,
  opts?: { mineBranchIds?: Set<string> },
): DateBranchGroup<T>[] {
  const mine = opts?.mineBranchIds;
  const dateMap = new Map<string, Map<string, T[]>>();

  for (const item of items) {
    const raw = getDate(item);
    const dateKey = raw ? String(raw).slice(0, 10) : '_nodate';
    if (!dateMap.has(dateKey)) dateMap.set(dateKey, new Map());
    const branchMap = dateMap.get(dateKey)!;
    const bid = item.branch.id;
    if (!branchMap.has(bid)) branchMap.set(bid, []);
    branchMap.get(bid)!.push(item);
  }

  const dateKeys = [...dateMap.keys()].sort((a, b) => {
    if (a === '_nodate') return 1;
    if (b === '_nodate') return -1;
    return b.localeCompare(a);
  });

  return dateKeys.map((dateKey) => {
    const branchMap = dateMap.get(dateKey)!;
    const bids = [...branchMap.keys()].sort((a, b) => {
      const aMine = mine?.has(a) ? 0 : 1;
      const bMine = mine?.has(b) ? 0 : 1;
      if (aMine !== bMine) return aMine - bMine;
      const aName = branchMap.get(a)![0].branch.name;
      const bName = branchMap.get(b)![0].branch.name;
      return aName.localeCompare(bName, 'ko');
    });
    return {
      dateKey,
      dateLabel: dateKey === '_nodate' ? '날짜 미정' : formatGroupDate(dateKey),
      branches: bids.map((branchId) => ({
        branchId,
        branchName: branchMap.get(branchId)![0].branch.name,
        items: branchMap.get(branchId)!,
      })),
    };
  });
}

/** YYYY-MM-DD → "4/15 (수)" 형식 */
export function formatGroupDate(key: string): string {
  const d = new Date(`${key}T00:00:00`);
  if (Number.isNaN(d.getTime())) return key;
  return d.toLocaleDateString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  });
}
