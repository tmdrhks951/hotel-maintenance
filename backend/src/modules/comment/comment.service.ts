import { prisma } from '@/config/prisma';
import { AppError } from '@/common/errors/AppError';
import { fanOut } from '../notification/notification.service';
import type { CreateCommentDto } from './comment.dto';

// ================================================================
// 공통 select
// ================================================================

const COMMENT_SELECT = {
  id: true,
  content: true,
  depth: true,
  requestId: true,
  parentId: true,
  rootId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  author: {
    select: { id: true, name: true, role: true },
  },
} as const;

// ================================================================
// 댓글 조회 (flat list — 프론트에서 트리 빌드)
// ================================================================

export async function getComments(requestId: string) {
  // 요청 존재 확인
  const exists = await prisma.facilityRequest.findUnique({
    where: { id: requestId },
    select: { id: true },
  });
  if (!exists) {
    throw new AppError('요청을 찾을 수 없습니다', 404, true, 'NOT_FOUND');
  }

  return prisma.comment.findMany({
    where: { requestId },
    select: COMMENT_SELECT,
    orderBy: { createdAt: 'asc' },
  });
}

// ================================================================
// 댓글 작성
// ================================================================

export async function createComment(
  requestId: string,
  authorId: string,
  dto: CreateCommentDto,
) {
  const content = dto.content.trim();
  if (!content) {
    throw new AppError('댓글 내용을 입력해주세요', 400, true, 'VALIDATION_ERROR');
  }

  // 요청 존재 확인 + 알림 대상 조회
  const request = await prisma.facilityRequest.findUnique({
    where: { id: requestId },
    select: { id: true, title: true, createdById: true, assignedToId: true },
  });
  if (!request) {
    throw new AppError('요청을 찾을 수 없습니다', 404, true, 'NOT_FOUND');
  }

  let depth = 0;
  let rootId: string | null = null;

  if (dto.parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: dto.parentId },
      select: { id: true, depth: true, rootId: true, requestId: true, deletedAt: true },
    });

    if (!parent || parent.requestId !== requestId) {
      throw new AppError('부모 댓글을 찾을 수 없습니다', 404, true, 'NOT_FOUND');
    }
    if (parent.deletedAt) {
      throw new AppError('삭제된 댓글에는 답글을 달 수 없습니다', 400, true, 'DELETED_PARENT');
    }
    if (parent.depth >= 2) {
      throw new AppError('댓글은 최대 2단계까지만 작성할 수 있습니다', 400, true, 'MAX_DEPTH');
    }

    depth = parent.depth + 1;
    rootId = parent.rootId ?? parent.id;
  }

  const comment = await prisma.comment.create({
    data: {
      content,
      depth,
      requestId,
      authorId,
      parentId: dto.parentId ?? null,
      rootId,
    },
    select: COMMENT_SELECT,
  });

  // 댓글 알림: 요청 생성자 + 담당자 + 기존 댓글 작성자 (본인 제외)
  prisma.comment.findMany({
    where: { requestId, deletedAt: null, authorId: { not: authorId } },
    select: { authorId: true },
    distinct: ['authorId'],
  })
    .then((commenters) => {
      const ids = new Set<string>();
      if (request.createdById && request.createdById !== authorId) ids.add(request.createdById);
      if (request.assignedToId && request.assignedToId !== authorId) ids.add(request.assignedToId);
      commenters.forEach((c) => ids.add(c.authorId));
      if (ids.size === 0) return;
      return fanOut({
        type: 'COMMENT_CREATED',
        recipientIds: [...ids],
        requestId,
        title: `새 답변: ${request.title}`,
        message: content.length > 50 ? content.slice(0, 50) + '…' : content,
      });
    })
    .catch(() => {});

  return comment;
}

// ================================================================
// 댓글 삭제 (soft delete)
// ================================================================

export async function deleteComment(
  commentId: string,
  requestId: string,
  userId: string,
  role: string,
) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, authorId: true, requestId: true, deletedAt: true },
  });

  if (!comment || comment.requestId !== requestId) {
    throw new AppError('댓글을 찾을 수 없습니다', 404, true, 'NOT_FOUND');
  }
  if (comment.deletedAt) {
    throw new AppError('이미 삭제된 댓글입니다', 400, true, 'ALREADY_DELETED');
  }
  if (comment.authorId !== userId && role !== 'ADMIN') {
    throw new AppError('본인의 댓글만 삭제할 수 있습니다', 403, true, 'FORBIDDEN');
  }

  return prisma.comment.update({
    where: { id: commentId },
    data: { deletedAt: new Date() },
    select: { id: true, deletedAt: true },
  });
}
