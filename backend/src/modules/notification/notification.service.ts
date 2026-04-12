import { NotificationType } from '@prisma/client';
import { prisma } from '@/config/prisma';
import { sseManager } from '@/common/sse/SseManager';

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
// 수신자 조회 헬퍼
// ================================================================

export async function getQcUserIds(branchId: string): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { branchId, role: 'QC', isActive: true, deletedAt: null },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

export async function getOperationsUserIds(branchId: string): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { branchId, role: 'OPERATIONS', isActive: true, deletedAt: null },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

// ================================================================
// 알림 목록 조회 (본인 것만)
// ================================================================

export async function getNotifications(userId: string, unreadOnly: boolean) {
  return prisma.notification.findMany({
    where: {
      userId,
      ...(unreadOnly ? { isRead: false } : {}),
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
