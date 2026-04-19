'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFacilityRequestDetail } from '@/hooks/useQcQueue';
import { useAuthStore } from '@/stores/authStore';
import StatusBadge from '@/components/ui/StatusBadge';
import PriorityBadge from '@/components/ui/PriorityBadge';
import PhotoGallery from '@/components/request/PhotoGallery';
import CommentSection from '@/components/request/CommentSection';
import ActionButtons from '@/components/request/ActionButtons';
import StatusTimeline from '@/components/request/StatusTimeline';
import ReportCheckCard from '@/components/request/ReportCheckCard';
import {
  REQUEST_CATEGORY_LABEL,
  LOCATION_TYPE_LABEL,
} from '@/types';

// ================================================================
// 날짜 포맷 유틸
// ================================================================

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}.${m}.${day} ${h}:${min}`;
}

function fmtDateShort(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

// ================================================================
// 역할별 홈 경로
// ================================================================

const HOME_BY_ROLE: Record<string, string> = {
  QC: '/qc',
  OPERATIONS: '/operations',
  ADMIN: '/admin/dashboard',
  VENDOR: '/vendor/assignments',
};

// ================================================================
// Info field component
// ================================================================

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start py-2 border-b border-gray-50 last:border-b-0">
      <span className="w-24 flex-shrink-0 text-xs font-medium text-gray-500">{label}</span>
      <span className="text-sm text-gray-900 flex-1">{value}</span>
    </div>
  );
}

// ================================================================
// Page
// ================================================================

export default function RequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const id = params.id as string;

  const { data: request, isLoading, isError, error, refetch } = useFacilityRequestDetail(id);

  // Determine back link
  const backHref = user?.role ? (HOME_BY_ROLE[user.role] ?? '/') : '/';

  // ================================================================
  // Loading
  // ================================================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  // ================================================================
  // Error / Not found
  // [FIX] 기존엔 403/404/기타 에러를 모두 "요청을 찾을 수 없습니다"로 표시 →
  //       타 지점 직원이 공유받은 링크를 열 때 "요청이 사라졌나?"로 오해 유발.
  //       이제 HTTP status 별로 분기하여 사용자가 원인을 정확히 이해할 수 있게 함.
  // ================================================================

  if (isError || !request) {
    const status =
      (error as { response?: { status?: number } } | null | undefined)?.response?.status;

    const { title, description } =
      status === 403
        ? {
            title: '접근 권한이 없습니다',
            description:
              '이 요청은 귀하의 담당 지점이 아니거나 접근 권한 밖에 있습니다. 담당자 또는 관리자에게 문의해주세요.',
          }
        : status === 404
        ? {
            title: '요청을 찾을 수 없습니다',
            description: '삭제되었거나 존재하지 않는 요청입니다.',
          }
        : {
            title: '요청을 불러오지 못했습니다',
            description: '네트워크 상태 또는 로그인 세션을 확인 후 다시 시도해주세요.',
          };

    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-sm px-6">
          <p className="text-base font-semibold text-gray-900 mb-1">{title}</p>
          <p className="text-sm text-gray-500 mb-5">{description}</p>
          <div className="flex items-center justify-center gap-3">
            {status !== 403 && status !== 404 && (
              <button
                type="button"
                onClick={() => refetch()}
                className="text-sm text-gray-600 hover:text-gray-800 font-medium"
              >
                다시 시도
              </button>
            )}
            <button
              type="button"
              onClick={() => router.back()}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              뒤로 가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ================================================================
  // Render
  // ================================================================

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Back button */}
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        목록으로
      </Link>

      {/* Header */}
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <StatusBadge status={request.status} />
          <PriorityBadge priority={request.priority} isEmergency={request.isEmergency} />
          {request.isEmergency && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-600">
              EMERGENCY
            </span>
          )}
        </div>
        <h1 className="text-xl font-bold text-gray-900">{request.title}</h1>
        {request.description && (
          <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">{request.description}</p>
        )}
      </div>

      {/* Action buttons */}
      <ActionButtons request={request} onRefresh={() => refetch()} />

      {/* STEP 12: 팀장급 보고 체크 카드 */}
      <ReportCheckCard request={request} onRefresh={() => refetch()} />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Photo gallery + Comments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Photo Gallery */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3">사진</h3>
            <PhotoGallery media={request.media} />
          </div>

          {/* Comments */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <CommentSection requestId={request.id} />
          </div>
        </div>

        {/* Right: Info sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3">요청 정보</h3>

            <div className="space-y-0">
              <InfoRow label="상태" value={<StatusBadge status={request.status} />} />
              <InfoRow
                label="카테고리"
                value={REQUEST_CATEGORY_LABEL[request.category] ?? request.category}
              />
              <InfoRow label="지점" value={request.branch?.name ?? '-'} />
              <InfoRow
                label="객실"
                value={request.roomNumber ?? <span className="text-gray-400">-</span>}
              />
              {request.location && request.location.name !== request.roomNumber && (
                <InfoRow
                  label="위치"
                  value={`${request.location.name}${request.location.type ? ` (${LOCATION_TYPE_LABEL[request.location.type]})` : ''}`}
                />
              )}
              <InfoRow label="우선순위" value={<PriorityBadge priority={request.priority} />} />

              {/* STEP 12: QC 수령 시 입력받은 정보 */}
              {request.estimatedDuration != null && (
                <InfoRow label="예상 소요" value={`${request.estimatedDuration}분`} />
              )}
              {request.maintenanceRequired != null && (
                <InfoRow
                  label="정비 필요"
                  value={
                    request.maintenanceRequired ? (
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
                        필요
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
                        불필요
                      </span>
                    )
                  }
                />
              )}

              {/* Emergency info */}
              {request.isEmergency && (
                <>
                  <InfoRow
                    label="긴급 여부"
                    value={
                      <span className="text-red-600 font-semibold text-xs">
                        긴급
                      </span>
                    }
                  />
                  {request.emergencyReason && (
                    <InfoRow label="긴급 사유" value={request.emergencyReason} />
                  )}
                </>
              )}

              <InfoRow label="등록자" value={request.createdBy?.name ?? '-'} />
              <InfoRow label="등록일" value={fmtDate(request.createdAt)} />
              <InfoRow
                label="담당자"
                value={request.assignedTo?.name ?? <span className="text-gray-400">미배정</span>}
              />
              <InfoRow label="예정일" value={fmtDateShort(request.plannedWorkDate)} />

              {/* Conditional timestamp fields */}
              {request.completedAt && (
                <InfoRow
                  label="작업완료일"
                  value={
                    <span>
                      {fmtDate(request.completedAt)}
                      {request.completedBy && (
                        <span className="text-gray-400 text-xs ml-1">
                          ({request.completedBy.name})
                        </span>
                      )}
                    </span>
                  }
                />
              )}
              {request.qcVerifiedAt && (
                <InfoRow
                  label="QC검증일"
                  value={
                    <span>
                      {fmtDate(request.qcVerifiedAt)}
                      {request.qcVerifiedBy && (
                        <span className="text-gray-400 text-xs ml-1">
                          ({request.qcVerifiedBy.name})
                        </span>
                      )}
                    </span>
                  }
                />
              )}
              {request.operationsConfirmedAt && (
                <InfoRow
                  label="운영확인일"
                  value={
                    <span>
                      {fmtDate(request.operationsConfirmedAt)}
                      {request.operationsConfirmedBy && (
                        <span className="text-gray-400 text-xs ml-1">
                          ({request.operationsConfirmedBy.name})
                        </span>
                      )}
                    </span>
                  }
                />
              )}

              {/* Reopen count */}
              {request.reopenCount > 0 && (
                <InfoRow
                  label="재오픈 횟수"
                  value={
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
                        {request.reopenCount}회
                      </span>
                    </span>
                  }
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Timeline (full width) */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-bold text-gray-900 mb-4">상태 변경 이력</h3>
        <StatusTimeline logs={request.statusLogs} />
      </div>
    </div>
  );
}
