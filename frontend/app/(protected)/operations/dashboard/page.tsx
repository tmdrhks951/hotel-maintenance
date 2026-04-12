'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOperationsDashboard } from '@/hooks/useQcQueue';
import BranchFilter from '@/components/ui/BranchFilter';
import StatusBadge from '@/components/ui/StatusBadge';
import PriorityBadge from '@/components/ui/PriorityBadge';
import { REQUEST_CATEGORY_LABEL } from '@/types';
import type { OperationsCard } from '@/types';

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

// ================================================================
// 대시보드 카드
// ================================================================

function DashboardCard({ card }: { card: OperationsCard }) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/requests/${card.id}`)}
      className="bg-white border border-gray-200 rounded-lg p-3.5 cursor-pointer hover:shadow-sm hover:border-gray-300 transition-all space-y-2"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-gray-900 line-clamp-2 flex-1">{card.title}</h4>
        <PriorityBadge priority={card.priority} isEmergency={card.isEmergency} />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500">{card.branch.name}</span>
        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
          {REQUEST_CATEGORY_LABEL[card.category]}
        </span>
        <StatusBadge status={card.status} />
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{card.assignedTo ? card.assignedTo.name : '미배정'}</span>
        <span>{formatDate(card.plannedWorkDate)}</span>
      </div>
    </div>
  );
}

// ================================================================
// 섹션 컬럼
// ================================================================

interface SectionProps {
  title: string;
  count: number;
  headerColor: string;
  badgeColor: string;
  children: React.ReactNode;
}

function Section({ title, count, headerColor, badgeColor, children }: SectionProps) {
  return (
    <div className="flex flex-col min-h-0">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-1 h-4 rounded-full ${headerColor}`} />
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeColor}`}>
          {count}
        </span>
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

export default function OperationsDashboardPage() {
  const [branchId, setBranchId] = useState<string | null>(null);
  const { data, isLoading } = useOperationsDashboard(branchId ?? undefined);

  const sections = [
    {
      key: 'requested',
      title: '요청됨',
      items: data?.requested ?? [],
      headerColor: 'bg-blue-500',
      badgeColor: 'bg-blue-100 text-blue-700',
    },
    {
      key: 'scheduled',
      title: '예정',
      items: data?.scheduled ?? [],
      headerColor: 'bg-indigo-500',
      badgeColor: 'bg-indigo-100 text-indigo-700',
    },
    {
      key: 'today',
      title: '오늘 작업',
      items: data?.today ?? [],
      headerColor: 'bg-purple-500',
      badgeColor: 'bg-purple-100 text-purple-700',
    },
    {
      key: 'completed',
      title: '완료',
      items: data?.completed ?? [],
      headerColor: 'bg-green-500',
      badgeColor: 'bg-green-100 text-green-700',
    },
  ] as const;

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">운영팀 대시보드</h1>
        <BranchFilter value={branchId} onChange={setBranchId} />
      </div>

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
                count={s.items.length}
                headerColor={s.headerColor}
                badgeColor={s.badgeColor}
              >
                {s.items.map((c) => (
                  <DashboardCard key={c.id} card={c} />
                ))}
              </Section>
            ))}
          </div>

          {/* 데스크탑: 4열 그리드 */}
          <div className="hidden lg:grid lg:grid-cols-4 gap-5">
            {sections.map((s) => (
              <Section
                key={s.key}
                title={s.title}
                count={s.items.length}
                headerColor={s.headerColor}
                badgeColor={s.badgeColor}
              >
                {s.items.map((c) => (
                  <DashboardCard key={c.id} card={c} />
                ))}
              </Section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
