import { FacilityRequestStatus } from '@prisma/client';
import { prisma } from '@/config/prisma';
import { hashPassword } from '@/common/utils/password.util';
import { AppError } from '@/common/errors/AppError';

// ================================================================
// 필터 타입
// ================================================================

export interface AdminFilters {
  branchId?: string;
  startDate?: Date;
  endDate?: Date;
}

// ================================================================
// 내부 유틸
// ================================================================

const TERMINAL_STATUSES: FacilityRequestStatus[] = ['CLOSED', 'CANCELLED', 'COMPLETED'];

function buildDateFilter(f: AdminFilters) {
  if (!f.startDate && !f.endDate) return {};
  return {
    createdAt: {
      ...(f.startDate ? { gte: f.startDate } : {}),
      ...(f.endDate ? { lte: f.endDate } : {}),
    },
  };
}

function buildBaseWhere(f: AdminFilters) {
  return {
    deletedAt: null as null,
    ...(f.branchId ? { branchId: f.branchId } : {}),
    ...buildDateFilter(f),
  };
}

// ================================================================
// KPI 요약
// ================================================================

export async function getKpiSummary(filters: AdminFilters) {
  const baseWhere = buildBaseWhere(filters);

  const [total, totalOpen, emergencyOpen, closedRequests, reopenedLogs, allGroups] =
    await Promise.all([
      // 1. 전체 건수
      prisma.facilityRequest.count({ where: baseWhere }),

      // 2. 미처리 건수 (non-terminal)
      prisma.facilityRequest.count({
        where: { ...baseWhere, status: { notIn: TERMINAL_STATUSES } },
      }),

      // 3. 긴급 미처리 건수
      prisma.facilityRequest.count({
        where: { ...baseWhere, isEmergency: true, status: { notIn: TERMINAL_STATUSES } },
      }),

      // 4. 완료 건 목록 (처리시간 계산용)
      prisma.facilityRequest.findMany({
        where: { ...baseWhere, status: 'CLOSED' },
        select: { createdAt: true, updatedAt: true },
      }),

      // 5. 재오픈 이력 (ever reopened 기준)
      prisma.statusLog.findMany({
        where: {
          toStatus: 'REOPENED',
          request: {
            deletedAt: null,
            ...(filters.branchId ? { branchId: filters.branchId } : {}),
          },
        },
        select: { requestId: true },
        distinct: ['requestId'],
      }),

      // 6. 위치 + 카테고리 그룹 (반복 고장 계산용)
      prisma.facilityRequest.groupBy({
        by: ['locationId', 'category'],
        where: {
          deletedAt: null,
          locationId: { not: null },
          ...(filters.branchId ? { branchId: filters.branchId } : {}),
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
    ]);

  // 평균 처리시간 (시간 단위)
  let avgClosureHours: number | null = null;
  if (closedRequests.length > 0) {
    const totalHours = closedRequests.reduce(
      (sum, r) => sum + (r.updatedAt.getTime() - r.createdAt.getTime()) / 3_600_000,
      0,
    );
    avgClosureHours = Math.round(totalHours / closedRequests.length);
  }

  const everReopenedCount = reopenedLogs.length;
  const reopenRate = total > 0 ? Math.round((everReopenedCount / total) * 1000) / 10 : 0;
  const repeatIssuesCount = allGroups.filter((g) => g._count.id >= 2).length;

  return {
    total,
    totalOpen,
    closedCount: closedRequests.length,
    emergencyOpen,
    avgClosureHours,
    reopenRate,
    everReopenedCount,
    repeatIssuesCount,
  };
}

// ================================================================
// 장기 미처리 (aging view)
// ================================================================

export async function getAgingRequests(filters: AdminFilters) {
  const requests = await prisma.facilityRequest.findMany({
    where: {
      deletedAt: null,
      status: { notIn: TERMINAL_STATUSES },
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
    },
    select: {
      id: true,
      title: true,
      status: true,
      category: true,
      isEmergency: true,
      priority: true,
      createdAt: true,
      updatedAt: true,
      branch: { select: { id: true, name: true, code: true } },
      location: { select: { id: true, name: true, code: true, type: true } },
      assignedTo: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
  });

  const now = Date.now();
  return requests.map((r) => ({
    ...r,
    agingDays: Math.floor((now - new Date(r.createdAt).getTime()) / 86_400_000),
  }));
}

// ================================================================
// 재오픈 건 목록
// ================================================================

export async function getReopenedRequests(filters: AdminFilters) {
  const reopenedLogs = await prisma.statusLog.findMany({
    where: {
      toStatus: 'REOPENED',
      request: {
        deletedAt: null,
        ...(filters.branchId ? { branchId: filters.branchId } : {}),
      },
    },
    select: { requestId: true },
    distinct: ['requestId'],
  });

  const ids = reopenedLogs.map((l) => l.requestId);
  if (ids.length === 0) return { total: 0, requests: [] };

  const requests = await prisma.facilityRequest.findMany({
    where: { id: { in: ids }, deletedAt: null },
    select: {
      id: true,
      title: true,
      status: true,
      category: true,
      isEmergency: true,
      createdAt: true,
      updatedAt: true,
      branch: { select: { id: true, name: true, code: true } },
      location: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });

  return { total: ids.length, requests };
}

// ================================================================
// 반복 고장 (location 우선, category 보조)
// ================================================================

export async function getRepeatIssues(filters: AdminFilters) {
  const allGroups = await prisma.facilityRequest.groupBy({
    by: ['locationId', 'category'],
    where: {
      deletedAt: null,
      locationId: { not: null },
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...buildDateFilter(filters),
    },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });

  const repeatGroups = allGroups.filter((g) => g._count.id >= 2).slice(0, 20);
  if (repeatGroups.length === 0) return [];

  const locationIds = [
    ...new Set(
      repeatGroups.map((g) => g.locationId).filter((id): id is string => !!id),
    ),
  ];

  const locations = await prisma.location.findMany({
    where: { id: { in: locationIds } },
    select: {
      id: true,
      name: true,
      code: true,
      type: true,
      branch: { select: { id: true, name: true } },
    },
  });
  const locationMap = new Map(locations.map((l) => [l.id, l]));

  return repeatGroups.map((g) => ({
    locationId: g.locationId,
    location: g.locationId ? (locationMap.get(g.locationId) ?? null) : null,
    category: g.category,
    count: g._count.id,
  }));
}

// ================================================================
// 임시 비밀번호 생성
// ================================================================

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ================================================================
// getPasswordResetRequests — 비밀번호 재설정 요청 목록 (ADMIN)
// ================================================================

export async function getPasswordResetRequests() {
  const requests = await prisma.passwordResetRequest.findMany({
    where: { status: 'PENDING' },
    select: {
      id: true,
      status: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          loginId: true,
          email: true,
          name: true,
          role: true,
          department: true,
          position: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
  return requests;
}

// ================================================================
// approvePasswordReset — 비밀번호 재설정 승인 (ADMIN)
// ================================================================

export async function approvePasswordReset(requestId: string, adminId: string) {
  const request = await prisma.passwordResetRequest.findFirst({
    where: { id: requestId, status: 'PENDING' },
  });

  if (!request) {
    throw new AppError('해당 요청을 찾을 수 없습니다', 404, true, 'REQUEST_NOT_FOUND');
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: request.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
    }),
  ]);

  return { tempPassword };
}

// ================================================================
// rejectPasswordReset — 비밀번호 재설정 거부 (ADMIN)
// ================================================================

export async function rejectPasswordReset(requestId: string, adminId: string) {
  const request = await prisma.passwordResetRequest.findFirst({
    where: { id: requestId, status: 'PENDING' },
  });

  if (!request) {
    throw new AppError('해당 요청을 찾을 수 없습니다', 404, true, 'REQUEST_NOT_FOUND');
  }

  const updated = await prisma.passwordResetRequest.update({
    where: { id: requestId },
    data: {
      status: 'REJECTED',
      reviewedById: adminId,
      reviewedAt: new Date(),
    },
    select: { id: true, status: true },
  });

  return updated;
}
