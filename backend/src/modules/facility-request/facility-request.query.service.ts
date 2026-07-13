import { FacilityRequestStatus } from '@prisma/client';
import { prisma } from '@/config/prisma';
import { AppError } from '@/common/errors/AppError';
import {
  assertQcAccess,
  assertOperationsAccess,
  assertQcBranchAccess,
  REQUEST_DETAIL_SELECT,
} from './facility-request.shared';

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
    /// [PATCH] 읽음 추적용 — 가장 최근 답변의 createdAt만 1건
    comments: {
      where: { deletedAt: null },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 1,
    },
  } as const;

  /// [PATCH] KST 기준 오늘 경계 + 1주일 윈도우 (운영팀 대시보드와 동일 규칙)
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const kstDateStr = kstNow.toISOString().slice(0, 10);
  const todayStart = new Date(`${kstDateStr}T00:00:00+09:00`);
  const todayEnd   = new Date(`${kstDateStr}T23:59:59.999+09:00`);
  const tomorrowStart = new Date(todayEnd.getTime() + 1);
  const weekAheadEnd  = new Date(todayEnd.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [newRequests, received, review, todayWork, completed] = await Promise.all([
    // 신규 요청: PENDING(레거시) + REQUESTED + REOPENED
    prisma.facilityRequest.findMany({
      where: { ...baseWhere, status: { in: ['PENDING', 'REQUESTED', 'REOPENED'] } },
      select: cardSelect,
      orderBy: [{ isEmergency: 'desc' }, { createdAt: 'asc' }],
    }),
    // 수령 완료 (RECEIVED + SCHEDULED) — 오늘은 제외(오늘 작업 컬럼 전담), 1주일 윈도우
    prisma.facilityRequest.findMany({
      where: {
        ...baseWhere,
        status: { in: ['RECEIVED', 'SCHEDULED'] },
        plannedWorkDate: { gte: tomorrowStart, lte: weekAheadEnd },
      },
      select: cardSelect,
      orderBy: [{ plannedWorkDate: 'asc' }, { isEmergency: 'desc' }],
    }),
    // 검토 필요 (판단 필요)
    prisma.facilityRequest.findMany({
      where: { ...baseWhere, status: 'REVIEW_REQUIRED' },
      select: cardSelect,
      orderBy: [{ isEmergency: 'desc' }, { updatedAt: 'asc' }],
    }),
    // 오늘 작업 — 오늘 plannedWorkDate RECEIVED/SCHEDULED + IN_PROGRESS 전체
    prisma.facilityRequest.findMany({
      where: {
        ...baseWhere,
        OR: [
          { status: { in: ['RECEIVED', 'SCHEDULED'] }, plannedWorkDate: { gte: todayStart, lte: todayEnd } },
          { status: 'IN_PROGRESS' },
        ],
      },
      select: cardSelect,
      orderBy: [{ isEmergency: 'desc' }, { updatedAt: 'desc' }],
    }),
    // 작업 완료 — 오늘 완료된 것만 (DONE_BY_QC / QC_VERIFIED / CLOSED)
    //   OPERATIONS_CONFIRMED는 operationsConfirm()가 바로 CLOSED로 점프시키므로 실제로는 거의 발생 X
    prisma.facilityRequest.findMany({
      where: {
        ...baseWhere,
        OR: [
          { status: 'DONE_BY_QC',  completedAt:           { gte: todayStart, lte: todayEnd } },
          { status: 'QC_VERIFIED', qcVerifiedAt:          { gte: todayStart, lte: todayEnd } },
          { status: 'CLOSED',      operationsConfirmedAt: { gte: todayStart, lte: todayEnd } },
        ],
      },
      select: cardSelect,
      orderBy: [{ updatedAt: 'desc' }],
    }),
  ]);

  return { newRequests, received, review, todayWork, completed };
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
    /// [PATCH] 답변 하이라이트 — count + 최근 1건 createdAt (읽음 추적용)
    _count: { select: { comments: { where: { deletedAt: null } } } },
    comments: {
      where: { deletedAt: null },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 1,
    },
  } as const;

  const doneByQc = await prisma.facilityRequest.findMany({
    where: { ...baseWhere, status: 'DONE_BY_QC' },
    select: cardSelect,
    orderBy: [{ isEmergency: 'desc' }, { updatedAt: 'desc' }],
  });

  return { doneByQc };
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
    /// [PATCH] 읽음 추적용 — 가장 최근 답변 createdAt 1건
    comments: {
      where: { deletedAt: null },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 1,
    },
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
      /// [PATCH] 읽음 추적용 — 가장 최근 답변 createdAt 1건
      comments: {
        where: { deletedAt: null },
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });
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
    /// [PATCH] 답변 읽음 추적용 — 가장 최근 답변의 createdAt만 1건 내려보냄
    comments: {
      where: { deletedAt: null },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 1,
    },
  } as const;

  /// [PATCH] KST(UTC+9) 기준 오늘 범위 — Railway 서버(UTC)와 무관하게 한국 시간 기준
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const kstDateStr = kstNow.toISOString().slice(0, 10);
  const todayStart = new Date(`${kstDateStr}T00:00:00+09:00`);
  const todayEnd   = new Date(`${kstDateStr}T23:59:59.999+09:00`);
  /// [PATCH] 작업 예정 범위: 오늘+1 ~ 오늘+7일 (가시성 확보용 1주일 윈도우)
  const weekAheadEnd = new Date(todayEnd.getTime() + 7 * 24 * 60 * 60 * 1000);
  const tomorrowStart = new Date(todayEnd.getTime() + 1);

  const [newRequests, scheduled, today, overdue, completed] = await Promise.all([
    // 신규 요청 — PENDING / REQUESTED / REVIEW_REQUIRED (QC 수령 전)
    prisma.facilityRequest.findMany({
      where: { ...baseWhere, status: { in: ['PENDING', 'REQUESTED', 'REVIEW_REQUIRED'] } },
      select: cardSelect,
      orderBy: [{ isEmergency: 'desc' }, { createdAt: 'desc' }],
    }),

    // 작업 예정 — RECEIVED + SCHEDULED 중 예정일이 내일 ~ 오늘+7일 범위
    //   • 오늘 예정일은 'today' 컬럼 전담
    //   • 7일 초과는 대시보드에서 숨김 (DB 보관은 유지, 시설 요청 목록 페이지에서 조회)
    //   • 예정일 없는 건은 추후 '보류' 탭으로 분리 예정 (현재 미노출)
    prisma.facilityRequest.findMany({
      where: {
        ...baseWhere,
        status: { in: ['RECEIVED', 'SCHEDULED'] },
        plannedWorkDate: { gte: tomorrowStart, lte: weekAheadEnd },
      },
      select: cardSelect,
      orderBy: [{ plannedWorkDate: 'asc' }, { isEmergency: 'desc' }],
    }),

    // 오늘 작업 — 오늘 예정일 RECEIVED/SCHEDULED + 진행 중 항목 (날짜 없이 진행 중인 것도 포함)
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

    // 지연된 작업 — 예정일이 과거(< 오늘 00:00)이고 아직 종료되지 않은 건
    //   CLOSED / CANCELLED / OPERATIONS_CONFIRMED / COMPLETED 제외
    prisma.facilityRequest.findMany({
      where: {
        ...baseWhere,
        plannedWorkDate: { lt: todayStart },
        status: { in: ['RECEIVED', 'SCHEDULED', 'IN_PROGRESS', 'DONE_BY_QC', 'QC_VERIFIED', 'REOPENED'] },
      },
      select: cardSelect,
      orderBy: [{ isEmergency: 'desc' }, { plannedWorkDate: 'asc' }],
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

  return { newRequests, scheduled, today, overdue, completed };
}

// ================================================================
// 작업 달력 조회 — 2개월 범위 plannedWorkDate 기준 작업 목록
//
// 동작 규칙
//  • 범위: 클라이언트에서 start/end (YYYY-MM-DD) 지정. 서버는 KST 해석.
//  • 상태 제외: CANCELLED / PENDING / REQUESTED / REVIEW_REQUIRED
//    (QC 수령 전/비확정 상태는 달력에 잡지 않는다 — Q4)
//  • 기준일: plannedWorkDate가 존재하는 건만 (null 제외 — Q3)
//  • 지점 스코프 (Q8):
//    - OPERATIONS / VENDOR: userBranchIds 강제 스코프 (본인 지점만)
//    - QC / ADMIN: 전체, filterBranchId로 좁힐 수 있음
//  • 반환: 플랫 배열. 프론트에서 일자/지점별로 그룹핑.
// ================================================================

interface CalendarViewParams {
  startDate: string; // YYYY-MM-DD (KST 기준 시작일)
  endDate:   string; // YYYY-MM-DD (KST 기준 종료일)
  filterBranchId?: string;
}

export async function getCalendarView(
  role: string,
  userBranchIds: string[],
  params: CalendarViewParams,
) {
  if (!['QC', 'OPERATIONS', 'ADMIN', 'VENDOR'].includes(role)) {
    throw new AppError('권한이 없습니다', 403, true, 'FORBIDDEN');
  }

  // 지점 스코프 — OPERATIONS/VENDOR는 본인 지점 강제, QC/ADMIN은 수동 필터
  const branchWhere = ((role === 'OPERATIONS' || role === 'VENDOR') && userBranchIds.length > 0)
    ? { branchId: { in: userBranchIds } }
    : params.filterBranchId
    ? { branchId: params.filterBranchId }
    : {};

  // KST 기준 범위 경계
  const rangeStart = new Date(`${params.startDate}T00:00:00+09:00`);
  const rangeEnd   = new Date(`${params.endDate}T23:59:59.999+09:00`);

  if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime())) {
    throw new AppError('start/end 날짜 형식이 잘못되었습니다', 400, true, 'VALIDATION_ERROR');
  }
  if (rangeStart > rangeEnd) {
    throw new AppError('start는 end보다 앞서야 합니다', 400, true, 'VALIDATION_ERROR');
  }

  const cards = await prisma.facilityRequest.findMany({
    where: {
      deletedAt: null,
      ...branchWhere,
      plannedWorkDate: { gte: rangeStart, lte: rangeEnd },
      status: {
        notIn: ['CANCELLED', 'PENDING', 'REQUESTED', 'REVIEW_REQUIRED'],
      },
    },
    select: {
      id: true,
      title: true,
      status: true,
      category: true,
      isEmergency: true,
      priority: true,
      plannedWorkDate: true,
      roomNumber: true,
      branch:     { select: { id: true, name: true, code: true } },
      location:   { select: { id: true, name: true, code: true } },
      assignedTo: { select: { id: true, name: true } },
    },
    orderBy: [{ plannedWorkDate: 'asc' }, { isEmergency: 'desc' }],
  });

  return { items: cards };
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
