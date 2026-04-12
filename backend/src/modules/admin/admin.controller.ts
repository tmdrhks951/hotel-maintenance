import { Request, Response, NextFunction } from 'express';
import * as adminService from './admin.service';
import type { AdminFilters } from './admin.service';

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
