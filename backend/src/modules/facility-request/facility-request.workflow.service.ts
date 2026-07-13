import { FacilityRequestStatus } from '@prisma/client';
import { prisma } from '@/config/prisma';
import { AppError } from '@/common/errors/AppError';
import { storeUploadedFile } from '@/lib/storage';
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
import {
  CATEGORY_LABEL,
  assertValidTransition,
  assertBranchAccess,
  assertQcAccess,
  assertOperationsAccess,
  assertQcBranchAccess,
  assertEditPermission,
  assertLeaderRole,
  REQUEST_DETAIL_SELECT,
} from './facility-request.shared';

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

  // 지점은 필수. locationId/roomNumber는 객실 개념이 없는 지점(카와우소/국도빌딩 등)을 위해 선택.
  const branch = await prisma.branch.findFirst({
    where: { id: dto.branchId, deletedAt: null, isActive: true },
  });
  if (!branch) {
    throw new AppError('지점을 찾을 수 없습니다', 404, true, 'BRANCH_NOT_FOUND');
  }

  // locationId가 주어진 경우에만 존재 여부 검증
  const locationIdInput = dto.locationId?.trim() || null;
  if (locationIdInput) {
    const location = await prisma.location.findFirst({
      where: { id: locationIdInput, branchId: dto.branchId, deletedAt: null },
    });
    if (!location) {
      throw new AppError('해당 지점의 위치를 찾을 수 없습니다', 404, true, 'LOCATION_NOT_FOUND');
    }
  }

  const roomNumber = dto.roomNumber?.trim() || null;

  const categoryLabel = CATEGORY_LABEL[dto.category] ?? dto.category;
  // 객실정보 없음 케이스 → 제목은 지점명 + 카테고리로 구성 (roomNumber가 title에 들어갈 수 없으므로)
  const title = roomNumber
    ? `${categoryLabel} — ${roomNumber}`
    : `${categoryLabel} — ${branch.name}`;

  // 파일 저장 (오브젝트 스토리지 업로드는 외부 IO — 트랜잭션 밖에서 수행)
  const mediaUrl = file ? await storeUploadedFile(file) : null;

  const result = await prisma.$transaction(async (tx) => {
    const request = await tx.facilityRequest.create({
      data: {
        title,
        description: dto.description,
        category: dto.category,
        status: 'REQUESTED',
        branchId: dto.branchId,
        locationId: locationIdInput,
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
    if (file && mediaUrl) {
      const isVideo = file.mimetype.startsWith('video/');
      media = await tx.media.create({
        data: {
          type: isVideo ? 'VIDEO' : 'IMAGE',
          phase: 'BEFORE',
          url: mediaUrl,
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

  // 파일 저장 (오브젝트 스토리지 업로드는 외부 IO — 트랜잭션 밖에서 수행)
  const mediaUrl = await storeUploadedFile(file);

  const updated = await prisma.$transaction(async (tx) => {
    // AFTER 사진/영상 저장
    const isVideo = file.mimetype.startsWith('video/');
    await tx.media.create({
      data: {
        type: isVideo ? 'VIDEO' : 'IMAGE',
        phase: 'AFTER',
        url: mediaUrl,
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
