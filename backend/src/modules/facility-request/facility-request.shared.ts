import { AppError } from '@/common/errors/AppError';

// ================================================================
// 카테고리 한국어 레이블
// ================================================================

export const CATEGORY_LABEL: Record<string, string> = {
  SILICONE: '실리콘/방수',
  WALLPAPER: '벽지/시트지',
  PAINTING: '도장/페인트',
  FURNITURE: '가구/비품',
  LIGHTING: '조명',
  PLUMBING: '배관/수도',
  DOOR: '도어/창호',
  APPLIANCE: 'TV/가전',
  HVAC: '냉난방/환기',
  ELECTRICAL: '전기/콘센트',
  SAFETY: '안전/소방',
  OTHER: '기타',
};

// ================================================================
// 상태 전이 규칙
// ================================================================

export const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['REVIEW_REQUIRED', 'RECEIVED', 'CANCELLED'],
  REQUESTED: ['REVIEW_REQUIRED', 'RECEIVED', 'CANCELLED'],
  REVIEW_REQUIRED: ['RECEIVED', 'CANCELLED', 'REQUESTED'],
  RECEIVED: ['SCHEDULED', 'IN_PROGRESS', 'CANCELLED', 'REQUESTED'],
  SCHEDULED: ['IN_PROGRESS', 'RECEIVED', 'CANCELLED'],
  IN_PROGRESS: ['DONE_BY_QC', 'CANCELLED'],
  DONE_BY_QC: ['QC_VERIFIED', 'REOPENED'],
  QC_VERIFIED: ['OPERATIONS_CONFIRMED', 'REOPENED'],
  OPERATIONS_CONFIRMED: ['CLOSED', 'REOPENED'],
  CLOSED: ['REOPENED'],
  REOPENED: ['REVIEW_REQUIRED', 'RECEIVED'],
  CANCELLED: [],
  COMPLETED: ['CLOSED'],
};

export function assertValidTransition(from: string, to: string): void {
  const allowed = VALID_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new AppError(
      `${from} 상태에서 ${to}(으)로 전이할 수 없습니다`,
      400,
      true,
      'INVALID_TRANSITION',
    );
  }
}

// ================================================================
// 권한 유틸
// ================================================================

/** 운영팀 등록 요청 시 Branch 접근 제어 (STEP 5) */
export function assertBranchAccess(
  role: string,
  position: string,
  userBranchIds: string[],
  targetBranchId: string,
): void {
  if (role === 'ADMIN') return;
  if (position === 'TEAM_LEADER' || position === 'DEPUTY_LEADER') return;
  if (!userBranchIds.includes(targetBranchId)) {
    throw new AppError('해당 지점에 접근 권한이 없습니다', 403, true, 'FORBIDDEN');
  }
}

/** QC/ADMIN 전용 액션 접근 제어 (STEP 6) */
export function assertQcAccess(role: string): void {
  if (role !== 'QC' && role !== 'ADMIN') {
    throw new AppError('QC 또는 ADMIN만 접근 가능합니다', 403, true, 'FORBIDDEN');
  }
}

/** OPERATIONS/ADMIN 전용 액션 접근 제어 (STEP 8) */
export function assertOperationsAccess(role: string): void {
  if (role !== 'OPERATIONS' && role !== 'ADMIN') {
    throw new AppError('운영팀 또는 ADMIN만 접근 가능합니다', 403, true, 'FORBIDDEN');
  }
}

/**
 * QC/운영의 지점 접근 제어 — ADMIN은 모든 지점 허용.
 * 빈 branchIds = 전 지점 담당 (팀장/부팀장 등 지점 미배정 관리급).
 * 목록 조회(query.service)의 지점 필터 규칙과 동일한 컨벤션 — 보이면 처리도 가능해야 한다.
 */
export function assertQcBranchAccess(
  role: string,
  userBranchIds: string[],
  requestBranchId: string,
): void {
  if (role === 'ADMIN') return;
  if (userBranchIds.length === 0) return;
  if (!userBranchIds.includes(requestBranchId)) {
    throw new AppError('해당 지점 요청에 접근 권한이 없습니다', 403, true, 'FORBIDDEN');
  }
}

// ================================================================
// 수정/삭제 권한 — ADMIN 또는 QC/OPERATIONS 팀장급
// ================================================================

export function assertEditPermission(role: string, position: string): void {
  if (role === 'ADMIN') return;
  if (role === 'OPERATIONS') return;
  if (role === 'QC' &&
      (position === 'TEAM_LEADER' || position === 'DEPUTY_LEADER')) return;
  throw new AppError('수정/삭제 권한이 없습니다', 403, true, 'FORBIDDEN');
}

/** 팀장급 권한 확인 — TEAM_LEADER 또는 DEPUTY_LEADER */
export function assertLeaderRole(role: string, position: string): void {
  if (role === 'ADMIN') return;
  if ((role === 'OPERATIONS' || role === 'QC') &&
      (position === 'TEAM_LEADER' || position === 'DEPUTY_LEADER')) return;
  throw new AppError(
    '팀장급만 보고 체크가 가능합니다',
    403,
    true,
    'LEADER_ONLY',
  );
}

// ================================================================
// 상세 select 재사용 (QC 뷰 기준)
// ================================================================

export const REQUEST_DETAIL_SELECT = {
  id: true,
  title: true,
  description: true,
  status: true,
  category: true,
  isEmergency: true,
  emergencyReason: true,
  emergencySetAt: true,
  priority: true,
  plannedWorkDate: true,
  scheduleChangeCount: true,
  branchId: true,
  locationId: true,
  roomNumber: true,
  estimatedDuration: true,
  maintenanceRequired: true,
  createdById: true,
  assignedToId: true,
  completedAt: true,
  completedById: true,
  qcVerifiedById: true,
  qcVerifiedAt: true,
  operationsConfirmedByUserId: true,
  operationsConfirmedAt: true,
  opsReported: true,
  opsReportedAt: true,
  opsReportedById: true,
  qcReported: true,
  qcReportedAt: true,
  qcReportedById: true,
  reopenCount: true,
  createdAt: true,
  updatedAt: true,
  branch: { select: { id: true, name: true, code: true } },
  location: { select: { id: true, name: true, code: true, type: true } },
  createdBy: { select: { id: true, name: true, role: true } },
  assignedTo: { select: { id: true, name: true, role: true } },
  emergencySetBy: { select: { id: true, name: true } },
  completedBy: { select: { id: true, name: true } },
  qcVerifiedBy: { select: { id: true, name: true } },
  operationsConfirmedBy: { select: { id: true, name: true } },
  opsReportedBy: { select: { id: true, name: true } },
  qcReportedBy: { select: { id: true, name: true } },
  media: {
    select: { id: true, url: true, filename: true, phase: true, type: true },
    orderBy: { createdAt: 'asc' as const },
  },
  statusLogs: {
    select: {
      id: true,
      fromStatus: true,
      toStatus: true,
      reason: true,
      createdAt: true,
      changedBy: { select: { id: true, name: true, role: true } },
    },
    orderBy: { createdAt: 'asc' as const },
  },
} as const;
