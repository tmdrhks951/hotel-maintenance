import { Request, Response, NextFunction } from 'express';
import { Role, Position } from '@prisma/client';
import { AppError } from '@/common/errors/AppError';
import * as userService from './user.service';
import type { CreateUserDto, UpdateUserDto, ListUsersQuery } from './user.dto';

// GET /api/v1/users/me
export async function getMeHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new AppError('인증이 필요합니다', 401, true, 'UNAUTHORIZED'));
      return;
    }

    const user = await userService.getMe(req.user.id);
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/users
export async function createUserHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dto = req.body as CreateUserDto;

    if (!dto.email || !dto.password || !dto.name || !dto.role) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'email, password, name, role은 필수입니다' },
      });
      return;
    }

    if (!Object.values(Role).includes(dto.role)) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: `role은 ${Object.values(Role).join(', ')} 중 하나여야 합니다` },
      });
      return;
    }

    if (dto.position && !Object.values(Position).includes(dto.position)) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: `position은 ${Object.values(Position).join(', ')} 중 하나여야 합니다` },
      });
      return;
    }

    const user = await userService.createUser(dto);
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/users
export async function listUsersHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query: ListUsersQuery = {};

    if (req.query.role && Object.values(Role).includes(req.query.role as Role)) {
      query.role = req.query.role as Role;
    }
    if (req.query.branchId && typeof req.query.branchId === 'string') {
      query.branchId = req.query.branchId;
    }
    if (req.query.isActive === 'true') query.isActive = true;
    else if (req.query.isActive === 'false') query.isActive = false;

    const users = await userService.listUsers(query);
    res.status(200).json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/users/:id
export async function getUserByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await userService.getUserById(req.params.id);
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/v1/users/:id
export async function updateUserHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dto = req.body as UpdateUserDto;
    const user = await userService.updateUser(req.params.id, dto);
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/v1/users/:id
export async function deactivateUserHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await userService.deactivateUser(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/users/assignable?branchId=  (STEP 6)
export async function getAssignableUsersHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { branchId } = req.query;

    if (!branchId || typeof branchId !== 'string') {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'branchId는 필수입니다' },
      });
      return;
    }

    const users = await userService.getAssignableUsers(branchId);
    res.status(200).json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/users/pending
export async function listPendingUsersHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const users = await userService.listPendingUsers();
    res.status(200).json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/v1/users/:id/approve
export async function approveUserHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await userService.approveUser(req.params.id);
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/v1/users/:id/reject
export async function rejectUserHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await userService.rejectUser(req.params.id);
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}
