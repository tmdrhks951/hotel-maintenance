import type { Department, NotificationType } from '@prisma/client';
import { prisma } from '@/config/prisma';
import { sseManager } from '@/common/sse/SseManager';
import { DEPARTMENT_BRANCH_CODES } from '@/config/branch-scope';

// ================================================================
// fan-out 입력 타입
// ================================================================

export interface FanOutInput {
  type: NotificationType;
  recipientIds: string[];
  requestId?: string;
  title: string;
  message?: string;
  bundleKey?: string;
}

// ================================================================
// fan-out — recipient 기준으로 Notification 레코드 생성
// ================================================================

export async function fanOut(input: FanOutInput): Promise<void> {
  if (input.recipientIds.length === 0) return;
  const uniqueIds = [...new Set(input.recipientIds)];
  await prisma.notification.createMany({
    data: uniqueIds.map((userId) => ({
      type: input.type,
      userId,
      requestId: input.requestId ?? null,
      title: input.title,
      message: input.message ?? null,
      bundleKey: input.bundleKey ?? null,
    })),
  });

  // SSE 실시간 푸시 — DB 저장 후 연결 중인 사용자에게 즉시 전송
  const pushPayload = {
    type: input.type,
    title: input.title,
    message: input.message,
    requestId: input.requestId,
  };
  uniqueIds.forEach((userId) => {
    sseManager.push(userId, 'notification', pushPayload);
  });
}

// ================================================================
// 수신자 조회 헬퍼 — 지점 접근 범위 기반
// ================================================================

/**
 * 지점 접근 범위(branch-scope)에 따라 알림 수신 대상자를 결정합니다.
 *
 * - OPERATIONS / QC 팀장·부팀장: 부서 담당 지점 목록에 포함된 요청이면 수신
 * - OPERATIONS / QC 팀원:        본인 담당 branchId와 요청 branchId가 일치하면 수신
 * - ADMIN:                       EMERGENCY_SET 타입만 수신 (일반 작업 알림 없음)
 * - VENDOR:                      알림 없음
 */
export async function getNotificationRecipients(
  branchId: string,
  type: NotificationType,
): Promise<string[]> {
  // 요청 지점의 code 조회
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { code: true },
  });
  if (!branch) return [];
  const branchCode = branch.code;

  const users = await prisma.user.findMany({
    where: { isActive: true, deletedAt: null, status: 'APPROVED' },
    select: { id: true, role: true, department: true, position: true, branchId: true, branchIds: true },
  });

  return users
    .filter((user) => {
      // ADMIN: 긴급 알림만
      if (user.role === 'ADMIN') return type === 'EMERGENCY_SET';
      // VENDOR: 알림 없음
      if (user.role !== 'OPERATIONS' && user.role !== 'QC') return false;

      const scope = DEPARTMENT_BRANCH_CODES[user.department as Department] ?? [];
      const isLeader =
        user.position === 'TEAM_LEADER' || user.position === 'DEPUTY_LEADER';

      // 팀장/부팀장: 부서 담당 지점에 포함되면 수신
      if (isLeader) return scope.includes(branchCode);
      // 팀원: 다중 지점 배열 우선, 없으면 단일 branchId로 fallback
      if (user.branchIds.length > 0) return user.branchIds.includes(branchId);
      return user.branchId === branchId;
    })
    .map((u) => u.id);
}

/**
 * 신규 요청 알림 전용 — QC 사용자만 (scope-aware)
 * FACILITY_REQUEST_CREATED는 QC팀에게만 발송합니다.
 */
export async function getQcUserIds(branchId: string): Promise<string[]> {
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { code: true },
  });
  if (!branch) return [];
  const branchCode = branch.code;

  const users = await prisma.user.findMany({
    where: { isActive: true, deletedAt: null, status: 'APPROVED', role: 'QC' },
    select: { id: true, department: true, position: true, branchId: true, branchIds: true },
  });

  return users
    .filter((user) => {
      const scope = DEPARTMENT_BRANCH_CODES[user.department as Department] ?? [];
      const isLeader =
        user.position === 'TEAM_LEADER' || user.position === 'DEPUTY_LEADER';
      if (isLeader) return scope.includes(branchCode);
      if (user.branchIds.length > 0) return user.branchIds.includes(branchId);
      return user.branchId === branchId;
    })
    .map((u) => u.id);
}

// ================================================================
// 알림 목록 조회 (본인 것만)
// ================================================================

export async function getNotifications(userId: string, unreadOnly: boolean) {
  /// [PATCH] 본인 지점 알림만 노출 — branchIds 기반 재필터 (fan-out/응답 구조 불변)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { branchIds: true },
  });
  const myBranchIds = user?.branchIds ?? [];
  const branchFilter =
    myBranchIds.length > 0
      ? {
          OR: [
            { requestId: null }, // 요청과 무관한 시스템 알림은 통과
            { request: { branchId: { in: myBranchIds } } },
          ],
        }
      : {};

  return prisma.notification.findMany({
    where: {
      userId,
      ...(unreadOnly ? { isRead: false } : {}),
      ...branchFilter,
    },
    select: {
      id: true,
      type: true,
      title: true,
      message: true,
      requestId: true,
      bundleKey: true,
      isRead: true,
      readAt: true,
      createdAt: true,
      request: {
        select: { plannedWorkDate: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

// ================================================================
// unread count
// ================================================================

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

// ================================================================
// 읽음 처리 — 본인 것만
// ================================================================

export async function markRead(notificationId: string, userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
}

// ================================================================
// 전체 읽음 처리
// ================================================================

export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
}
