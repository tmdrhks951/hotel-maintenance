import { PrismaClient, Role, Position } from '@prisma/client';
import { AppError } from '@/common/errors/AppError';
import { LEADER_POSITIONS } from '@/common/middleware/authorize';
import type { CreateManualDto, UpdateManualDto } from './manual.dto';

const prisma = new PrismaClient();

/** ADMIN 또는 팀장급인지 여부 */
function isAdminOrLeader(role: Role, position: Position): boolean {
  return role === 'ADMIN' || LEADER_POSITIONS.includes(position);
}

const MANUAL_LIST_SELECT = {
  id: true,
  title: true,
  isPublished: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { id: true, name: true } },
  branch: { select: { id: true, name: true } },
};

const MANUAL_DETAIL_SELECT = {
  ...MANUAL_LIST_SELECT,
  content: true,
};

// ================================================================
// 목록 조회 (인증 사용자 전체)
// ================================================================

export async function getManuals(
  role: Role,
  position: Position,
  branchId: string | null,
) {
  const where: Record<string, unknown> = { deletedAt: null };

  if (!isAdminOrLeader(role, position)) {
    where.isPublished = true;
    where.OR = [
      { branchId: null },
      { branchId: branchId },
    ];
  }

  return prisma.manual.findMany({
    where,
    select: MANUAL_LIST_SELECT,
    orderBy: { createdAt: 'desc' },
  });
}

// ================================================================
// 상세 조회
// ================================================================

export async function getManual(
  id: string,
  role: Role,
  position: Position,
  branchId: string | null,
) {
  const manual = await prisma.manual.findFirst({
    where: { id, deletedAt: null },
    select: MANUAL_DETAIL_SELECT,
  });

  if (!manual) {
    throw new AppError('매뉴얼을 찾을 수 없습니다', 404, true, 'NOT_FOUND');
  }

  if (!isAdminOrLeader(role, position)) {
    if (!manual.isPublished) {
      throw new AppError('공개되지 않은 매뉴얼입니다', 403, true, 'FORBIDDEN');
    }
    if (manual.branch && manual.branch.id !== branchId) {
      throw new AppError('접근 권한이 없습니다', 403, true, 'FORBIDDEN');
    }
  }

  return manual;
}

// ================================================================
// 생성 (ADMIN only)
// ================================================================

export async function createManual(
  authorId: string,
  dto: CreateManualDto,
) {
  if (!dto.title?.trim() || !dto.content?.trim()) {
    throw new AppError('제목과 내용을 입력해주세요', 400, true, 'VALIDATION_ERROR');
  }

  return prisma.manual.create({
    data: {
      title: dto.title.trim(),
      content: dto.content.trim(),
      isPublished: dto.isPublished ?? false,
      authorId,
      branchId: dto.branchId || null,
    },
    select: MANUAL_DETAIL_SELECT,
  });
}

// ================================================================
// 수정 (ADMIN only)
// ================================================================

export async function updateManual(
  id: string,
  dto: UpdateManualDto,
) {
  const existing = await prisma.manual.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) {
    throw new AppError('매뉴얼을 찾을 수 없습니다', 404, true, 'NOT_FOUND');
  }

  const data: Record<string, unknown> = {};
  if (dto.title !== undefined) data.title = dto.title.trim();
  if (dto.content !== undefined) data.content = dto.content.trim();
  if (dto.isPublished !== undefined) data.isPublished = dto.isPublished;
  if (dto.branchId !== undefined) data.branchId = dto.branchId || null;

  return prisma.manual.update({
    where: { id },
    data,
    select: MANUAL_DETAIL_SELECT,
  });
}

// ================================================================
// 삭제 — soft delete (ADMIN only)
// ================================================================

export async function deleteManual(id: string) {
  const existing = await prisma.manual.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) {
    throw new AppError('매뉴얼을 찾을 수 없습니다', 404, true, 'NOT_FOUND');
  }

  await prisma.manual.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return { id };
}
