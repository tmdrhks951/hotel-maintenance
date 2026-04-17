'use client';

import PageTabs from '@/components/ui/PageTabs';

/// [PATCH] STEP 2: QC 달력 페이지 stub.
///   STEP 3 에서 실제 달력 컴포넌트로 대체 예정.
export default function QcCalendarPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">QC 대기열</h1>
      </div>

      <PageTabs
        tabs={[
          { label: '📋 대기열',     href: '/qc/queue' },
          { label: '🗓️ 작업 달력', href: '/qc/calendar' },
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
