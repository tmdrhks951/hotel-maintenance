'use client';

import PageTabs from '@/components/ui/PageTabs';

/// [PATCH] STEP 1: \ub2ec\ub825 \ud398\uc774\uc9c0 stub.
///   STEP 3 \uc5d0\uc11c \uc2e4\uc81c \ub2ec\ub825 \ucef4\ud3ec\ub10c\ud2b8\ub85c \ub300\uccb4 \uc608\uc815.
export default function OperationsCalendarPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">운영팀 대시보드</h1>
      </div>

      <PageTabs
        tabs={[
          { label: '📋 작업 대시보드', href: '/operations/dashboard' },
          { label: '🗓️ 작업 달력',    href: '/operations/calendar' },
        ]}
      />

      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-24 text-center">
        <p className="text-sm text-gray-500">작업 달력 준비 중입니다.</p>
        <p className="mt-2 text-xs text-gray-400">
          당일 기준 ±1개월 범위의 작업을 요일별로 볼 수 있게 할 예정입니다.
        </p>
      </div>
    </div>
  );
}
