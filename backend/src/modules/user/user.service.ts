import { prisma } from '@/config/prisma';
import { AppError } from '@/common/errors/AppError';
import { hashPassword } from '@/common/utils/password.util';
import type { CreateUserDto, UpdateUserDto, ListUsersQuery } from './user.dto';

// ================================================================
// getMe
// ================================================================

export async function getMe(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      position: true,
      isActive: true,
      branchId: true,
      branch: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new AppError('사용자를 찾을 수 없습니다', 404, true, 'USER_NOT_FOUND');
  }

  if (!user.isActive) {
    throw new AppError('비활성화된 계정입니다. 관리자에게 문의하세요', 403, true, 'ACCOUNT_INACTIVE');
  }

  return user;
}

// ================================================================
// Branch 소속 규칙 검증 유틸
// ================================================================

export function validateBranchAssignment(
  role: string,
  position: string,
  branchId: string | null | undefined,
): void {
  const requiresBranch =
    role === 'QC' || (role === 'OPERATIONS' && position === 'MEMBER');

  if (requiresBranch && !branchId) {
    throw new AppError(
      '해당 역할/직위는 소속 지점이 필요합니다',
      400,
      true,
      'BRANCH_REQUIRED',
    );
  }
}

// ================================================================
// createUser (ADMIN 전용)
// ================================================================

export async function createUser(dto: CreateUserDto) {
  const existing = await prisma.user.findFirst({
    where: { email: dto.email },
  });

  if (existing) {
    throw new AppError('이미 사용 중인 이메일입니다', 409, true, 'EMAIL_CONFLICT');
  }

  const position = dto.position ?? 'MEMBER';

  validateBranchAssignment(dto.role, position, dto.branchId);

  if (dto.branchId) {
    const branch = await prisma.branch.findFirst({
      where: { id: dto.branchId, deletedAt: null },
    });
    if (!branch) {
      throw new AppError('존재하지 않는 지점입니다', 404, true, 'BRANCH_NOT_FOUND');
    }
  }

  const passwordHash = await hashPassword(dto.password);

  const user = await prisma.user.create({
    data: {
      email: dto.email,
      passwordHash,
      name: dto.name,
      role: dto.role,
      position,
      branchId: dto.branchId ?? null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      position: true,
      isActive: true,
      branchId: true,
      branch: { select: { id: true, name: true, code: true } },
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
}

// ================================================================
// listUsers (ADMIN 전용)
// ================================================================

export async function listUsers(query: ListUsersQuery) {
  const where: Record<string, unknown> = { deletedAt: null };

  if (query.role !== undefined) where.role = query.role;
  if (query.branchId !== undefined) where.branchId = query.branchId;
  if (query.isActive !== undefined) where.isActive = query.isActive;

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      position: true,
      isActive: true,
      branchId: true,
      branch: { select: { id: true, name: true, code: true } },
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  return users;
}

// ================================================================
// getUserById (ADMIN 전용)
// ================================================================

export async function getUserById(id: string) {
  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      position: true,
      isActive: true,
      branchId: true,
      branch: { select: { id: true, name: true, code: true } },
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new AppError('사용자를 찾을 수 없습니다', 404, true, 'USER_NOT_FOUND');
  }

  return user;
}

// ================================================================
// updateUser (ADMIN 전용)
// ================================================================

export async function updateUser(id: string, dto: UpdateUserDto) {
  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
  });

  if (!user) {
    throw new AppError('사용자를 찾을 수 없습니다', 404, true, 'USER_NOT_FOUND');
  }

  const newRole = dto.role ?? user.role;
  const newPosition = dto.position ?? user.position;
  const newBranchId = dto.branchId !== undefined ? dto.branchId : user.branchId;

  validateBranchAssignment(newRole, newPosition, newBranchId);

  if (dto.branchId) {
    const branch = await prisma.branch.findFirst({
      where: { id: dto.branchId, deletedAt: null },
    });
    if (!branch) {
      throw new AppError('존재하지 않는 지점입니다', 404, true, 'BRANCH_NOT_FOUND');
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.role !== undefined && { role: dto.role }),
      ...(dto.position !== undefined && { position: dto.position }),
      ...(dto.branchId !== undefined && { branchId: dto.branchId }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      position: true,
      isActive: true,
      branchId: true,
      branch: { select: { id: true, name: true, code: true } },
      createdAt: true,
      updatedAt: true,
    },
  });

  return updated;
}

// ================================================================
// deactivateUser (soft delete — ADMIN 전용)
// ================================================================

export async function deactivateUser(id: string) {
  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
  });

  if (!user) {
    throw new AppError('사용자를 찾을 수 없습니다', 404, true, 'USER_NOT_FOUND');
  }

  await prisma.user.update({
    where: { id },
    data: { isActive: false, deletedAt: new Date() },
  });
}

// ================================================================
// getAssignableUsers — STEP 6: 담당자 배정 후보 조회
//
// branchId에 속한 활성 사용자 목록 반환.
// QC/ADMIN이 담당자를 배정할 때 후보 목록으로 사용.
// ================================================================

export async function getAssignableUsers(branchId: string) {
  const users = await prisma.user.findMany({
    where: {
      branchId,
      isActive: true,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      role: true,
      position: true,
      email: true,
    },
    orderBy: { name: 'asc' },
  });

  return users;
}
