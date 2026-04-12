import { Request, Response, NextFunction } from 'express';
import { LocationType } from '@prisma/client';
import { AppError } from '@/common/errors/AppError';
import * as locationService from './location.service';
import type { CreateLocationDto, UpdateLocationDto, ListLocationsQuery } from './location.dto';

// ================================================================
// 접근 제어 헬퍼
// ================================================================

/**
 * 요청한 사용자가 해당 branchId에 접근 가능한지 확인한다.
 *
 * 규칙:
 *   - ADMIN: 항상 허용
 *   - TEAM_LEADER / DEPUTY_LEADER: 항상 허용 (팀 전체 지점 접근)
 *   - MEMBER / OTHER: 본인 소속 branchId와 일치해야 허용
 */
function assertBranchAccess(req: Request, branchId: string): void {
  const user = req.user!;
  if (user.role === 'ADMIN') return;
  if (user.position === 'TEAM_LEADER' || user.position === 'DEPUTY_LEADER') return;
  if (user.branchId !== branchId) {
    throw new AppError('해당 지점에 접근 권한이 없습니다', 403, true, 'FORBIDDEN');
  }
}

// ================================================================
// GET /api/v1/branches/:branchId/locations
// ================================================================

export async function listLocationsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    assertBranchAccess(req, req.params.branchId);

    const query: ListLocationsQuery = {};
    const { type, isActive } = req.query;

    if (type && Object.values(LocationType).includes(type as LocationType)) {
      query.type = type as LocationType;
    }
    if (isActive === 'true') query.isActive = true;
    else if (isActive === 'false') query.isActive = false;

    const locations = await locationService.listLocations(req.params.branchId, query);
    res.status(200).json({ success: true, data: locations });
  } catch (err) {
    next(err);
  }
}

// ================================================================
// POST /api/v1/branches/:branchId/locations
// ================================================================

export async function createLocationHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dto = req.body as CreateLocationDto;

    if (!dto.name || !dto.type) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'name과 type은 필수입니다' },
      });
      return;
    }

    if (!Object.values(LocationType).includes(dto.type)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `type은 ${Object.values(LocationType).join(', ')} 중 하나여야 합니다`,
        },
      });
      return;
    }

    const location = await locationService.createLocation(req.params.branchId, dto);
    res.status(201).json({ success: true, data: location });
  } catch (err) {
    next(err);
  }
}

// ================================================================
// GET /api/v1/locations/:locationId
// ================================================================

export async function getLocationHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const location = await locationService.getLocation(req.params.locationId);
    // 조회 결과로 branchId를 알 수 있으므로 접근 제어 후처리
    assertBranchAccess(req, location.branchId);
    res.status(200).json({ success: true, data: location });
  } catch (err) {
    next(err);
  }
}

// ================================================================
// PATCH /api/v1/locations/:locationId
// ================================================================

export async function updateLocationHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // 먼저 위치 조회 → branchId로 접근 제어
    const existing = await locationService.getLocation(req.params.locationId);
    assertBranchAccess(req, existing.branchId);

    // ADMIN만 수정 허용
    if (req.user!.role !== 'ADMIN') {
      next(new AppError('접근 권한이 없습니다', 403, true, 'FORBIDDEN'));
      return;
    }

    const dto = req.body as UpdateLocationDto;
    const location = await locationService.updateLocation(req.params.locationId, dto);
    res.status(200).json({ success: true, data: location });
  } catch (err) {
    next(err);
  }
}
