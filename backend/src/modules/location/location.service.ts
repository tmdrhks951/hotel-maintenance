import { prisma } from '@/config/prisma';
import { AppError } from '@/common/errors/AppError';
import type { CreateLocationDto, UpdateLocationDto, ListLocationsQuery } from './location.dto';

// ================================================================
// 내부 유틸: 접근 가능한 Branch인지 검증
// ================================================================

async function assertBranchAccessible(branchId: string): Promise<void> {
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, deletedAt: null },
  });
  if (!branch) {
    throw new AppError('지점을 찾을 수 없습니다', 404, true, 'BRANCH_NOT_FOUND');
  }
}

// ================================================================
// listLocations
// ================================================================

export async function listLocations(branchId: string, query: ListLocationsQuery) {
  await assertBranchAccessible(branchId);

  const where: Record<string, unknown> = {
    branchId,
    deletedAt: null,
  };

  if (query.type !== undefined) where.type = query.type;
  if (query.isActive !== undefined) where.isActive = query.isActive;

  const locations = await prisma.location.findMany({
    where,
    select: {
      id: true,
      name: true,
      code: true,
      type: true,
      isActive: true,
      branchId: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  });

  return locations;
}

// ================================================================
// getLocation
// ================================================================

export async function getLocation(locationId: string) {
  const location = await prisma.location.findFirst({
    where: { id: locationId, deletedAt: null },
    select: {
      id: true,
      name: true,
      code: true,
      type: true,
      isActive: true,
      branchId: true,
      branch: { select: { id: true, name: true, code: true } },
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!location) {
    throw new AppError('위치를 찾을 수 없습니다', 404, true, 'LOCATION_NOT_FOUND');
  }

  return location;
}

// ================================================================
// createLocation (ADMIN 전용)
// ================================================================

export async function createLocation(branchId: string, dto: CreateLocationDto) {
  await assertBranchAccessible(branchId);

  // code가 있을 때만 (branchId, code) 중복 체크
  // Prisma @@unique([branchId, code])는 code=null인 경우 unique 제약 미적용
  // (PostgreSQL NULL != NULL 규칙) → application 레벨에서 추가 검증 불필요
  if (dto.code) {
    const existing = await prisma.location.findFirst({
      where: { branchId, code: dto.code, deletedAt: null },
    });
    if (existing) {
      throw new AppError(
        `해당 지점에 이미 동일한 코드(${dto.code})의 위치가 존재합니다`,
        409,
        true,
        'LOCATION_CODE_CONFLICT',
      );
    }
  }

  const location = await prisma.location.create({
    data: {
      name: dto.name,
      type: dto.type,
      code: dto.code ?? null,
      branchId,
    },
    select: {
      id: true,
      name: true,
      code: true,
      type: true,
      isActive: true,
      branchId: true,
      branch: { select: { id: true, name: true, code: true } },
      createdAt: true,
      updatedAt: true,
    },
  });

  return location;
}

// ================================================================
// updateLocation (ADMIN 전용)
// ================================================================

export async function updateLocation(locationId: string, dto: UpdateLocationDto) {
  const location = await prisma.location.findFirst({
    where: { id: locationId, deletedAt: null },
  });

  if (!location) {
    throw new AppError('위치를 찾을 수 없습니다', 404, true, 'LOCATION_NOT_FOUND');
  }

  // code 변경 시 해당 지점 내 중복 체크
  if (dto.code !== undefined && dto.code !== location.code) {
    if (dto.code) {
      const existing = await prisma.location.findFirst({
        where: {
          branchId: location.branchId,
          code: dto.code,
          deletedAt: null,
          NOT: { id: locationId },
        },
      });
      if (existing) {
        throw new AppError(
          `해당 지점에 이미 동일한 코드(${dto.code})의 위치가 존재합니다`,
          409,
          true,
          'LOCATION_CODE_CONFLICT',
        );
      }
    }
  }

  const updated = await prisma.location.update({
    where: { id: locationId },
    data: {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.code !== undefined && { code: dto.code || null }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    },
    select: {
      id: true,
      name: true,
      code: true,
      type: true,
      isActive: true,
      branchId: true,
      branch: { select: { id: true, name: true, code: true } },
      createdAt: true,
      updatedAt: true,
    },
  });

  return updated;
}
