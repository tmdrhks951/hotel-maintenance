'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQcQueue, useQcReview } from '@/hooks/useQcQueue';
import { useAuthStore } from '@/stores/authStore';
import BranchFilter from '@/components/ui/BranchFilter';
import StatusBadge from '@/components/ui/StatusBadge';
import PriorityBadge from '@/components/ui/PriorityBadge';
import PageTabs from '@/components/ui/PageTabs';
import { REQUEST_CATEGORY_LABEL } from '@/types';
import type { FacilityRequestCard } from '@/types';
import { groupByDateThenBranch } from '@/lib/groupCards';

// ================================================================
// 유틸
// ================================================================

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  return `${day}일 전`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
}

// ================================================================
// 카드 컴포넌트
// ================================================================

function RequestCard({
  card,
  isMine,
  onQuickAction,
}: {
  card: FacilityRequestCard;
  isMine: boolean;
  onQuickAction?: (action: string) => void;
}) {
  const router = useRouter();
  /// [PATCH] 답변이 달린 카드 하이라이트 (운영팀 대시보드와 동일한 glow)
  const hasAnswer = (card._count?.comments ?? 0) > 0;

  const containerCls = [
    isMine
      ? 'bg-blue-50/60 border border-blue-200 border-l-4 border-l-blue-500 rounded-lg p-3.5 cursor-pointer hover:shadow-sm hover:border-blue-300 transition-all space-y-1.5'
      : 'bg-white border border-gray-200 rounded-lg p-3.5 cursor-pointer hover:shadow-sm hover:border-gray-300 transition-all space-y-1.5',
    hasAnswer ? 'card-answer-glow' : '',
  ].join(' ');

  return (
    <div onClick={() => router.push(`/requests/${card.id}`)} className={containerCls}>
      {/* 1순위 메인: 지점 + 객실 + 우선순위 뱃지 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-base font-bold text-gray-900 truncate">
            {card.branch.name}
            {card.roomNumber && <span className="ml-1.5">{card.roomNumber}</span>}
          </div>
          {card.location && (
            <div className="text-sm text-gray-700 truncate mt-0.5">{card.location.name}</div>
          )}
        </div>
        <PriorityBadge priority={card.priority} isEmergency={card.isEmergency} />
      </div>

      {/* 2순위 보조: 카테고리 + 제목 + 상태 */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
          {REQUEST_CATEGORY_LABEL[card.category]}
        </span>
        <span className="text-xs text-gray-500 truncate flex-1 min-w-0">{card.title}</span>
        <StatusBadge status={card.status} />
      </div>

      {/* 3순위: 담당자 + 답변 수 + 일정 */}
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
          <span>
            {card.plannedWorkDate ? formatDate(card.plannedWorkDate) : timeAgo(card.createdAt)}
          </span>
        </div>
      </div>

      {/* 빠른 액션 — START_WORK만 (RECEIVE는 상세 페이지 폼 필수) */}
      {onQuickAction && (card.status === 'RECEIVED' || card.status === 'SCHEDULED') && (
        <div className="flex gap-2 pt-1 border-t border-gray-100">
          <button
            onClick={(e) => { e.stopPropagation(); onQuickAction('START_WORK'); }}
            className="flex-1 text-xs py-1.5 rounded bg-purple-50 text-purple-700 font-medium hover:bg-purple-100"
          >
            작업 시작
          </button>
        </div>
      )}
    </div>
  );
}

// ================================================================
// 섹션 내부 날짜 → 지점 그룹
// ================================================================

function SectionGroupedCards({
  items,
  myBranchIds,
  getDate,
  renderCard,
}: {
  items: FacilityRequestCard[];
  myBranchIds: Set<string>;
  getDate: (c: FacilityRequestCard) => string | null;
  renderCard: (c: FacilityRequestCard, isMine: boolean) => React.ReactNode;
}) {
  const groups = groupByDateThenBranch(items, getDate, { mineBranchIds: myBranchIds });
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
              {b.items.map((c) => renderCard(c, myBranchIds.has(c.branch.id)))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ================================================================
// 섹션 컬럼 (탭 지원) — 운영팀 대시보드와 동일 스타일
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
    /// [PATCH] 컬럼 박스 래퍼 — 탭 버튼 포함 시 인접 컬럼과 경계 혼동 방지
    <div className="flex flex-col min-h-0 rounded-lg border border-gray-200 bg-gray-50/60 p-3">
      <div className="flex items-center gap-2 mb-3 flex-wrap pb-2 border-b border-gray-200">
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
                  {t.label}{' '}
                  <span className={active ? 'text-gray-300' : 'text-gray-400'}>{t.count}</span>
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

type ReceivedTab = 'received' | 'review';

export default function QcQueuePage() {
  const [branchId, setBranchId] = useState<string | null>(null);
  const { data, isLoading } = useQcQueue(branchId ?? undefined);

  const user = useAuthStore((s) => s.user);
  const myBranchIds = useMemo(() => {
    if (!user) return new Set<string>();
    if (user.branchIds && user.branchIds.length > 0) return new Set(user.branchIds);
    if (user.branchId) return new Set([user.branchId]);
    return new Set<string>();
  }, [user]);

  /// 수령완료 ↔ 판단 필요 토글 (운영팀 예정↔보류와 동일 스타일)
  const [receivedTab, setReceivedTab] = useState<ReceivedTab>('received');

  const newRequests = data?.newRequests ?? [];
  const received = data?.received ?? [];
  const review = data?.review ?? [];
  const todayWork = data?.todayWork ?? [];
  const completed = data?.completed ?? [];

  const receivedTabs: TabOption<ReceivedTab>[] = [
    { key: 'received', label: '수령 완료', count: received.length },
    { key: 'review',   label: '판단 필요', count: review.length },
  ];

  // 빠른 액션 래퍼 — START_WORK 뮤테이션 (카드별 useQcReview 훅 캡처)
  function QuickActionCard({ card, isMine }: { card: FacilityRequestCard; isMine: boolean }) {
    const reviewMutation = useQcReview(card.id);
    const handleAction = (action: string) => {
      if (action === 'START_WORK') {
        reviewMutation.mutate({ action: 'START_WORK' });
      }
    };
    return <RequestCard card={card} isMine={isMine} onQuickAction={handleAction} />;
  }

  function ReadOnlyCard({ card, isMine }: { card: FacilityRequestCard; isMine: boolean }) {
    return <RequestCard card={card} isMine={isMine} />;
  }

  const sections = [
    {
      key: 'newRequests',
      title: '신규 요청',
      count: newRequests.length,
      items: newRequests,
      getDate: (c: FacilityRequestCard) => c.plannedWorkDate ?? c.createdAt,
      headerColor: 'bg-red-500',
      badgeColor: 'bg-red-100 text-red-700',
      tabs: undefined as TabOption<string>[] | undefined,
      activeTab: undefined as string | undefined,
      onTabChange: undefined as ((k: string) => void) | undefined,
      render: (c: FacilityRequestCard, isMine: boolean) => (
        <QuickActionCard key={c.id} card={c} isMine={isMine} />
      ),
    },
    {
      key: 'received',
      title: receivedTab === 'received' ? '수령 완료' : '판단 필요',
      count: receivedTab === 'received' ? received.length : review.length,
      items: receivedTab === 'received' ? received : review,
      getDate: (c: FacilityRequestCard) => c.plannedWorkDate ?? c.updatedAt,
      headerColor: 'bg-indigo-500',
      badgeColor: 'bg-indigo-100 text-indigo-700',
      tabs: receivedTabs as TabOption<string>[],
      activeTab: receivedTab as string,
      onTabChange: ((k: string) => setReceivedTab(k as ReceivedTab)) as ((k: string) => void),
      render: (c: FacilityRequestCard, isMine: boolean) => (
        <QuickActionCard key={c.id} card={c} isMine={isMine} />
      ),
    },
    {
      key: 'todayWork',
      title: '오늘 작업',
      count: todayWork.length,
      items: todayWork,
      getDate: (c: FacilityRequestCard) => c.plannedWorkDate ?? c.updatedAt,
      headerColor: 'bg-purple-500',
      badgeColor: 'bg-purple-100 text-purple-700',
      tabs: undefined,
      activeTab: undefined,
      onTabChange: undefined,
      render: (c: FacilityRequestCard, isMine: boolean) => (
        <QuickActionCard key={c.id} card={c} isMine={isMine} />
      ),
    },
    {
      key: 'completed',
      title: '작업 완료',
      count: completed.length,
      items: completed,
      getDate: (c: FacilityRequestCard) => c.plannedWorkDate ?? c.updatedAt,
      headerColor: 'bg-green-500',
      badgeColor: 'bg-green-100 text-green-700',
      tabs: undefined,
      activeTab: undefined,
      onTabChange: undefined,
      render: (c: FacilityRequestCard, isMine: boolean) => (
        <ReadOnlyCard key={c.id} card={c} isMine={isMine} />
      ),
    },
  ] as const;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">QC 대기열</h1>
        <BranchFilter value={branchId} onChange={setBranchId} />
      </div>

      <PageTabs
        tabs={[
          { label: '📋 대기열',     href: '/qc/queue' },
          { label: '🗓️ 작업 달력', href: '/qc/calendar' },
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
                <SectionGroupedCards
                  items={s.items}
                  myBranchIds={myBranchIds}
                  getDate={s.getDate}
                  renderCard={s.render}
                />
              </Section>
            ))}
          </div>

          {/* 데스크탑: 4열 그리드 */}
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
                <SectionGroupedCards
                  items={s.items}
                  myBranchIds={myBranchIds}
                  getDate={s.getDate}
                  renderCard={s.render}
                />
              </Section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
