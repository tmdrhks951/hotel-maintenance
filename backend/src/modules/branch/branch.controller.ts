import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/common/errors/AppError';
import * as branchService from './branch.service';
import type { CreateBranchDto, UpdateBranchDto } from './branch.dto';

// ================================================================
// 접근 제어 헬퍼
// ================================================================

/**
 * 단일 지점 접근(GET /:id 등)에서 MEMBER·OTHER가
 * 본인 소속 지점 외 접근하는 것을 차단한다.
 *
 * 규칙:
 *   - ADMIN: 항상 허용
 *   - TEAM_LEADER / DEPUTY_LEADER: 항상 허용
 *   - MEMBER / OTHER: 본인 branchId와 일치해야 허용
 */
function assertBranchAccess(req: Request, branchId: string): void {
  const user = req.user!;
  if (user.role === 'ADMIN') return;
  if (user.position === 'TEAM_LEADER' || user.position === 'DEPUTY_LEADER') return;
  // branchIds 배열에 포함되어 있으면 허용
  if (user.branchIds.includes(branchId)) return;
  throw new AppError('해당 지점에 접근 권한이 없습니다', 403, true, 'FORBIDDEN');
}

/**
 * 목록 조회 시 MEMBER·OTHER에게 적용할 branchIds 필터를 반환한다.
 * ADMIN·TEAM_LEADER·DEPUTY_LEADER는 undefined(전체 조회).
 */
function getBranchIdsFilter(req: Request): string[] | undefined {
  const user = req.user!;
  if (user.role === 'ADMIN') return undefined;
  if (user.position === 'TEAM_LEADER' || user.position === 'DEPUTY_LEADER') return undefined;
  return user.branchIds.length > 0 ? user.branchIds : undefined;
}

// ================================================================
// GET /api/v1/branches
// ================================================================

export async function listBranchesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    let isActive: boolean | undefined;
    if (req.query.isActive === 'true') isActive = true;
    else if (req.query.isActive === 'false') isActive = false;

    const branches = await branchService.listBranches({
      isActive,
      branchIdsFilter: getBranchIdsFilter(req),
    });
    res.status(200).json({ success: true, data: branches });
  } catch (err) {
    next(err);
  }
}

// ================================================================
// GET /api/v1/branches/:id
// ================================================================

export async function getBranchHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    assertBranchAccess(req, req.params.id);
    const branch = await branchService.getBranch(req.params.id);
    res.status(200).json({ success: true, data: branch });
  } catch (err) {
    next(err);
  }
}

// ================================================================
// POST /api/v1/branches — ADMIN 전용
// ================================================================

export async function createBranchHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dto = req.body as CreateBranchDto;

    if (!dto.name || !dto.code) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'name과 code는 필수입니다' },
      });
      return;
    }

    const branch = await branchService.createBranch(dto);
    res.status(201).json({ success: true, data: branch });
  } catch (err) {
    next(err);
  }
}

// ================================================================
// PATCH /api/v1/branches/:id — ADMIN 전용
// ================================================================

export async function updateBranchHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dto = req.body as UpdateBranchDto;
    const branch = await branchService.updateBranch(req.params.id, dto);
    res.status(200).json({ success: true, data: branch });
  } catch (err) {
    next(err);
  }
}

// ================================================================
// DELETE /api/v1/branches/:id — ADMIN 전용
// ================================================================

export async function deleteBranchHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await branchService.deleteBranch(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
