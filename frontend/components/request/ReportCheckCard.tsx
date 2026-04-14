'use client';

import { useAuthStore } from '@/stores/authStore';
import { useToggleOpsReport, useToggleQcReport } from '@/hooks/useQcQueue';
import type { FacilityRequestDetail } from '@/types';

// ================================================================
// 날짜 포맷 유틸
// ================================================================

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${d.getFullYear()}.${m}.${day} ${h}:${min}`;
}

// ================================================================
// Props
// ================================================================

interface Props {
  request: FacilityRequestDetail;
  onRefresh: () => void;
}

// ================================================================
// STEP 12: 팀장급 보고 체크 카드
// - 운영팀 팀장(OPERATIONS_1/2/3 TEAM_LEADER/DEPUTY_LEADER): opsReported 체크 가능
// - QC 팀장(QC_1/3 TEAM_LEADER/DEPUTY_LEADER): qcReported 체크 가능
// - ADMIN: 둘 다 체크 가능
// - MEMBER/기타: 체크박스는 읽기 전용으로 상태만 표시
// ================================================================

export default function ReportCheckCard({ request, onRefresh }: Props) {
  const user = useAuthStore((s) => s.user);

  const toggleOps = useToggleOpsReport(request.id);
  const toggleQc = useToggleQcReport(request.id);

  const role = user?.role;
  const position = user?.position;

  const isLeader = position === 'TEAM_LEADER' || position === 'DEPUTY_LEADER';
  const isAdmin = role === 'ADMIN';

  const canEditOps = isAdmin || (role === 'OPERATIONS' && isLeader);
  const canEditQc = isAdmin || (role === 'QC' && isLeader);

  // 누구든 로그인한 사용자는 체크박스 상태는 볼 수 있음
  // 단, 편집 권한이 없으면 카드를 숨김 (표시가 너무 번잡해지는 것 방지)
  if (!canEditOps && !canEditQc) return null;

  function handleToggleOps(next: boolean) {
    if (!canEditOps || toggleOps.isPending) return;
    toggleOps.mutate(
      { reported: next },
      { onSuccess: () => onRefresh() },
    );
  }

  function handleToggleQc(next: boolean) {
    if (!canEditQc || toggleQc.isPending) return;
    toggleQc.mutate(
      { reported: next },
      { onSuccess: () => onRefresh() },
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900">팀장 보고 체크</h3>
        <span className="text-xs text-gray-400">팀장급만 체크 가능</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* 운영팀 보고 체크 */}
        <ReportRow
          label="운영팀 보고"
          checked={request.opsReported ?? false}
          reportedAt={request.opsReportedAt ?? null}
          reportedBy={request.opsReportedBy ?? null}
          canEdit={canEditOps}
          pending={toggleOps.isPending}
          onToggle={handleToggleOps}
        />

        {/* QC팀 보고 체크 */}
        <ReportRow
          label="QC팀 보고"
          checked={request.qcReported ?? false}
          reportedAt={request.qcReportedAt ?? null}
          reportedBy={request.qcReportedBy ?? null}
          canEdit={canEditQc}
          pending={toggleQc.isPending}
          onToggle={handleToggleQc}
        />
      </div>
    </div>
  );
}

// ================================================================
// Report row 내부 컴포넌트
// ================================================================

interface ReportRowProps {
  label: string;
  checked: boolean;
  reportedAt: string | null;
  reportedBy: { id: string; name: string } | null;
  canEdit: boolean;
  pending: boolean;
  onToggle: (next: boolean) => void;
}

function ReportRow({
  label,
  checked,
  reportedAt,
  reportedBy,
  canEdit,
  pending,
  onToggle,
}: ReportRowProps) {
  return (
    <label
      className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
        checked
          ? 'bg-green-50 border-green-200'
          : 'bg-gray-50 border-gray-200'
      } ${canEdit && !pending ? 'cursor-pointer hover:border-gray-300' : 'cursor-default'}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={!canEdit || pending}
        onChange={(e) => onToggle(e.target.checked)}
        className="mt-0.5 w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-2 focus:ring-green-200 disabled:opacity-60"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">{label}</span>
          {checked ? (
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
              보고 완료
            </span>
          ) : (
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">
              미보고
            </span>
          )}
        </div>
        {checked && reportedAt && (
          <div className="mt-1 text-xs text-gray-500">
            {fmtDate(reportedAt)}
            {reportedBy && (
              <span className="ml-1 text-gray-400">({reportedBy.name})</span>
            )}
          </div>
        )}
      </div>
    </label>
  );
}
