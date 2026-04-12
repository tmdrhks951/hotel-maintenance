import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/common/errors/AppError';
import * as scheduleService from './recurring-schedule.service';

// ================================================================
// GET /recurring-schedules
// ================================================================

export async function listSchedulesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const branchId = typeof req.query.branchId === 'string' ? req.query.branchId : undefined;
    const data = await scheduleService.listSchedules(branchId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// ================================================================
// GET /recurring-schedules/:id
// ================================================================

export async function getScheduleHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await scheduleService.getScheduleById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// ================================================================
// POST /recurring-schedules
// ================================================================

export async function createScheduleHandler(
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

    const { title, description, category, recurrence, recurrenceDay, recurrenceTime, branchId, locationId } = req.body;

    if (!title || !recurrence || !branchId) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'title, recurrence, branchId는 필수입니다' },
      });
      return;
    }

    const data = await scheduleService.createSchedule(
      { title, description, category, recurrence, recurrenceDay, recurrenceTime, branchId, locationId },
      user.id,
    );
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// ================================================================
// PATCH /recurring-schedules/:id
// ================================================================

export async function updateScheduleHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await scheduleService.updateSchedule(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// ================================================================
// DELETE /recurring-schedules/:id  (soft delete)
// ================================================================

export async function deleteScheduleHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await scheduleService.deleteSchedule(req.params.id);
    res.json({ success: true, data: { message: '삭제되었습니다' } });
  } catch (err) {
    next(err);
  }
}

// ================================================================
// POST /recurring-schedules/generate  (수동 트리거)
// ================================================================

export async function generateHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await scheduleService.generateScheduledRequests();
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
