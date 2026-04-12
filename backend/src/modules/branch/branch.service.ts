import { prisma } from '@/config/prisma';
import { AppError } from '@/common/errors/AppError';
import type { CreateBranchDto, UpdateBranchDto, ListBranchesQuery } from './branch.dto';

// ================================================================
// listBranches
// ================================================================

export async function listBranches(query: ListBranchesQuery) {
  const where: Record<string, unknown> = { deletedAt: null };

  if (query.isActive !== undefined) where.isActive = query.isActive;

  // MEMBER 등 단일 지점 접근자 → 본인 branchId만 조회
  if (query.branchIdFilter) where.id = query.branchIdFilter;

  // 최상위(parentId=null)만 조회, children도 함께 가져옴
  if (!query.branchIdFilter) {
    where.parentId = null;
  }

  const branches = await prisma.branch.findMany({
    where,
    select: {
      id: true,
      name: true,
      code: true,
      address: true,
      isActive: true,
      parentId: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { users: true, locations: true } },
      children: {
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          code: true,
          address: true,
          isActive: true,
          parentId: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { users: true, locations: true } },
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: { sortOrder: 'asc' },
  });

  return branches;
}

// ================================================================
// getBranch
// ================================================================

export async function getBranch(id: string) {
  const branch = await prisma.branch.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      name: true,
      code: true,
      address: true,
      isActive: true,
      parentId: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { users: true, locations: true } },
      children: {
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          code: true,
          isActive: true,
          parentId: true,
          _count: { select: { users: true, locations: true } },
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!branch) {
    throw new AppError('지점을 찾을 수 없습니다', 404, true, 'BRANCH_NOT_FOUND');
  }

  return branch;
}

// ================================================================
// createBranch (ADMIN 전용)
// ================================================================

export async function createBranch(dto: CreateBranchDto) {
  const existing = await prisma.branch.findUnique({ where: { code: dto.code } });

  if (existing) {
    throw new AppError('이미 사용 중인 지점 코드입니다', 409, true, 'BRANCH_CODE_CONFLICT');
  }

  const branch = await prisma.branch.create({
    data: {
      name: dto.name,
      code: dto.code,
      address: dto.address ?? null,
    },
    select: {
      id: true,
      name: true,
      code: true,
      address: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return branch;
}

// ================================================================
// updateBranch (ADMIN 전용)
// ================================================================

export async function updateBranch(id: string, dto: UpdateBranchDto) {
  const branch = await prisma.branch.findFirst({ where: { id, deletedAt: null } });

  if (!branch) {
    throw new AppError('지점을 찾을 수 없습니다', 404, true, 'BRANCH_NOT_FOUND');
  }

  const updated = await prisma.branch.update({
    where: { id },
    data: {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.address !== undefined && { address: dto.address }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    },
    select: {
      id: true,
      name: true,
      code: true,
      address: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updated;
}

// ================================================================
// deleteBranch — soft delete (ADMIN 전용)
// ================================================================

export async function deleteBranch(id: string) {
  const branch = await prisma.branch.findFirst({ where: { id, deletedAt: null } });

  if (!branch) {
    throw new AppError('지점을 찾을 수 없습니다', 404, true, 'BRANCH_NOT_FOUND');
  }

  const activeUserCount = await prisma.user.count({
    where: { branchId: id, isActive: true, deletedAt: null },
  });

  if (activeUserCount > 0) {
    throw new AppError(
      `소속 활성 사용자가 ${activeUserCount}명 있어 지점을 삭제할 수 없습니다`,
      409,
      true,
      'BRANCH_HAS_ACTIVE_USERS',
    );
  }

  await prisma.branch.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });
}
