'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOperationsDashboard, useUpdateSchedule } from '@/hooks/useQcQueue';
import { useAuthStore } from '@/stores/authStore';
import BranchFilter from '@/components/ui/BranchFilter';
import StatusBadge from '@/components/ui/StatusBadge';
import PriorityBadge from '@/components/ui/PriorityBadge';
import Modal from '@/components/ui/Modal';
import PageTabs from '@/components/ui/PageTabs';
import { REQUEST_CATEGORY_LABEL } from '@/types';
import type { OperationsCard } from '@/types';
import { groupByDateThenBranch } from '@/lib/groupCards';

// ================================================================
// 유틸
// ================================================================

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
  });
}

/// [PATCH] 수령 완료 이후 상태 — 카드 체크박스 자동 체크 기준
///   PENDING/REQUESTED/REVIEW_REQUIRED: 미체크
///   그 외 모든 상태(RECEIVED~): 체크됨
const STATUS_AFTER_RECEIVED = new Set<string>([
  'RECEIVED',
  'SCHEDULED',
  'IN_PROGRESS',
  'DONE_BY_QC',
  'QC_VERIFIED',
  'OPERATIONS_CONFIRMED',
  'CLOSED',
  'REOPENED',
  'COMPLETED',
]);

function isReceivedOrLater(status: string): boolean {
  return STATUS_AFTER_RECEIVED.has(status);
}

/// [PATCH] 답변 읽음 상태 — localStorage 기반 (기존 glow 로직 유지)
const READ_STORAGE_KEY = 'op_dash_answer_read_v1';

function getReadMap(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(READ_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function markAnswerRead(requestId: string) {
  if (typeof window === 'undefined') return;
  try {
    const map = getReadMap();
    map[requestId] = new Date().toISOString();
    window.localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

// ================================================================
// 일정 수정 모달 (지연된 작업 전용)
// ================================================================

function ScheduleEditModal({
  card,
  open,
  onClose,
}: {
  card: OperationsCard;
  open: boolean;
  onClose: () => void;
}) {
  const mutation = useUpdateSchedule(card.id);
  const initialDate = card.plannedWorkDate ? card.plannedWorkDate.slice(0, 10) : '';
  const [date, setDate] = useState<string>(initialDate);
  const [reason, setReason] = useState<string>('');

  useEffect(() => {
    if (open) {
      setDate(card.plannedWorkDate ? card.plannedWorkDate.slice(0, 10) : '');
      setReason('');
    }
  }, [open, card.plannedWorkDate]);

  const submit = () => {
    if (!date) return;
    /// KST 09:00 기준 ISO로 변환 (시간 무관 일자 비교 의도)
    const iso = new Date(`${date}T09:00:00+09:00`).toISOString();
    mutation.mutate(
      { plannedWorkDate: iso, reason: reason.trim() || undefined },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="일정 수정">
      <div className="space-y-4">
        <div className="text-sm text-gray-500">
          <div className="font-semibold text-gray-900">{card.branch.name} {card.roomNumber ?? ''}</div>
          <div>{card.title}</div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">작업 예정일</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">변경 사유 (선택)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm resize-none"
            placeholder="예: 자재 수급 지연으로 일정 재조정"
          />
        </div>

        {mutation.isError && (
          <p className="text-xs text-red-600">
            저장 실패: {(mutation.error as Error)?.message ?? '알 수 없는 오류'}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
            disabled={mutation.isPending}
          >
            취소
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!date || mutation.isPending}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {mutation.isPending ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ================================================================
// 대시보드 카드
// ================================================================

function DashboardCard({
  card,
  isMine,
  canEditSchedule = false,
}: {
  card: OperationsCard;
  isMine: boolean;
  /// [PATCH] 지연된 작업 카드에만 일정 수정 UI 노출 (QC/ADMIN 역할 + overdue 탭)
  canEditSchedule?: boolean;
}) {
  const router = useRouter();
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  /// 답변 읽음 추적
  const [readAt, setReadAt] = useState<string | null>(null);
  useEffect(() => {
    setReadAt(getReadMap()[card.id] ?? null);
  }, [card.id]);

  const hasAnswer = (card._count?.comments ?? 0) > 0;
  const latestCommentAt = card.comments?.[0]?.createdAt ?? null;
  const hasUnreadAnswer =
    hasAnswer && !!latestCommentAt && (!readAt || readAt < latestCommentAt);

  /// [PATCH] 수령 완료 이후 상태면 체크박스 자동 체크
  const checked = isReceivedOrLater(card.status);

  const containerCls = [
    isMine
      ? 'bg-blue-50/60 border border-blue-200 border-l-4 border-l-blue-500 rounded-lg p-3.5 cursor-pointer hover:shadow-sm hover:border-blue-300 transition-all space-y-1.5'
      : 'bg-white border border-gray-200 rounded-lg p-3.5 cursor-pointer hover:shadow-sm hover:border-gray-300 transition-all space-y-1.5',
    hasUnreadAnswer ? 'card-answer-glow' : '',
  ].join(' ');

  const handleClick = () => {
    if (hasUnreadAnswer) {
      markAnswerRead(card.id);
      setReadAt(new Date().toISOString());
    }
    router.push(`/requests/${card.id}`);
  };

  return (
    <>
      <div onClick={handleClick} className={containerCls}>
        {/* 1순위: 체크박스 + 지점/객실 + 우선순위 */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {/* [PATCH] 상태 기반 자동 체크박스 (읽기 전용) */}
            <input
              type="checkbox"
              checked={checked}
              readOnly
              aria-label={checked ? '수령 완료됨' : '수령 전'}
              onClick={(e) => e.stopPropagation()}
              className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 cursor-default"
            />
            <div className="flex-1 min-w-0">
              <div className="text-base font-bold text-gray-900 truncate">
                {card.branch.name}
                {card.roomNumber && <span className="ml-1.5">{card.roomNumber}</span>}
              </div>
              {card.location && (
                <div className="text-sm text-gray-700 truncate mt-0.5">{card.location.name}</div>
              )}
            </div>
          </div>
          <PriorityBadge priority={card.priority} isEmergency={card.isEmergency} />
        </div>

        {/* 2순위: 카테고리 + 제목 + 상태 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
            {REQUEST_CATEGORY_LABEL[card.category]}
          </span>
          <span className="text-xs text-gray-500 truncate flex-1 min-w-0">{card.title}</span>
          <StatusBadge status={card.status} />
        </div>

        {/* 3순위: 담당자 + 답변 + 예정일 */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{card.assignedTo ? card.assignedTo.name : '미배정'}</span>
          <div className="flex items-center gap-2">
            {(card._count?.comments ?? 0) > 0 && (
              <span className="flex items-center gap-0.5 text-gray-500">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {card._count!.comments}
              </span>
            )}
            <span>{formatDate(card.plannedWorkDate)}</span>
          </div>
        </div>

        {/* [PATCH] 지연된 작업 — QC/ADMIN만 일정 수정 버튼 노출 */}
        {canEditSchedule && (
          <div className="pt-1.5 border-t border-gray-100">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setScheduleModalOpen(true);
              }}
              className="w-full text-xs text-blue-600 hover:text-blue-700 font-medium py-1"
            >
              일정 수정
            </button>
          </div>
        )}
      </div>

      {canEditSchedule && (
        <ScheduleEditModal
          card={card}
          open={scheduleModalOpen}
          onClose={() => setScheduleModalOpen(false)}
        />
      )}
    </>
  );
}

// ================================================================
// 섹션 내부 날짜 → 지점 그룹
// ================================================================

function SectionGroupedCards({
  items,
  myBranchIds,
  canEditSchedule = false,
}: {
  items: OperationsCard[];
  myBranchIds: Set<string>;
  canEditSchedule?: boolean;
}) {
  const groups = groupByDateThenBranch(
    items,
    (c) => c.plannedWorkDate ?? c.createdAt,
    { mineBranchIds: myBranchIds },
  );
  if (groups.length === 0) {
    return <p className="text-xs text-gray-400 text-center py-8">데이터가 없습니다</p>;
  }
  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <div key={g.dateKey} className="space-y-1.5">
          <div className="text-xs font-semibold text-gray-500 border-b border-gray-100 pb-1">
            {g.dateLabel}
          </div>
          {g.branches.map((b) => (
            <div key={b.branchId} className="space-y-2">
              <div
                className={`text-[11px] font-medium pl-1 ${
                  myBranchIds.has(b.branchId) ? 'text-blue-600' : 'text-gray-400'
                }`}
              >
                {b.branchName}
              </div>
              {b.items.map((c) => (
                <DashboardCard
                  key={c.id}
                  card={c}
                  isMine={myBranchIds.has(c.branch.id)}
                  canEditSchedule={canEditSchedule}
                />
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ================================================================
// [PATCH] 작업예정 — 지점별 가장 가까운 작업일 섹션 (Q6 B안)
//   • 각 지점별로 plannedWorkDate가 가장 빠른 "하루"의 작업들만 모아서 섹션 생성
//   • 팀원(branchIds 1개)이면 섹션 하나, 팀장/ADMIN(여러 지점)이면 지점마다 섹션 병렬 표시
//   • myBranchIds 비어있는 경우(예: 일부 ADMIN) 전체 지점을 그대로 노출
// ================================================================

function SectionByBranchNextDate({
  items,
  myBranchIds,
}: {
  items: OperationsCard[];
  myBranchIds: Set<string>;
}) {
  // 1. 지점별 그룹화 (plannedWorkDate 있는 것만)
  const byBranch = new Map<string, { branchName: string; arr: OperationsCard[] }>();
  for (const c of items) {
    if (!c.plannedWorkDate) continue;
    if (myBranchIds.size > 0 && !myBranchIds.has(c.branch.id)) continue;
    const entry = byBranch.get(c.branch.id) ?? { branchName: c.branch.name, arr: [] };
    entry.arr.push(c);
    byBranch.set(c.branch.id, entry);
  }

  // 2. 각 지점의 가장 빠른 plannedWorkDate 하루치 작업들만 추출
  const sections = Array.from(byBranch.entries())
    .map(([branchId, { branchName, arr }]) => {
      const sorted = [...arr].sort((a, b) =>
        (a.plannedWorkDate ?? '').localeCompare(b.plannedWorkDate ?? ''),
      );
      const earliestDateKey = sorted[0].plannedWorkDate!.slice(0, 10);
      const sameDayItems = sorted.filter(
        (c) => c.plannedWorkDate!.slice(0, 10) === earliestDateKey,
      );
      return { branchId, branchName, dateKey: earliestDateKey, items: sameDayItems };
    })
    .sort((a, b) => {
      // 본인 지점 먼저, 그 다음 지점명 정렬
      const aMine = myBranchIds.has(a.branchId) ? 0 : 1;
      const bMine = myBranchIds.has(b.branchId) ? 0 : 1;
      if (aMine !== bMine) return aMine - bMine;
      return a.branchName.localeCompare(b.branchName);
    });

  if (sections.length === 0) {
    return <p className="text-xs text-gray-400 text-center py-8">예정 작업이 없습니다</p>;
  }

  return (
    <div className="space-y-4">
      {sections.map((s) => {
        const dateLabel = new Date(s.dateKey + 'T00:00:00+09:00').toLocaleDateString('ko-KR', {
          month: 'long',
          day: 'numeric',
          weekday: 'short',
        });
        const isMine = myBranchIds.has(s.branchId);
        return (
          <div key={s.branchId} className="space-y-2">
            <div className="flex items-baseline gap-2 pb-1.5 border-b border-orange-200">
              <span className={`text-sm font-bold ${isMine ? 'text-blue-700' : 'text-gray-600'}`}>
                {s.branchName}
              </span>
              {/* 작업 날짜 강조 — 사용자 요구: "작업날짜가 눈에 띄게" */}
              <span className="text-sm font-extrabold text-orange-600 tracking-wide">
                📅 {dateLabel}
              </span>
              <span className="text-[11px] text-gray-400 ml-auto">{s.items.length}건</span>
            </div>
            {s.items.map((c) => (
              <DashboardCard key={c.id} card={c} isMine={isMine} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ================================================================
// 섹션 컬럼 (탭 지원)
// ================================================================

interface TabOption<K extends string> {
  key: K;
  label: string;
  count: number;
}

interface SectionProps<K extends string> {
  title: string;
  count: number;
  headerColor: string;
  badgeColor: string;
  /// [PATCH] 선택: 탭 옵션. 전달 시 제목 우측에 토글 그룹 렌더링.
  tabs?: TabOption<K>[];
  activeTab?: K;
  onTabChange?: (key: K) => void;
  children: React.ReactNode;
}

function Section<K extends string>({
  title,
  count,
  headerColor,
  badgeColor,
  tabs,
  activeTab,
  onTabChange,
  children,
}: SectionProps<K>) {
  return (
    <div className="flex flex-col min-h-0">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className={`w-1 h-4 rounded-full ${headerColor}`} />
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeColor}`}>
          {count}
        </span>
        {tabs && tabs.length > 0 && (
          <div className="flex gap-1 ml-auto">
            {tabs.map((t) => {
              const active = t.key === activeTab;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => onTabChange?.(t.key)}
                  className={[
                    'text-[11px] px-2 py-0.5 rounded-full border transition-colors',
                    active
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
                  ].join(' ')}
                >
                  {t.label} <span className={active ? 'text-gray-300' : 'text-gray-400'}>{t.count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
        {count === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8">데이터가 없습니다</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

// ================================================================
// 메인 페이지
// ================================================================

type ScheduleTab = 'scheduled' | 'hold';
type TodayTab = 'today' | 'overdue';

export default function OperationsDashboardPage() {
  const [branchId, setBranchId] = useState<string | null>(null);
  const { data, isLoading } = useOperationsDashboard(branchId ?? undefined);

  const user = useAuthStore((s) => s.user);
  const myBranchIds = useMemo(() => {
    if (!user) return new Set<string>();
    if (user.branchIds && user.branchIds.length > 0) return new Set(user.branchIds);
    if (user.branchId) return new Set([user.branchId]);
    return new Set<string>();
  }, [user]);

  /// [PATCH] 지연된 작업 일정 수정 권한 — QC 또는 ADMIN만 (OPERATIONS/VENDOR 제외)
  const canEditSchedule = user?.role === 'QC' || user?.role === 'ADMIN';

  /// 탭 상태
  const [scheduleTab, setScheduleTab] = useState<ScheduleTab>('scheduled');
  const [todayTab, setTodayTab] = useState<TodayTab>('today');

  const newRequests = data?.newRequests ?? [];
  const scheduled = data?.scheduled ?? [];
  const today = data?.today ?? [];
  const overdue = data?.overdue ?? [];
  const completed = data?.completed ?? [];
  /// [PATCH] 보류 탭은 이번 단계에서 내용 구현 없음 — 추후 재정의 예정
  const hold: OperationsCard[] = [];

  const scheduleTabs: TabOption<ScheduleTab>[] = [
    { key: 'scheduled', label: '예정',  count: scheduled.length },
    { key: 'hold',      label: '보류',  count: hold.length },
  ];
  const todayTabs: TabOption<TodayTab>[] = [
    { key: 'today',   label: '오늘 작업',  count: today.length },
    { key: 'overdue', label: '지연된 작업', count: overdue.length },
  ];

  const sections = [
    {
      key: 'newRequests',
      title: '신규 요청',
      count: newRequests.length,
      items: newRequests,
      headerColor: 'bg-red-500',
      badgeColor: 'bg-red-100 text-red-700',
      tabs: undefined as TabOption<string>[] | undefined,
      activeTab: undefined,
      onTabChange: undefined,
      canEditSchedule: false,
      renderer: 'default' as 'default' | 'byBranch',
    },
    {
      key: 'scheduled',
      title: '작업 예정',
      count: scheduleTab === 'scheduled' ? scheduled.length : hold.length,
      items: scheduleTab === 'scheduled' ? scheduled : hold,
      headerColor: 'bg-indigo-500',
      badgeColor: 'bg-indigo-100 text-indigo-700',
      tabs: scheduleTabs as TabOption<string>[],
      activeTab: scheduleTab as string,
      onTabChange: ((k: string) => setScheduleTab(k as ScheduleTab)) as ((k: string) => void) | undefined,
      canEditSchedule: false,
      /// [PATCH] Q6 B안 — '예정' 탭은 지점별 다음 작업일 렌더러 사용
      renderer: (scheduleTab === 'scheduled' ? 'byBranch' : 'default') as 'default' | 'byBranch',
    },
    {
      key: 'today',
      title: '오늘 작업',
      count: todayTab === 'today' ? today.length : overdue.length,
      items: todayTab === 'today' ? today : overdue,
      headerColor: 'bg-purple-500',
      badgeColor: 'bg-purple-100 text-purple-700',
      tabs: todayTabs as TabOption<string>[],
      activeTab: todayTab as string,
      onTabChange: ((k: string) => setTodayTab(k as TodayTab)) as ((k: string) => void) | undefined,
      /// 지연된 작업 탭에서만 일정 수정 가능
      canEditSchedule: todayTab === 'overdue' && canEditSchedule,
      renderer: 'default' as 'default' | 'byBranch',
    },
    {
      key: 'completed',
      title: '완료',
      count: completed.length,
      items: completed,
      headerColor: 'bg-green-500',
      badgeColor: 'bg-green-100 text-green-700',
      tabs: undefined,
      activeTab: undefined,
      onTabChange: undefined,
      canEditSchedule: false,
      renderer: 'default' as 'default' | 'byBranch',
    },
  ] as const;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">운영팀 대시보드</h1>
        <BranchFilter value={branchId} onChange={setBranchId} />
      </div>

      <PageTabs
        tabs={[
          { label: '📋 작업 대시보드', href: '/operations/dashboard' },
          { label: '🗓️ 작업 달력',    href: '/operations/calendar' },
        ]}
      />

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <>
          {/* 모바일: 세로 나열 */}
          <div className="lg:hidden space-y-6">
            {sections.map((s) => (
              <Section
                key={s.key}
                title={s.title}
                count={s.count}
                headerColor={s.headerColor}
                badgeColor={s.badgeColor}
                tabs={s.tabs}
                activeTab={s.activeTab}
                onTabChange={s.onTabChange}
              >
                {s.renderer === 'byBranch' ? (
                  <SectionByBranchNextDate items={s.items} myBranchIds={myBranchIds} />
                ) : (
                  <SectionGroupedCards
                    items={s.items}
                    myBranchIds={myBranchIds}
                    canEditSchedule={s.canEditSchedule}
                  />
                )}
              </Section>
            ))}
          </div>

          {/* 데스크탑: 4열 그리드 (신규 / 작업예정 / 오늘작업 / 완료) */}
          <div className="hidden lg:grid lg:grid-cols-4 gap-5">
            {sections.map((s) => (
              <Section
                key={s.key}
                title={s.title}
                count={s.count}
                headerColor={s.headerColor}
                badgeColor={s.badgeColor}
                tabs={s.tabs}
                activeTab={s.activeTab}
                onTabChange={s.onTabChange}
              >
                {s.renderer === 'byBranch' ? (
                  <SectionByBranchNextDate items={s.items} myBranchIds={myBranchIds} />
                ) : (
                  <SectionGroupedCards
                    items={s.items}
                    myBranchIds={myBranchIds}
                    canEditSchedule={s.canEditSchedule}
                  />
                )}
              </Section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
