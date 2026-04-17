import { FacilityRequestStatus } from '@prisma/client';
import { prisma } from '@/config/prisma';
import { AppError } from '@/common/errors/AppError';
import { fanOut, getQcUserIds, getNotificationRecipients } from '../notification/notification.service';
import type {
  CreateFacilityRequestDto,
  UpdateFacilityRequestDto,
  QcReviewDto,
  UpdateScheduleDto,
  AssignWorkerDto,
  CompleteWorkDto,
  QcVerifyDto,
  OperationsConfirmDto,
  ReopenFacilityRequestDto,
  ToggleReportDto,
} from './facility-request.dto';

// ================================================================
// 카테고리 한국어 레이블
// ================================================================

const CATEGORY_LABEL: Record<string, string> = {
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

const VALID_TRANSITIONS: Record<string, string[]> = {
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

function assertValidTransition(from: string, to: string): void {
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
function assertBranchAccess(
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
function assertQcAccess(role: string): void {
  if (role !== 'QC' && role !== 'ADMIN') {
    throw new AppError('QC 또는 ADMIN만 접근 가능합니다', 403, true, 'FORBIDDEN');
  }
}

/** OPERATIONS/ADMIN 전용 액션 접근 제어 (STEP 8) */
function assertOperationsAccess(role: string): void {
  if (role !== 'OPERATIONS' && role !== 'ADMIN') {
    throw new AppError('운영팀 또는 ADMIN만 접근 가능합니다', 403, true, 'FORBIDDEN');
  }
}

/** QC의 지점 접근 제어 — ADMIN은 모든 지점 허용 */
function assertQcBranchAccess(
  role: string,
  userBranchIds: string[],
  requestBranchId: string,
): void {
  if (role === 'ADMIN') return;
  if (!userBranchIds.includes(requestBranchId)) {
    throw new AppError('해당 지점 요청에 접근 권한이 없습니다', 403, true, 'FORBIDDEN');
  }
}

// ================================================================
// 상세 select 재사용 (QC 뷰 기준)
// ================================================================

const REQUEST_DETAIL_SELECT = {
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

// ================================================================
// STEP 5: checkDuplicates
// ================================================================

export async function checkDuplicates(branchId: string, locationId?: string) {
  const terminalStatuses: FacilityRequestStatus[] = ['CLOSED', 'CANCELLED', 'COMPLETED'];

  const activeRequests = await prisma.facilityRequest.findMany({
    where: {
      branchId,
      ...(locationId ? { locationId } : {}),
      status: { notIn: terminalStatuses },
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      status: true,
      category: true,
      createdAt: true,
      location: { select: { id: true, name: true, code: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  return {
    hasActiveRequest: activeRequests.length > 0,
    count: activeRequests.length,
    activeRequests,
  };
}

// ================================================================
// STEP 5: createFacilityRequest
// ================================================================

export async function createFacilityRequest(
  userId: string,
  userRole: string,
  userPosition: string,
  userBranchIds: string[],
  dto: CreateFacilityRequestDto,
  file?: Express.Multer.File,
) {
  assertBranchAccess(userRole, userPosition, userBranchIds, dto.branchId);

  // STEP 12: 필수 필드 검증 — 지점/객실/위치/작업내용
  if (!dto.locationId?.trim()) {
    throw new AppError('위치를 선택해주세요', 400, true, 'LOCATION_REQUIRED');
  }
  if (!dto.roomNumber?.trim()) {
    throw new AppError('객실 정보를 입력해주세요', 400, true, 'ROOM_REQUIRED');
  }

  const branch = await prisma.branch.findFirst({
    where: { id: dto.branchId, deletedAt: null, isActive: true },
  });
  if (!branch) {
    throw new AppError('지점을 찾을 수 없습니다', 404, true, 'BRANCH_NOT_FOUND');
  }

  const location = await prisma.location.findFirst({
    where: { id: dto.locationId, branchId: dto.branchId, deletedAt: null },
  });
  if (!location) {
    throw new AppError('해당 지점의 위치를 찾을 수 없습니다', 404, true, 'LOCATION_NOT_FOUND');
  }
  const roomNumber = dto.roomNumber.trim();

  const categoryLabel = CATEGORY_LABEL[dto.category] ?? dto.category;
  const title = `${categoryLabel} — ${roomNumber}`;

  const result = await prisma.$transaction(async (tx) => {
    const request = await tx.facilityRequest.create({
      data: {
        title,
        description: dto.description,
        category: dto.category,
        status: 'REQUESTED',
        branchId: dto.branchId,
        locationId: dto.locationId,
        roomNumber,
        createdById: userId,
      },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        status: true,
        branchId: true,
        locationId: true,
        roomNumber: true,
        branch: { select: { id: true, name: true, code: true } },
        location: { select: { id: true, name: true, code: true, type: true } },
        createdAt: true,
      },
    });

    // StatusLog: 최초 생성
    await tx.statusLog.create({
      data: {
        requestId: request.id,
        fromStatus: null,
        toStatus: 'REQUESTED',
        reason: '운영팀 요청 등록',
        changedById: userId,
      },
    });

    let media = null;
    if (file) {
      const isVideo = file.mimetype.startsWith('video/');
      media = await tx.media.create({
        data: {
          type: isVideo ? 'VIDEO' : 'IMAGE',
          phase: 'BEFORE',
          url: `/uploads/${file.filename}`,
          filename: file.originalname,
          size: file.size,
          requestId: request.id,
          uploadedById: userId,
        },
        select: { id: true, url: true, filename: true, phase: true },
      });
    }

    return { request, media };
  });

  // STEP 10: QC팀에게 신규 요청 알림 (fire-and-forget)
  getQcUserIds(dto.branchId)
    .then((qcIds) =>
      fanOut({
        type: 'FACILITY_REQUEST_CREATED',
        recipientIds: qcIds,
        requestId: result.request.id,
        title: `새 요청: ${result.request.title}`,
        bundleKey: `branch:${dto.branchId}:new_requests`,
      }),
    )
    .catch(() => {}); // 알림 실패는 메인 흐름에 영향 없음

  return {
    facilityRequest: result.request,
    media: result.media,
  };
}

// ================================================================
// STEP 6: getQcQueue — QC 작업 큐 조회
// ================================================================

export async function getQcQueue(
  role: string,
  userBranchIds: string[],
  filterBranchId?: string,
) {
  assertQcAccess(role);

  // 지점 필터: QC는 자신의 지점만, ADMIN은 파라미터 지점 or 전체
  const branchWhere = (role === 'QC' && userBranchIds.length > 0)
    ? { branchId: { in: userBranchIds } }
    : filterBranchId
    ? { branchId: filterBranchId }
    : {};

  const baseWhere = {
    deletedAt: null,
    ...branchWhere,
  };

  const cardSelect = {
    id: true,
    title: true,
    description: true,
    status: true,
    category: true,
    isEmergency: true,
    priority: true,
    plannedWorkDate: true,
    scheduleChangeCount: true,
    createdAt: true,
    updatedAt: true,
    /// STEP 12: 객실 번호
    roomNumber: true,
    /// STEP 12: 보고 체크
    opsReported: true,
    qcReported: true,
    branch: { select: { id: true, name: true, code: true } },
    location: { select: { id: true, name: true, code: true } },
    createdBy: { select: { id: true, name: true } },
    assignedTo: { select: { id: true, name: true } },
    /// [PATCH] 답변 하이라이트용 댓글 수
    _count: { select: { comments: { where: { deletedAt: null } } } },
  } as const;

  const [newRequests, reviewRequired, inProgress] = await Promise.all([
    // 신규 요청: PENDING(레거시) + REQUESTED + REOPENED
    prisma.facilityRequest.findMany({
      where: { ...baseWhere, status: { in: ['PENDING', 'REQUESTED', 'REOPENED'] } },
      select: cardSelect,
      orderBy: [{ isEmergency: 'desc' }, { createdAt: 'asc' }],
    }),
    // 판단 필요
    prisma.facilityRequest.findMany({
      where: { ...baseWhere, status: 'REVIEW_REQUIRED' },
      select: cardSelect,
      orderBy: [{ isEmergency: 'desc' }, { updatedAt: 'asc' }],
    }),
    // 진행중: 수령 이후 ~ IN_PROGRESS
    prisma.facilityRequest.findMany({
      where: { ...baseWhere, status: { in: ['RECEIVED', 'SCHEDULED', 'IN_PROGRESS'] } },
      select: cardSelect,
      orderBy: [{ isEmergency: 'desc' }, { plannedWorkDate: 'asc' }],
    }),
  ]);

  return { newRequests, reviewRequired, inProgress };
}

// ================================================================
// STEP 6: getFacilityRequestDetail — 요청 상세 조회
// ================================================================

export async function getFacilityRequestDetail(
  requestId: string,
  role: string,
  userBranchIds: string[],
) {
  // QC, OPERATIONS, ADMIN 모두 접근 가능
  if (role !== 'QC' && role !== 'OPERATIONS' && role !== 'ADMIN') {
    throw new AppError('접근 권한이 없습니다', 403, true, 'FORBIDDEN');
  }

  const request = await prisma.facilityRequest.findFirst({
    where: { id: requestId, deletedAt: null },
    select: REQUEST_DETAIL_SELECT,
  });

  if (!request) {
    throw new AppError('요청을 찾을 수 없습니다', 404, true, 'REQUEST_NOT_FOUND');
  }

  // ADMIN은 모든 지점 접근 허용
  assertQcBranchAccess(role, userBranchIds, request.branchId);

  return request;
}

// ================================================================
// STEP 6: qcReview — 긴급/우선순위/상태 전이
// ================================================================

export async function qcReview(
  requestId: string,
  userId: string,
  role: string,
  userBranchIds: string[],
  dto: QcReviewDto,
) {
  assertQcAccess(role);

  const request = await prisma.facilityRequest.findFirst({
    where: { id: requestId, deletedAt: null },
    select: {
      id: true,
      status: true,
      branchId: true,
      plannedWorkDate: true,
      isEmergency: true,
      assignedToId: true,
      createdById: true,
    },
  });

  if (!request) {
    throw new AppError('요청을 찾을 수 없습니다', 404, true, 'REQUEST_NOT_FOUND');
  }

  assertQcBranchAccess(role, userBranchIds, request.branchId);

  // 긴급 설정 시 사유 필수
  if (dto.isEmergency === true && !dto.emergencyReason?.trim()) {
    throw new AppError('긴급 사유를 입력해주세요', 400, true, 'EMERGENCY_REASON_REQUIRED');
  }

  // STEP 12: RECEIVE 액션 시 방문일시/예상시간/정비여부 필수
  let qcVisitDate: Date | null = null;
  if (dto.action === 'RECEIVE') {
    if (!dto.qcVisitScheduledAt) {
      throw new AppError('QC 방문 예정일시를 입력해주세요', 400, true, 'QC_VISIT_DATE_REQUIRED');
    }
    qcVisitDate = new Date(dto.qcVisitScheduledAt);
    if (isNaN(qcVisitDate.getTime())) {
      throw new AppError('올바른 방문 예정일시를 입력해주세요', 400, true, 'INVALID_DATE');
    }
    if (dto.estimatedDuration == null || dto.estimatedDuration <= 0) {
      throw new AppError('예상 소요시간을 입력해주세요', 400, true, 'ESTIMATED_DURATION_REQUIRED');
    }
    if (dto.maintenanceRequired == null) {
      throw new AppError('정비 필요 여부를 선택해주세요', 400, true, 'MAINTENANCE_REQUIRED_MISSING');
    }
  }

  // 상태 전이 결정
  let newStatus: string | undefined;
  if (dto.action === 'MARK_REVIEW') newStatus = 'REVIEW_REQUIRED';
  else if (dto.action === 'RECEIVE') newStatus = 'RECEIVED';
  else if (dto.action === 'CANCEL') newStatus = 'CANCELLED';
  else if (dto.action === 'REVERT_TO_REQUESTED') newStatus = 'REQUESTED';
  else if (dto.action === 'START_WORK') newStatus = 'IN_PROGRESS';

  if (newStatus) assertValidTransition(request.status, newStatus);

  // 업데이트 데이터 구성
  const updateData: Record<string, unknown> = {};

  if (dto.isEmergency !== undefined) {
    updateData.isEmergency = dto.isEmergency;
    if (dto.isEmergency) {
      updateData.emergencyReason = dto.emergencyReason;
      updateData.emergencySetById = userId;
      updateData.emergencySetAt = new Date();
    } else {
      updateData.emergencyReason = null;
      updateData.emergencySetById = null;
      updateData.emergencySetAt = null;
    }
  }

  if (dto.priority !== undefined) {
    updateData.priority = dto.priority;
  }

  if (newStatus) {
    updateData.status = newStatus;
  }

  // STEP 12: RECEIVE 시 QC 방문일시/예상시간/정비여부 저장
  if (dto.action === 'RECEIVE') {
    updateData.plannedWorkDate = qcVisitDate;
    updateData.estimatedDuration = dto.estimatedDuration;
    updateData.maintenanceRequired = dto.maintenanceRequired;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const req = await tx.facilityRequest.update({
      where: { id: requestId },
      data: updateData,
      select: REQUEST_DETAIL_SELECT,
    });

    // 상태 전이가 있는 경우만 StatusLog 생성
    if (newStatus) {
      await tx.statusLog.create({
        data: {
          requestId,
          fromStatus: request.status as FacilityRequestStatus,
          toStatus: newStatus as FacilityRequestStatus,
          reason: dto.reason ?? null,
          changedById: userId,
        },
      });
    }

    return req;
  });

  // STEP 10: 긴급 전환 알림 (false → true 변경 시만) — ADMIN 포함 전 지점 scope
  if (dto.isEmergency === true && !request.isEmergency) {
    getNotificationRecipients(request.branchId, 'EMERGENCY_SET')
      .then((scopeIds) => {
        const recipients = [...new Set([...scopeIds, ...(request.assignedToId ? [request.assignedToId] : [])])];
        return fanOut({
          type: 'EMERGENCY_SET',
          recipientIds: recipients,
          requestId,
          title: `긴급 전환: ${updated.title}`,
          message: dto.emergencyReason,
        });
      })
      .catch(() => {});
  }

  // RECEIVE / START_WORK — 운영팀 + QC + 요청 생성자에게 알림
  if (dto.action === 'RECEIVE' || dto.action === 'START_WORK') {
    getNotificationRecipients(request.branchId, 'STATUS_CHANGED')
      .then((scopeIds) => {
        const recipients = [...new Set([...scopeIds, request.createdById])];
        return fanOut({
          type: 'STATUS_CHANGED',
          recipientIds: recipients,
          requestId,
          title: dto.action === 'RECEIVE'
            ? `수령 완료: ${updated.title}`
            : `작업 시작: ${updated.title}`,
        });
      })
      .catch(() => {});
  }

  return updated;
}

// ================================================================
// STEP 6: updateSchedule — 일정 등록/변경
// ================================================================

export async function updateSchedule(
  requestId: string,
  userId: string,
  role: string,
  userBranchIds: string[],
  dto: UpdateScheduleDto,
) {
  assertQcAccess(role);

  const request = await prisma.facilityRequest.findFirst({
    where: { id: requestId, deletedAt: null },
    select: { id: true, status: true, branchId: true, plannedWorkDate: true, scheduleChangeCount: true },
  });

  if (!request) {
    throw new AppError('요청을 찾을 수 없습니다', 404, true, 'REQUEST_NOT_FOUND');
  }

  assertQcBranchAccess(role, userBranchIds, request.branchId);

  // 일정 설정 가능 상태 검증
  const schedulableStatuses = ['RECEIVED', 'SCHEDULED', 'IN_PROGRESS'];
  if (!schedulableStatuses.includes(request.status)) {
    throw new AppError(
      '수령 처리 후 일정을 등록할 수 있습니다',
      400,
      true,
      'INVALID_STATUS_FOR_SCHEDULE',
    );
  }

  const plannedDate = new Date(dto.plannedWorkDate);
  if (isNaN(plannedDate.getTime())) {
    throw new AppError('올바른 날짜 형식을 입력해주세요', 400, true, 'INVALID_DATE');
  }

  // 최초 등록 vs 변경 구분
  const isFirstSchedule = !request.plannedWorkDate;
  const newScheduleChangeCount = isFirstSchedule
    ? 0
    : request.scheduleChangeCount + 1;

  // RECEIVED → SCHEDULED 자동 전이 (최초 일정 등록 시)
  const shouldTransitionToScheduled =
    isFirstSchedule && request.status === 'RECEIVED';

  const updated = await prisma.$transaction(async (tx) => {
    const req = await tx.facilityRequest.update({
      where: { id: requestId },
      data: {
        plannedWorkDate: plannedDate,
        scheduleChangeCount: newScheduleChangeCount,
        ...(shouldTransitionToScheduled ? { status: 'SCHEDULED' } : {}),
      },
      select: REQUEST_DETAIL_SELECT,
    });

    // 상태 전이 시 StatusLog
    if (shouldTransitionToScheduled) {
      await tx.statusLog.create({
        data: {
          requestId,
          fromStatus: 'RECEIVED',
          toStatus: 'SCHEDULED',
          reason: dto.reason ?? '일정 등록',
          changedById: userId,
        },
      });
    } else if (!isFirstSchedule) {
      // 일정 변경 이력 — 상태 변화 없지만 변경 횟수 기록용 로그
      await tx.statusLog.create({
        data: {
          requestId,
          fromStatus: request.status as FacilityRequestStatus,
          toStatus: request.status as FacilityRequestStatus,
          reason: dto.reason ?? `일정 변경 (${newScheduleChangeCount}회차)`,
          changedById: userId,
        },
      });
    }

    return req;
  });

  // 일정 등록/변경 알림 — 운영팀 + QC 전체 scope
  getNotificationRecipients(request.branchId, 'STATUS_CHANGED')
    .then((ids) =>
      fanOut({
        type: 'STATUS_CHANGED',
        recipientIds: ids,
        requestId,
        title: isFirstSchedule
          ? `일정 등록: ${updated.title}`
          : `일정 변경: ${updated.title}`,
        message: dto.plannedWorkDate,
      }),
    )
    .catch(() => {});

  return updated;
}

// ================================================================
// STEP 6: assignWorker — 담당자 배정
// ================================================================

export async function assignWorker(
  requestId: string,
  userId: string,
  role: string,
  userBranchIds: string[],
  dto: AssignWorkerDto,
) {
  assertQcAccess(role);

  const request = await prisma.facilityRequest.findFirst({
    where: { id: requestId, deletedAt: null },
    select: { id: true, status: true, branchId: true },
  });

  if (!request) {
    throw new AppError('요청을 찾을 수 없습니다', 404, true, 'REQUEST_NOT_FOUND');
  }

  assertQcBranchAccess(role, userBranchIds, request.branchId);

  // 종료된 요청에는 배정 불가
  const terminalStatuses = ['CLOSED', 'CANCELLED', 'COMPLETED'];
  if (terminalStatuses.includes(request.status)) {
    throw new AppError('종료된 요청에는 담당자를 배정할 수 없습니다', 400, true, 'INVALID_STATUS');
  }

  // 배정 대상자 검증 — 활성 사용자인지 확인
  const assignee = await prisma.user.findFirst({
    where: { id: dto.assignedToId, isActive: true, deletedAt: null },
    select: { id: true, name: true, role: true, branchId: true },
  });

  if (!assignee) {
    throw new AppError('담당자를 찾을 수 없습니다', 404, true, 'USER_NOT_FOUND');
  }

  const updated = await prisma.facilityRequest.update({
    where: { id: requestId },
    data: { assignedToId: dto.assignedToId },
    select: REQUEST_DETAIL_SELECT,
  });

  // STEP 10: 담당자 배정 알림 — 담당자 본인 + scope 내 팀장/팀원
  getNotificationRecipients(updated.branchId, 'WORKER_ASSIGNED')
    .then((scopeIds) => {
      const recipients = [...new Set([...scopeIds, dto.assignedToId])];
      return fanOut({
        type: 'WORKER_ASSIGNED',
        recipientIds: recipients,
        requestId,
        title: `담당 배정: ${updated.title}`,
      });
    })
    .catch(() => {});

  return updated;
}

// ================================================================
// STEP 7: completeWork — 작업 완료 등록 (IN_PROGRESS → DONE_BY_QC)
// ================================================================

export async function completeWork(
  requestId: string,
  userId: string,
  role: string,
  userBranchIds: string[],
  dto: CompleteWorkDto,
  file?: Express.Multer.File,
) {
  assertQcAccess(role);

  const request = await prisma.facilityRequest.findFirst({
    where: { id: requestId, deletedAt: null },
    select: { id: true, status: true, branchId: true },
  });

  if (!request) {
    throw new AppError('요청을 찾을 수 없습니다', 404, true, 'REQUEST_NOT_FOUND');
  }

  assertQcBranchAccess(role, userBranchIds, request.branchId);

  if (request.status !== 'IN_PROGRESS') {
    throw new AppError(
      '작업 진행 중 상태에서만 완료 등록이 가능합니다',
      400,
      true,
      'INVALID_STATUS',
    );
  }

  if (!file) {
    throw new AppError('완료 사진을 첨부해주세요', 400, true, 'PHOTO_REQUIRED');
  }

  const completionReason = dto.note?.trim()
    ? `${dto.generatedText} — ${dto.note.trim()}`
    : dto.generatedText;

  const updated = await prisma.$transaction(async (tx) => {
    // AFTER 사진/영상 저장
    const isVideo = file.mimetype.startsWith('video/');
    await tx.media.create({
      data: {
        type: isVideo ? 'VIDEO' : 'IMAGE',
        phase: 'AFTER',
        url: `/uploads/${file.filename}`,
        filename: file.originalname,
        size: file.size,
        requestId,
        uploadedById: userId,
      },
    });

    // 상태 전이 + 완료 정보 기록
    const req = await tx.facilityRequest.update({
      where: { id: requestId },
      data: {
        status: 'DONE_BY_QC',
        completedAt: new Date(),
        completedById: userId,
      },
      select: REQUEST_DETAIL_SELECT,
    });

    await tx.statusLog.create({
      data: {
        requestId,
        fromStatus: 'IN_PROGRESS',
        toStatus: 'DONE_BY_QC',
        reason: completionReason,
        changedById: userId,
      },
    });

    return req;
  });

  // 작업 완료 알림 — 운영팀 + QC 전체 scope
  getNotificationRecipients(request.branchId, 'STATUS_CHANGED')
    .then((ids) =>
      fanOut({
        type: 'STATUS_CHANGED',
        recipientIds: ids,
        requestId,
        title: `QC 완료: ${updated.title}`,
      }),
    )
    .catch(() => {});

  return updated;
}

// ================================================================
// STEP 8: getQcCompleted — QC 완료 큐 (DONE_BY_QC 항목)
// ================================================================

export async function getQcCompleted(
  role: string,
  userBranchIds: string[],
  filterBranchId?: string,
) {
  assertQcAccess(role);

  const branchWhere = (role === 'QC' && userBranchIds.length > 0)
    ? { branchId: { in: userBranchIds } }
    : filterBranchId
    ? { branchId: filterBranchId }
    : {};

  const baseWhere = {
    deletedAt: null,
    ...branchWhere,
  };

  const cardSelect = {
    id: true,
    title: true,
    description: true,
    status: true,
    category: true,
    isEmergency: true,
    priority: true,
    plannedWorkDate: true,
    scheduleChangeCount: true,
    completedAt: true,
    createdAt: true,
    updatedAt: true,
    /// STEP 12: 객실 번호
    roomNumber: true,
    /// STEP 12: 보고 체크
    opsReported: true,
    qcReported: true,
    branch: { select: { id: true, name: true, code: true } },
    location: { select: { id: true, name: true, code: true } },
    createdBy: { select: { id: true, name: true } },
    assignedTo: { select: { id: true, name: true } },
    completedBy: { select: { id: true, name: true } },
  } as const;

  const doneByQc = await prisma.facilityRequest.findMany({
    where: { ...baseWhere, status: 'DONE_BY_QC' },
    select: cardSelect,
    orderBy: [{ isEmergency: 'desc' }, { updatedAt: 'desc' }],
  });

  return { doneByQc };
}

// ================================================================
// STEP 8: qcVerify — QC 최종 검토 (DONE_BY_QC → QC_VERIFIED | REOPENED)
// ================================================================

export async function qcVerify(
  requestId: string,
  userId: string,
  role: string,
  userBranchIds: string[],
  dto: QcVerifyDto,
) {
  assertQcAccess(role);

  const request = await prisma.facilityRequest.findFirst({
    where: { id: requestId, deletedAt: null },
    select: { id: true, status: true, branchId: true, createdById: true },
  });

  if (!request) {
    throw new AppError('요청을 찾을 수 없습니다', 404, true, 'REQUEST_NOT_FOUND');
  }

  assertQcBranchAccess(role, userBranchIds, request.branchId);

  if (request.status !== 'DONE_BY_QC') {
    throw new AppError(
      'QC 완료 상태에서만 최종 검토가 가능합니다',
      400,
      true,
      'INVALID_STATUS',
    );
  }

  // STEP 11: REOPEN 시 사유 필수
  if (dto.action === 'REOPEN' && !dto.note?.trim()) {
    throw new AppError('재오픈 사유를 입력해주세요', 400, true, 'REOPEN_REASON_REQUIRED');
  }

  const newStatus = dto.action === 'VERIFY' ? 'QC_VERIFIED' : 'REOPENED';
  assertValidTransition(request.status, newStatus);

  const updated = await prisma.$transaction(async (tx) => {
    const updateData: Record<string, unknown> = { status: newStatus };
    if (dto.action === 'VERIFY') {
      updateData.qcVerifiedById = userId;
      updateData.qcVerifiedAt = new Date();
    } else {
      // REOPEN: reopenCount 증가
      updateData.reopenCount = { increment: 1 };
    }

    const req = await tx.facilityRequest.update({
      where: { id: requestId },
      data: updateData,
      select: REQUEST_DETAIL_SELECT,
    });

    await tx.statusLog.create({
      data: {
        requestId,
        fromStatus: 'DONE_BY_QC',
        toStatus: newStatus as FacilityRequestStatus,
        reason: dto.note ?? (dto.action === 'VERIFY' ? 'QC 최종 검토 완료' : '재오픈'),
        changedById: userId,
      },
    });

    return req;
  });

  // STEP 10: 알림 — 상태에 따라 fan-out
  if (dto.action === 'VERIFY') {
    // 운영팀 + QC 확인 요청 알림
    getNotificationRecipients(request.branchId, 'OPERATIONS_CONFIRM_REQUESTED')
      .then((ids) =>
        fanOut({
          type: 'OPERATIONS_CONFIRM_REQUESTED',
          recipientIds: ids,
          requestId,
          title: `운영팀 확인 요청: ${updated.title}`,
        }),
      )
      .catch(() => {});
  } else if (dto.action === 'REOPEN') {
    // 운영팀 + QC + 요청 생성자에게 재오픈 알림
    getNotificationRecipients(request.branchId, 'REQUEST_REOPENED')
      .then((scopeIds) => {
        const recipients = [...new Set([...scopeIds, request.createdById])];
        return fanOut({
          type: 'REQUEST_REOPENED',
          recipientIds: recipients,
          requestId,
          title: `재오픈: ${updated.title}`,
          message: dto.note,
        });
      })
      .catch(() => {});
  }

  return updated;
}

// ================================================================
// STEP 8: getOperationsPending — 운영팀 확인 큐
// ================================================================

export async function getOperationsPending(
  role: string,
  userBranchIds: string[],
  filterBranchId?: string,
) {
  assertOperationsAccess(role);

  const branchWhere = (role === 'OPERATIONS' && userBranchIds.length > 0)
    ? { branchId: { in: userBranchIds } }
    : filterBranchId
    ? { branchId: filterBranchId }
    : {};

  const baseWhere = {
    deletedAt: null,
    ...branchWhere,
  };

  const cardSelect = {
    id: true,
    title: true,
    description: true,
    status: true,
    category: true,
    isEmergency: true,
    priority: true,
    plannedWorkDate: true,
    scheduleChangeCount: true,
    completedAt: true,
    qcVerifiedAt: true,
    operationsConfirmedAt: true,
    createdAt: true,
    updatedAt: true,
    /// STEP 12: 객실 번호
    roomNumber: true,
    /// STEP 12: 보고 체크
    opsReported: true,
    qcReported: true,
    branch: { select: { id: true, name: true, code: true } },
    location: { select: { id: true, name: true, code: true } },
    createdBy: { select: { id: true, name: true } },
    assignedTo: { select: { id: true, name: true } },
    completedBy: { select: { id: true, name: true } },
    qcVerifiedBy: { select: { id: true, name: true } },
    operationsConfirmedBy: { select: { id: true, name: true } },
    /// [PATCH] 답변 하이라이트용 댓글 수
    _count: { select: { comments: { where: { deletedAt: null } } } },
  } as const;

  const [pending, recentClosed] = await Promise.all([
    prisma.facilityRequest.findMany({
      where: { ...baseWhere, status: 'QC_VERIFIED' },
      select: cardSelect,
      orderBy: [{ isEmergency: 'desc' }, { updatedAt: 'asc' }],
    }),
    prisma.facilityRequest.findMany({
      where: {
        ...baseWhere,
        status: 'CLOSED',
        operationsConfirmedAt: { not: null },
      },
      select: cardSelect,
      orderBy: { operationsConfirmedAt: 'desc' },
      take: 20,
    }),
  ]);

  return { pending, recentClosed };
}

// ================================================================
// STEP 9: getQcHistory — QC가 처리한 완료 이력 (CLOSED, 댓글 수 포함)
// ================================================================

export async function getQcHistory(
  role: string,
  userBranchIds: string[],
  filterBranchId?: string,
) {
  assertQcAccess(role);

  const branchWhere = (role === 'QC' && userBranchIds.length > 0)
    ? { branchId: { in: userBranchIds } }
    : filterBranchId
    ? { branchId: filterBranchId }
    : {};

  return prisma.facilityRequest.findMany({
    where: {
      deletedAt: null,
      /// [PATCH] QC_VERIFIED(운영팀 확인 대기)도 이력에 포함 — CLOSED 단독 필터 시 누락되는 문제
      status: { in: ['QC_VERIFIED', 'CLOSED'] },
      ...branchWhere,
    },
    select: {
      id: true,
      title: true,
      status: true,
      category: true,
      updatedAt: true,
      completedAt: true,
      operationsConfirmedAt: true,
      /// [PATCH] 히스토리 화면 보고 체크·부가 정보 렌더용
      roomNumber: true,
      opsReported: true,
      opsReportedAt: true,
      qcReported: true,
      qcReportedAt: true,
      branch: { select: { id: true, name: true, code: true } },
      location: { select: { id: true, name: true, code: true, type: true } },
      assignedTo: { select: { id: true, name: true } },
      completedBy: { select: { id: true, name: true } },
      operationsConfirmedBy: { select: { id: true, name: true } },
      _count: {
        select: {
          comments: { where: { deletedAt: null } },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });
}

// ================================================================
// STEP 8: operationsConfirm — 운영팀 확인 (QC_VERIFIED → CONFIRMED → CLOSED)
// ================================================================

export async function operationsConfirm(
  requestId: string,
  userId: string,
  role: string,
  userBranchIds: string[],
  dto: OperationsConfirmDto,
) {
  assertOperationsAccess(role);

  const request = await prisma.facilityRequest.findFirst({
    where: { id: requestId, deletedAt: null },
    select: { id: true, status: true, branchId: true },
  });

  if (!request) {
    throw new AppError('요청을 찾을 수 없습니다', 404, true, 'REQUEST_NOT_FOUND');
  }

  assertQcBranchAccess(role, userBranchIds, request.branchId);

  if (request.status !== 'QC_VERIFIED') {
    throw new AppError(
      'QC 검토 완료 상태에서만 운영팀 확인이 가능합니다',
      400,
      true,
      'INVALID_STATUS',
    );
  }

  assertValidTransition('QC_VERIFIED', 'OPERATIONS_CONFIRMED');
  assertValidTransition('OPERATIONS_CONFIRMED', 'CLOSED');

  const now = new Date();
  const confirmNote = dto.note?.trim() ?? '운영팀 확인 완료';

  const updated = await prisma.$transaction(async (tx) => {
    const req = await tx.facilityRequest.update({
      where: { id: requestId },
      data: {
        status: 'CLOSED',
        operationsConfirmedByUserId: userId,
        operationsConfirmedAt: now,
      },
      select: REQUEST_DETAIL_SELECT,
    });

    // 1차: QC_VERIFIED → OPERATIONS_CONFIRMED
    await tx.statusLog.create({
      data: {
        requestId,
        fromStatus: 'QC_VERIFIED',
        toStatus: 'OPERATIONS_CONFIRMED',
        reason: confirmNote,
        changedById: userId,
      },
    });

    // 2차: OPERATIONS_CONFIRMED → CLOSED
    await tx.statusLog.create({
      data: {
        requestId,
        fromStatus: 'OPERATIONS_CONFIRMED',
        toStatus: 'CLOSED',
        reason: confirmNote,
        changedById: userId,
      },
    });

    return req;
  });

  return updated;
}

// ================================================================
// Operations 대시보드 — 4개 섹션
//  requested : RECEIVED (일정 미등록)
//  scheduled : SCHEDULED (일정 등록)
//  today     : 금일 진행 (plannedWorkDate = 오늘, IN_PROGRESS/DONE_BY_QC/QC_VERIFIED)
//  completed : 오늘 완료된 항목 (operationsConfirmedAt = 오늘)
// ================================================================

export async function getOperationsDashboard(
  role: string,
  userBranchIds: string[],
  filterBranchId?: string,
) {
  assertOperationsAccess(role);

  /// [PATCH] 운영팀 대시보드는 전체 지점을 기본 노출. 본인 지점 우선 배치는 프론트에서 처리.
  /// [PATCH] 기존 userBranchIds 자동 스코프는 제거 — filterBranchId로만 수동 좁히기.
  void userBranchIds;
  const branchWhere = filterBranchId
    ? { branchId: filterBranchId }
    : {};

  const baseWhere = {
    deletedAt: null,
    ...branchWhere,
  };

  const cardSelect = {
    id: true,
    title: true,
    description: true,
    status: true,
    category: true,
    isEmergency: true,
    priority: true,
    plannedWorkDate: true,
    scheduleChangeCount: true,
    completedAt: true,
    qcVerifiedAt: true,
    operationsConfirmedAt: true,
    createdAt: true,
    updatedAt: true,
    /// STEP 12: 객실 번호
    roomNumber: true,
    /// STEP 12: 보고 체크
    opsReported: true,
    qcReported: true,
    branch:                { select: { id: true, name: true, code: true } },
    location:              { select: { id: true, name: true, code: true } },
    createdBy:             { select: { id: true, name: true } },
    assignedTo:            { select: { id: true, name: true } },
    completedBy:           { select: { id: true, name: true } },
    qcVerifiedBy:          { select: { id: true, name: true } },
    operationsConfirmedBy: { select: { id: true, name: true } },
    _count: { select: { comments: { where: { deletedAt: null } } } },
  } as const;

  /// [PATCH] KST(UTC+9) 기준 오늘 범위 — Railway 서버(UTC)와 무관하게 한국 시간 기준
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const kstDateStr = kstNow.toISOString().slice(0, 10);
  const todayStart = new Date(`${kstDateStr}T00:00:00+09:00`);
  const todayEnd   = new Date(`${kstDateStr}T23:59:59.999+09:00`);

  const [newRequests, requested, scheduled, today, completed] = await Promise.all([
    // 신규 요청 — PENDING / REQUESTED 상태 (QC 수령 전)
    prisma.facilityRequest.findMany({
      where: { ...baseWhere, status: { in: ['PENDING', 'REQUESTED', 'REVIEW_REQUIRED'] } },
      select: cardSelect,
      orderBy: [{ isEmergency: 'desc' }, { createdAt: 'desc' }],
    }),

    // 수령 완료 — RECEIVED 중 오늘 예정일이 아닌 것 (오늘 분은 today로 이동)
    prisma.facilityRequest.findMany({
      where: {
        ...baseWhere,
        status: 'RECEIVED',
        NOT: [{ plannedWorkDate: { gte: todayStart, lte: todayEnd } }],
      },
      select: cardSelect,
      orderBy: [{ isEmergency: 'desc' }, { createdAt: 'asc' }],
    }),

    // 일정 확정 — SCHEDULED 중 오늘이 아닌 것만 (오늘 분은 today로 이동)
    prisma.facilityRequest.findMany({
      where: {
        ...baseWhere,
        status: 'SCHEDULED',
        NOT: [{ plannedWorkDate: { gte: todayStart, lte: todayEnd } }],
      },
      select: cardSelect,
      orderBy: [{ isEmergency: 'desc' }, { plannedWorkDate: 'asc' }],
    }),

    // 금일 작업 — 오늘 예정일인 RECEIVED/SCHEDULED + 진행 중 항목 (날짜 없이 진행 중인 것도 포함)
    prisma.facilityRequest.findMany({
      where: {
        ...baseWhere,
        OR: [
          { status: 'RECEIVED',  plannedWorkDate: { gte: todayStart, lte: todayEnd } },
          { status: 'SCHEDULED', plannedWorkDate: { gte: todayStart, lte: todayEnd } },
          { status: { in: ['IN_PROGRESS', 'DONE_BY_QC', 'QC_VERIFIED'] }, plannedWorkDate: { gte: todayStart, lte: todayEnd } },
          { status: { in: ['IN_PROGRESS', 'DONE_BY_QC', 'QC_VERIFIED'] }, plannedWorkDate: null },
        ],
      },
      select: cardSelect,
      orderBy: [{ isEmergency: 'desc' }, { updatedAt: 'desc' }],
    }),

    // 작업 완료 — 오늘 운영팀 확인 완료된 항목
    prisma.facilityRequest.findMany({
      where: {
        ...baseWhere,
        status: 'CLOSED',
        operationsConfirmedAt: { gte: todayStart, lte: todayEnd },
      },
      select: cardSelect,
      orderBy: { operationsConfirmedAt: 'desc' },
    }),
  ]);

  return { newRequests, requested, scheduled, today, completed };
}

// ================================================================
// 작업 이력 조회 — 달력(날짜별) + 키워드 검색
//  date      : 특정 날짜 (YYYY-MM-DD) — 해당일에 완료된 항목
//  startDate/endDate : 날짜 범위
//  keyword   : 제목/설명 부분 검색
// ================================================================

interface WorkHistoryParams {
  date?: string;
  startDate?: string;
  endDate?: string;
  keyword?: string;
  filterBranchId?: string;
}

export async function getWorkHistory(
  role: string,
  userBranchIds: string[],
  params: WorkHistoryParams,
) {
  // QC, OPERATIONS, ADMIN 모두 접근 가능
  if (!['QC', 'OPERATIONS', 'ADMIN'].includes(role)) {
    throw new AppError('권한이 없습니다', 403, true, 'FORBIDDEN');
  }

  const branchWhere = ((role === 'QC' || role === 'OPERATIONS') && userBranchIds.length > 0)
    ? { branchId: { in: userBranchIds } }
    : params.filterBranchId
    ? { branchId: params.filterBranchId }
    : {};

  // AND 조건 배열 — 각 조건을 독립적으로 구성
  /// [PATCH] OPERATIONS_CONFIRMED는 DB에 영구 저장되지 않음 (operationsConfirm이 바로 CLOSED로 점프)
  /// [PATCH] QC_VERIFIED(운영팀 확인 대기 상태)를 이력에 포함하여 누락 문제 해결
  const AND: object[] = [
    { deletedAt: null },
    { status: { in: ['QC_VERIFIED', 'CLOSED'] } },
    ...(Object.keys(branchWhere).length > 0 ? [branchWhere] : []),
  ];

  // 날짜 필터 — 특정일 또는 범위
  if (params.date) {
    const d = new Date(params.date);
    const start = new Date(d); start.setHours(0, 0, 0, 0);
    const end   = new Date(d); end.setHours(23, 59, 59, 999);
    AND.push({
      OR: [
        { operationsConfirmedAt: { gte: start, lte: end } },
        { completedAt:           { gte: start, lte: end } },
      ],
    });
  } else if (params.startDate || params.endDate) {
    const start = params.startDate ? new Date(params.startDate) : undefined;
    const end   = params.endDate   ? new Date(params.endDate)   : undefined;
    if (start) start.setHours(0, 0, 0, 0);
    if (end)   end.setHours(23, 59, 59, 999);
    AND.push({
      OR: [
        { operationsConfirmedAt: { ...(start ? { gte: start } : {}), ...(end ? { lte: end } : {}) } },
        { completedAt:           { ...(start ? { gte: start } : {}), ...(end ? { lte: end } : {}) } },
      ],
    });
  }

  // 키워드 검색
  if (params.keyword?.trim()) {
    const kw = params.keyword.trim();
    AND.push({
      OR: [
        { title:       { contains: kw, mode: 'insensitive' } },
        { description: { contains: kw, mode: 'insensitive' } },
      ],
    });
  }

  const items = await prisma.facilityRequest.findMany({
    where: { AND } as object,
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      category: true,
      isEmergency: true,
      completedAt: true,
      qcVerifiedAt: true,
      operationsConfirmedAt: true,
      plannedWorkDate: true,
      /// [PATCH] 히스토리 화면 보고 체크·부가 정보 렌더용
      roomNumber: true,
      opsReported: true,
      opsReportedAt: true,
      qcReported: true,
      qcReportedAt: true,
      branch:                { select: { id: true, name: true, code: true } },
      location:              { select: { id: true, name: true, code: true } },
      assignedTo:            { select: { id: true, name: true } },
      completedBy:           { select: { id: true, name: true } },
      qcVerifiedBy:          { select: { id: true, name: true } },
      operationsConfirmedBy: { select: { id: true, name: true } },
    },
    /// [PATCH] operationsConfirmedAt은 QC_VERIFIED 단계에선 NULL이므로 updatedAt으로 정렬
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });

  return items;
}

// ================================================================
// 시설 요청 수정 — QC/OPERATIONS 팀장급 + ADMIN
// ================================================================

export async function updateFacilityRequest(
  requestId: string,
  userId: string,
  role: string,
  position: string,
  userBranchIds: string[],
  dto: UpdateFacilityRequestDto,
) {
  assertEditPermission(role, position);

  const request = await prisma.facilityRequest.findFirst({
    where: { id: requestId, deletedAt: null },
    select: { id: true, status: true, branchId: true, title: true },
  });

  if (!request) {
    throw new AppError('요청을 찾을 수 없습니다', 404, true, 'REQUEST_NOT_FOUND');
  }

  assertQcBranchAccess(role, userBranchIds, request.branchId);

  const updateData: Record<string, unknown> = {};
  if (dto.title !== undefined) updateData.title = dto.title;
  if (dto.description !== undefined) updateData.description = dto.description;
  if (dto.category !== undefined) updateData.category = dto.category;
  if (dto.locationId !== undefined) updateData.locationId = dto.locationId || null;

  const updated = await prisma.facilityRequest.update({
    where: { id: requestId },
    data: updateData,
    select: REQUEST_DETAIL_SELECT,
  });

  return updated;
}

// ================================================================
// 시설 요청 삭제 (soft delete) — QC/OPERATIONS 팀장급 + ADMIN
// ================================================================

export async function deleteFacilityRequest(
  requestId: string,
  role: string,
  position: string,
  userBranchIds: string[],
) {
  assertEditPermission(role, position);

  const request = await prisma.facilityRequest.findFirst({
    where: { id: requestId, deletedAt: null },
    select: { id: true, branchId: true },
  });

  if (!request) {
    throw new AppError('요청을 찾을 수 없습니다', 404, true, 'REQUEST_NOT_FOUND');
  }

  assertQcBranchAccess(role, userBranchIds, request.branchId);

  await prisma.facilityRequest.update({
    where: { id: requestId },
    data: { deletedAt: new Date() },
  });

  return { message: '삭제되었습니다' };
}

// ================================================================
// 수정/삭제 권한 — ADMIN 또는 QC/OPERATIONS 팀장급
// ================================================================

function assertEditPermission(role: string, position: string): void {
  if (role === 'ADMIN') return;
  if (role === 'OPERATIONS') return;
  if (role === 'QC' &&
      (position === 'TEAM_LEADER' || position === 'DEPUTY_LEADER')) return;
  throw new AppError('수정/삭제 권한이 없습니다', 403, true, 'FORBIDDEN');
}

// ================================================================
// STEP 11: reopenFacilityRequest
//  - QC/ADMIN     : QC_VERIFIED → REOPENED
//  - OPERATIONS/ADMIN : CLOSED → REOPENED
// ================================================================

export async function reopenFacilityRequest(
  requestId: string,
  userId: string,
  role: string,
  userBranchIds: string[],
  dto: ReopenFacilityRequestDto,
) {
  if (!['QC', 'OPERATIONS', 'ADMIN'].includes(role)) {
    throw new AppError('접근 권한이 없습니다', 403, true, 'FORBIDDEN');
  }

  if (!dto.reason?.trim()) {
    throw new AppError('재오픈 사유를 입력해주세요', 400, true, 'REOPEN_REASON_REQUIRED');
  }

  const request = await prisma.facilityRequest.findFirst({
    where: { id: requestId, deletedAt: null },
    select: { id: true, status: true, branchId: true, createdById: true, title: true },
  });

  if (!request) {
    throw new AppError('요청을 찾을 수 없습니다', 404, true, 'REQUEST_NOT_FOUND');
  }

  assertQcBranchAccess(role, userBranchIds, request.branchId);

  // 역할별 허용 상태 검증
  if (role === 'QC' && request.status !== 'QC_VERIFIED') {
    throw new AppError('QC 검토 완료 상태에서만 재오픈이 가능합니다', 400, true, 'INVALID_STATUS');
  }
  if (role === 'OPERATIONS' && request.status !== 'CLOSED') {
    throw new AppError('종료 상태에서만 재오픈이 가능합니다', 400, true, 'INVALID_STATUS');
  }
  if (role === 'ADMIN' && !['QC_VERIFIED', 'CLOSED'].includes(request.status)) {
    throw new AppError('QC 검토 완료 또는 종료 상태에서만 재오픈이 가능합니다', 400, true, 'INVALID_STATUS');
  }

  assertValidTransition(request.status, 'REOPENED');

  const updated = await prisma.$transaction(async (tx) => {
    const req = await tx.facilityRequest.update({
      where: { id: requestId },
      data: {
        status: 'REOPENED',
        reopenCount: { increment: 1 },
      },
      select: REQUEST_DETAIL_SELECT,
    });

    await tx.statusLog.create({
      data: {
        requestId,
        fromStatus: request.status as FacilityRequestStatus,
        toStatus: 'REOPENED',
        reason: dto.reason.trim(),
        changedById: userId,
      },
    });

    return req;
  });

  // 운영팀 + QC + 요청 생성자에게 재오픈 알림
  getNotificationRecipients(request.branchId, 'REQUEST_REOPENED')
    .then((scopeIds) => {
      const recipients = [...new Set([...scopeIds, request.createdById])];
      return fanOut({
        type: 'REQUEST_REOPENED',
        recipientIds: recipients,
        requestId,
        title: `재오픈: ${request.title}`,
        message: dto.reason,
      });
    })
    .catch(() => {});

  return updated;
}

// ================================================================
// STEP 12: 팀장급 보고 체크 — 운영팀 팀장/QC 팀장이 각자 담당 지점의 요청에 대해
//                         상부 보고 완료 여부를 체크할 수 있음
// ================================================================

/** 팀장급 권한 확인 — TEAM_LEADER 또는 DEPUTY_LEADER */
function assertLeaderRole(role: string, position: string): void {
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

export async function toggleOpsReport(
  requestId: string,
  userId: string,
  role: string,
  position: string,
  userBranchIds: string[],
  dto: ToggleReportDto,
) {
  assertLeaderRole(role, position);

  // 운영팀 팀장 또는 ADMIN만 운영팀 보고 체크 가능
  if (role !== 'OPERATIONS' && role !== 'ADMIN') {
    throw new AppError('운영팀 팀장만 체크 가능합니다', 403, true, 'FORBIDDEN');
  }

  const request = await prisma.facilityRequest.findFirst({
    where: { id: requestId, deletedAt: null },
    select: { id: true, branchId: true },
  });

  if (!request) {
    throw new AppError('요청을 찾을 수 없습니다', 404, true, 'REQUEST_NOT_FOUND');
  }

  assertQcBranchAccess(role, userBranchIds, request.branchId);

  const updated = await prisma.facilityRequest.update({
    where: { id: requestId },
    data: dto.reported
      ? { opsReported: true, opsReportedAt: new Date(), opsReportedById: userId }
      : { opsReported: false, opsReportedAt: null, opsReportedById: null },
    select: REQUEST_DETAIL_SELECT,
  });

  return updated;
}

export async function toggleQcReport(
  requestId: string,
  userId: string,
  role: string,
  position: string,
  userBranchIds: string[],
  dto: ToggleReportDto,
) {
  assertLeaderRole(role, position);

  // QC 팀장 또는 ADMIN만 QC 보고 체크 가능
  if (role !== 'QC' && role !== 'ADMIN') {
    throw new AppError('QC 팀장만 체크 가능합니다', 403, true, 'FORBIDDEN');
  }

  const request = await prisma.facilityRequest.findFirst({
    where: { id: requestId, deletedAt: null },
    select: { id: true, branchId: true },
  });

  if (!request) {
    throw new AppError('요청을 찾을 수 없습니다', 404, true, 'REQUEST_NOT_FOUND');
  }

  assertQcBranchAccess(role, userBranchIds, request.branchId);

  const updated = await prisma.facilityRequest.update({
    where: { id: requestId },
    data: dto.reported
      ? { qcReported: true, qcReportedAt: new Date(), qcReportedById: userId }
      : { qcReported: false, qcReportedAt: null, qcReportedById: null },
    select: REQUEST_DETAIL_SELECT,
  });

  return updated;
}
