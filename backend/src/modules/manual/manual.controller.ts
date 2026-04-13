import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/common/errors/AppError';
import * as manualService from './manual.service';
import type { CreateManualDto, UpdateManualDto } from './manual.dto';

// GET /manuals
export async function getManualsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user;
    if (!user) { next(new AppError('인증이 필요합니다', 401, true, 'UNAUTHORIZED')); return; }

    const result = await manualService.getManuals(user.role, user.position, user.branchId);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
}

// GET /manuals/:id
export async function getManualHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user;
    if (!user) { next(new AppError('인증이 필요합니다', 401, true, 'UNAUTHORIZED')); return; }

    const result = await manualService.getManual(req.params.id, user.role, user.position, user.branchId);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
}

// POST /manuals
export async function createManualHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user;
    if (!user) { next(new AppError('인증이 필요합니다', 401, true, 'UNAUTHORIZED')); return; }

    const dto = req.body as CreateManualDto;
    const result = await manualService.createManual(user.id, dto);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
}

// PATCH /manuals/:id
export async function updateManualHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user;
    if (!user) { next(new AppError('인증이 필요합니다', 401, true, 'UNAUTHORIZED')); return; }

    const dto = req.body as UpdateManualDto;
    const result = await manualService.updateManual(req.params.id, dto);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
}

// DELETE /manuals/:id
export async function deleteManualHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user;
    if (!user) { next(new AppError('인증이 필요합니다', 401, true, 'UNAUTHORIZED')); return; }

    const result = await manualService.deleteManual(req.params.id);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
}
