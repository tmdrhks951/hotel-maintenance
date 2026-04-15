import { PrismaClient, Role, Position } from '@prisma/client';
import { AppError } from '@/common/errors/AppError';
import { LEADER_POSITIONS } from '@/common/middleware/authorize';
import type { CreateNoticeDto, UpdateNoticeDto } from './notice.dto';

const prisma = new PrismaClient();

/** ADMIN 또는 팀장급인지 여부 */
function isAdminOrLeader(role: Role, position: Position): boolean {
  return role === 'ADMIN' || LEADER_POSITIONS.includes(position);
}

/// [PATCH] 공지사항 목록 모달에서 본문 미노출 → list select에 content 포함
const NOTICE_LIST_SELECT = {
  id: true,
  title: true,
  content: true,
  isPublished: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { id: true, name: true } },
  branch: { select: { id: true, name: true } },
};

const NOTICE_DETAIL_SELECT = {
  ...NOTICE_LIST_SELECT,
  content: true,
};

// ================================================================
// 목록 조회 (인증 사용자 전체)
// ================================================================

export async function getNotices(
  role: Role,
  position: Position,
  branchId: string | null,
) {
  // ADMIN·팀장급은 전체 (미공개 포함), 나머지는 공개+자기 지점만
  const where: Record<string, unknown> = { deletedAt: null };

  if (!isAdminOrLeader(role, position)) {
    where.isPublished = true;
    where.OR = [
      { branchId: null },
      { branchId: branchId },
    ];
  }

  return prisma.notice.findMany({
    where,
    select: NOTICE_LIST_SELECT,
    orderBy: { createdAt: 'desc' },
  });
}

// ================================================================
// 상세 조회
// ================================================================

export async function getNotice(
  id: string,
  role: Role,
  position: Position,
  branchId: string | null,
) {
  const notice = await prisma.notice.findFirst({
    where: { id, deletedAt: null },
    select: NOTICE_DETAIL_SELECT,
  });

  if (!notice) {
    throw new AppError('공지를 찾을 수 없습니다', 404, true, 'NOT_FOUND');
  }

  // ADMIN·팀장급이 아닌 경우: 미공개 또는 다른 지점 공지 접근 불가
  if (!isAdminOrLeader(role, position)) {
    if (!notice.isPublished) {
      throw new AppError('공개되지 않은 공지입니다', 403, true, 'FORBIDDEN');
    }
    if (notice.branch && notice.branch.id !== branchId) {
      throw new AppError('접근 권한이 없습니다', 403, true, 'FORBIDDEN');
    }
  }

  return notice;
}

// ================================================================
// 생성 (ADMIN only)
// ================================================================

export async function createNotice(
  authorId: string,
  dto: CreateNoticeDto,
) {
  if (!dto.title?.trim() || !dto.content?.trim()) {
    throw new AppError('제목과 내용을 입력해주세요', 400, true, 'VALIDATION_ERROR');
  }

  return prisma.notice.create({
    data: {
      title: dto.title.trim(),
      content: dto.content.trim(),
      isPublished: dto.isPublished ?? false,
      authorId,
      branchId: dto.branchId || null,
    },
    select: NOTICE_DETAIL_SELECT,
  });
}

// ================================================================
// 수정 (ADMIN only)
// ================================================================

export async function updateNotice(
  id: string,
  dto: UpdateNoticeDto,
) {
  const existing = await prisma.notice.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) {
    throw new AppError('공지를 찾을 수 없습니다', 404, true, 'NOT_FOUND');
  }

  const data: Record<string, unknown> = {};
  if (dto.title !== undefined) data.title = dto.title.trim();
  if (dto.content !== undefined) data.content = dto.content.trim();
  if (dto.isPublished !== undefined) data.isPublished = dto.isPublished;
  if (dto.branchId !== undefined) data.branchId = dto.branchId || null;

  return prisma.notice.update({
    where: { id },
    data,
    select: NOTICE_DETAIL_SELECT,
  });
}

// ================================================================
// 삭제 — soft delete (ADMIN only)
// ================================================================

export async function deleteNotice(id: string) {
  const existing = await prisma.notice.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) {
    throw new AppError('공지를 찾을 수 없습니다', 404, true, 'NOT_FOUND');
  }

  await prisma.notice.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return { id };
}
