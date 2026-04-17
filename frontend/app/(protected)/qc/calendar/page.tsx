'use client';

/// [PATCH] STEP 3: QC 작업 달력 — 당일 기준 ±1개월 범위, 지점별 배지 집계.
///   • QC/ADMIN: 전체 + BranchFilter로 수동 좁히기 가능
///   • (OPERATIONS는 접근 권한 없음 — 라우터/메뉴에서 차단)

import { useState } from 'react';
import BranchFilter from '@/components/ui/BranchFilter';
import PageTabs from '@/components/ui/PageTabs';
import CalendarViewPanel from '@/components/ui/CalendarViewPanel';

export default function QcCalendarPage() {
  const [branchId, setBranchId] = useState<string | null>(null);

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

      <CalendarViewPanel branchId={branchId} />
    </div>
  );
}
