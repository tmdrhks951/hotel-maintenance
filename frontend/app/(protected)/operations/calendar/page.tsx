'use client';

/// [PATCH] STEP 3: 운영팀 작업 달력 — 당일 기준 ±1개월 범위, 지점별 배지 집계.
///   • OPERATIONS/VENDOR: 본인 지점만 자동 필터 (백엔드 스코프)
///   • QC/ADMIN: 전체 + BranchFilter로 수동 좁히기 가능

import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import BranchFilter from '@/components/ui/BranchFilter';
import PageTabs from '@/components/ui/PageTabs';
import CalendarViewPanel from '@/components/ui/CalendarViewPanel';

export default function OperationsCalendarPage() {
  const user = useAuthStore((s) => s.user);
  const [branchId, setBranchId] = useState<string | null>(null);

  /// OPERATIONS/VENDOR는 서버에서 본인 지점만 내려주므로 드롭다운 의미 없음.
  const showBranchFilter = user?.role === 'QC' || user?.role === 'ADMIN';

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">운영팀 대시보드</h1>
        {showBranchFilter && <BranchFilter value={branchId} onChange={setBranchId} />}
      </div>

      <PageTabs
        tabs={[
          { label: '📋 작업 대시보드', href: '/operations/dashboard' },
          { label: '🗓️ 작업 달력',    href: '/operations/calendar' },
        ]}
      />

      <CalendarViewPanel branchId={showBranchFilter ? branchId : null} />
    </div>
  );
}
