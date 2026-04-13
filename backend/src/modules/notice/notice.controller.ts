import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/common/errors/AppError';
import * as noticeService from './notice.service';
import type { CreateNoticeDto, UpdateNoticeDto } from './notice.dto';

// GET /notices
export async function getNoticesHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user;
    if (!user) { next(new AppError('인증이 필요합니다', 401, true, 'UNAUTHORIZED')); return; }

    const result = await noticeService.getNotices(user.role, user.position, user.branchId);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
}

// GET /notices/:id
export async function getNoticeHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user;
    if (!user) { next(new AppError('인증이 필요합니다', 401, true, 'UNAUTHORIZED')); return; }

    const result = await noticeService.getNotice(req.params.id, user.role, user.position, user.branchId);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
}

// POST /notices
export async function createNoticeHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user;
    if (!user) { next(new AppError('인증이 필요합니다', 401, true, 'UNAUTHORIZED')); return; }

    const dto = req.body as CreateNoticeDto;
    const result = await noticeService.createNotice(user.id, dto);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
}

// PATCH /notices/:id
export async function updateNoticeHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user;
    if (!user) { next(new AppError('인증이 필요합니다', 401, true, 'UNAUTHORIZED')); return; }

    const dto = req.body as UpdateNoticeDto;
    const result = await noticeService.updateNotice(req.params.id, dto);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
}

// DELETE /notices/:id
export async function deleteNoticeHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user;
    if (!user) { next(new AppError('인증이 필요합니다', 401, true, 'UNAUTHORIZED')); return; }

    const result = await noticeService.deleteNotice(req.params.id);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
}
