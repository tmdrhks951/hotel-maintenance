import { Request, Response, NextFunction } from 'express';
import * as adminService from './admin.service';
import type { AdminFilters } from './admin.service';
import { AppError } from '@/common/errors/AppError';

// ================================================================
// 쿼리 파라미터 → AdminFilters 변환
// ================================================================

function parseFilters(req: Request): AdminFilters {
  const { branchId, startDate, endDate } = req.query;
  return {
    branchId: typeof branchId === 'string' && branchId ? branchId : undefined,
    startDate: typeof startDate === 'string' && startDate ? new Date(startDate) : undefined,
    endDate: typeof endDate === 'string' && endDate ? new Date(endDate) : undefined,
  };
}

// ================================================================
// GET /admin/kpi/summary
// ================================================================

export async function getKpiSummaryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await adminService.getKpiSummary(parseFilters(req));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// ================================================================
// GET /admin/exceptions/aging
// ================================================================

export async function getAgingRequestsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await adminService.getAgingRequests(parseFilters(req));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// ================================================================
// GET /admin/exceptions/reopened
// ================================================================

export async function getReopenedRequestsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await adminService.getReopenedRequests(parseFilters(req));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// ================================================================
// GET /admin/exceptions/repeat-issues
// ================================================================

export async function getRepeatIssuesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await adminService.getRepeatIssues(parseFilters(req));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/admin/password-reset-requests
export async function getPasswordResetRequestsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const requests = await adminService.getPasswordResetRequests();
    res.status(200).json({ success: true, data: requests });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/v1/admin/password-reset-requests/:id/approve
export async function approvePasswordResetHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new AppError('인증이 필요합니다', 401, true, 'UNAUTHORIZED'));
      return;
    }
    const result = await adminService.approvePasswordReset(req.params.id, req.user.id);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/v1/admin/password-reset-requests/:id/reject
export async function rejectPasswordResetHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new AppError('인증이 필요합니다', 401, true, 'UNAUTHORIZED'));
      return;
    }
    const result = await adminService.rejectPasswordReset(req.params.id, req.user.id);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
