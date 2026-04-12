import { Request, Response, NextFunction } from 'express';
import { RequestCategory } from '@prisma/client';
import { AppError } from '@/common/errors/AppError';
import * as facilityRequestService from './facility-request.service';
import type { QcReviewDto, UpdateScheduleDto, AssignWorkerDto, CompleteWorkDto, QcVerifyDto, OperationsConfirmDto, UpdateFacilityRequestDto, ReopenFacilityRequestDto } from './facility-request.dto';

// ================================================================
// GET /api/v1/facility-requests/duplicate-check
// ================================================================

export async function duplicateCheckHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { branchId, locationId } = req.query;

    if (!branchId || typeof branchId !== 'string') {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'branchId는 필수입니다' },
      });
      return;
    }

    const result = await facilityRequestService.checkDuplicates(
      branchId,
      typeof locationId === 'string' ? locationId : undefined,
    );

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ================================================================
// GET /api/v1/facility-requests/qc-queue  (STEP 6)
// ================================================================

export async function getQcQueueHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      next(new AppError('인증이 필요합니다', 401, true, 'UNAUTHORIZED'));
      return;
    }

    const filterBranchId =
      typeof req.query.branchId === 'string' ? req.query.branchId : undefined;

    const result = await facilityRequestService.getQcQueue(
      user.role,
      user.branchId,
      filterBranchId,
    );

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ================================================================
// GET /api/v1/facility-requests/:id  (STEP 6)
// ================================================================

export async function getFacilityRequestDetailHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      next(new AppError('인증이 필요합니다', 401, true, 'UNAUTHORIZED'));
      return;
    }

    const result = await facilityRequestService.getFacilityRequestDetail(
      req.params.id,
      user.role,
      user.branchId,
    );

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ================================================================
// POST /api/v1/facility-requests  (STEP 5)
// ================================================================

export async function createFacilityRequestHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      next(new AppError('인증이 필요합니다', 401, true, 'UNAUTHORIZED'));
      return;
    }

    const { branchId, locationId, category, description } = req.body as {
      branchId?: string;
      locationId?: string;
      category?: string;
      description?: string;
    };

    if (!branchId || !category || !description) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'branchId, category, description은 필수입니다',
        },
      });
      return;
    }

    if (!Object.values(RequestCategory).includes(category as RequestCategory)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `category는 ${Object.values(RequestCategory).join(', ')} 중 하나여야 합니다`,
        },
      });
      return;
    }

    if (description.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '설명을 입력해주세요' },
      });
      return;
    }

    const result = await facilityRequestService.createFacilityRequest(
      user.id,
      user.role,
      user.position,
      user.branchId,
      {
        branchId,
        locationId: locationId || undefined,
        category: category as RequestCategory,
        description: description.trim(),
      },
      req.file,
    );

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ================================================================
// PATCH /api/v1/facility-requests/:id/qc-review  (STEP 6)
// ================================================================

export async function qcReviewHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      next(new AppError('인증이 필요합니다', 401, true, 'UNAUTHORIZED'));
      return;
    }

    const dto = req.body as QcReviewDto;

    const result = await facilityRequestService.qcReview(
      req.params.id,
      user.id,
      user.role,
      user.branchId,
      dto,
    );

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ================================================================
// PATCH /api/v1/facility-requests/:id/schedule  (STEP 6)
// ================================================================

export async function updateScheduleHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      next(new AppError('인증이 필요합니다', 401, true, 'UNAUTHORIZED'));
      return;
    }

    const dto = req.body as UpdateScheduleDto;

    if (!dto.plannedWorkDate) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'plannedWorkDate는 필수입니다' },
      });
      return;
    }

    const result = await facilityRequestService.updateSchedule(
      req.params.id,
      user.id,
      user.role,
      user.branchId,
      dto,
    );

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ================================================================
// POST /api/v1/facility-requests/:id/complete  (STEP 7)
// ================================================================

export async function completeWorkHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      next(new AppError('인증이 필요합니다', 401, true, 'UNAUTHORIZED'));
      return;
    }

    const { workAction, workItem, generatedText, note } = req.body as {
      workAction?: string;
      workItem?: string;
      generatedText?: string;
      note?: string;
    };

    if (!workAction || !workItem || !generatedText) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'workAction, workItem, generatedText는 필수입니다',
        },
      });
      return;
    }

    const dto: CompleteWorkDto = { workAction, workItem, generatedText, note };

    const result = await facilityRequestService.completeWork(
      req.params.id,
      user.id,
      user.role,
      user.branchId,
      dto,
      req.file,
    );

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ================================================================
// PATCH /api/v1/facility-requests/:id/assign  (STEP 6)
// ================================================================

export async function assignWorkerHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      next(new AppError('인증이 필요합니다', 401, true, 'UNAUTHORIZED'));
      return;
    }

    const dto = req.body as AssignWorkerDto;

    if (!dto.assignedToId) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'assignedToId는 필수입니다' },
      });
      return;
    }

    const result = await facilityRequestService.assignWorker(
      req.params.id,
      user.id,
      user.role,
      user.branchId,
      dto,
    );

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ================================================================
// GET /api/v1/facility-requests/qc-completed  (STEP 8)
// ================================================================

export async function getQcCompletedHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      next(new AppError('인증이 필요합니다', 401, true, 'UNAUTHORIZED'));
      return;
    }

    const filterBranchId =
      typeof req.query.branchId === 'string' ? req.query.branchId : undefined;

    const result = await facilityRequestService.getQcCompleted(
      user.role,
      user.branchId,
      filterBranchId,
    );

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ================================================================
// PATCH /api/v1/facility-requests/:id/qc-verify  (STEP 8)
// ================================================================

export async function qcVerifyHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      next(new AppError('인증이 필요합니다', 401, true, 'UNAUTHORIZED'));
      return;
    }

    const dto = req.body as QcVerifyDto;

    if (!dto.action || !['VERIFY', 'REOPEN'].includes(dto.action)) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'action은 VERIFY 또는 REOPEN이어야 합니다' },
      });
      return;
    }

    const result = await facilityRequestService.qcVerify(
      req.params.id,
      user.id,
      user.role,
      user.branchId,
      dto,
    );

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ================================================================
// GET /api/v1/facility-requests/operations-pending  (STEP 8)
// ================================================================

export async function getOperationsPendingHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      next(new AppError('인증이 필요합니다', 401, true, 'UNAUTHORIZED'));
      return;
    }

    const filterBranchId =
      typeof req.query.branchId === 'string' ? req.query.branchId : undefined;

    const result = await facilityRequestService.getOperationsPending(
      user.role,
      user.branchId,
      filterBranchId,
    );

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ================================================================
// PATCH /api/v1/facility-requests/:id/operations-confirm  (STEP 8)
// ================================================================

export async function operationsConfirmHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      next(new AppError('인증이 필요합니다', 401, true, 'UNAUTHORIZED'));
      return;
    }

    const dto = req.body as OperationsConfirmDto;

    const result = await facilityRequestService.operationsConfirm(
      req.params.id,
      user.id,
      user.role,
      user.branchId,
      dto,
    );

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ================================================================
// GET /api/v1/facility-requests/qc-history  (STEP 9)
// ================================================================

export async function getQcHistoryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      next(new AppError('인증이 필요합니다', 401, true, 'UNAUTHORIZED'));
      return;
    }

    const filterBranchId =
      typeof req.query.branchId === 'string' ? req.query.branchId : undefined;

    const result = await facilityRequestService.getQcHistory(
      user.role,
      user.branchId,
      filterBranchId,
    );

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ================================================================
// GET /api/v1/facility-requests/operations-dashboard
// ================================================================

export async function getOperationsDashboardHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      next(new AppError('인증이 필요합니다', 401, true, 'UNAUTHORIZED'));
      return;
    }

    const filterBranchId =
      typeof req.query.branchId === 'string' ? req.query.branchId : undefined;

    const result = await facilityRequestService.getOperationsDashboard(
      user.role,
      user.branchId,
      filterBranchId,
    );

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ================================================================
// GET /api/v1/facility-requests/work-history
// ================================================================

export async function getWorkHistoryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      next(new AppError('인증이 필요합니다', 401, true, 'UNAUTHORIZED'));
      return;
    }

    const result = await facilityRequestService.getWorkHistory(
      user.role,
      user.branchId,
      {
        date: typeof req.query.date === 'string' ? req.query.date : undefined,
        startDate: typeof req.query.startDate === 'string' ? req.query.startDate : undefined,
        endDate: typeof req.query.endDate === 'string' ? req.query.endDate : undefined,
        keyword: typeof req.query.keyword === 'string' ? req.query.keyword : undefined,
        filterBranchId: typeof req.query.branchId === 'string' ? req.query.branchId : undefined,
      },
    );

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ================================================================
// PATCH /api/v1/facility-requests/:id  (수정)
// ================================================================

export async function updateFacilityRequestHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      next(new AppError('인증이 필요합니다', 401, true, 'UNAUTHORIZED'));
      return;
    }

    const dto = req.body as UpdateFacilityRequestDto;

    const result = await facilityRequestService.updateFacilityRequest(
      req.params.id,
      user.id,
      user.role,
      user.position,
      user.branchId,
      dto,
    );

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ================================================================
// PATCH /api/v1/facility-requests/:id/reopen  (STEP 11)
// ================================================================

export async function reopenFacilityRequestHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      next(new AppError('인증이 필요합니다', 401, true, 'UNAUTHORIZED'));
      return;
    }

    const dto = req.body as ReopenFacilityRequestDto;

    if (!dto.reason?.trim()) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '재오픈 사유를 입력해주세요' },
      });
      return;
    }

    const result = await facilityRequestService.reopenFacilityRequest(
      req.params.id,
      user.id,
      user.role,
      user.branchId,
      dto,
    );

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ================================================================
// DELETE /api/v1/facility-requests/:id  (삭제)
// ================================================================

export async function deleteFacilityRequestHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      next(new AppError('인증이 필요합니다', 401, true, 'UNAUTHORIZED'));
      return;
    }

    const result = await facilityRequestService.deleteFacilityRequest(
      req.params.id,
      user.role,
      user.position,
      user.branchId,
    );

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
