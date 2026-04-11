import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '@/common/middleware/authenticate';
import { authorize } from '@/common/middleware/authorize';
import {
  getMeHandler,
  createUserHandler,
  listUsersHandler,
  getUserByIdHandler,
  updateUserHandler,
  deactivateUserHandler,
  getAssignableUsersHandler,
} from './user.controller';

const router = Router();

// GET /api/v1/users/me — 본인 정보 (인증만 필요)
router.get('/me', authenticate, getMeHandler);

// GET /api/v1/users/assignable — STEP 6: 담당자 후보 조회 (QC/ADMIN)
// /me, /assignable 를 /:id 앞에 배치
router.get('/assignable', authenticate, authorize(Role.QC, Role.ADMIN), getAssignableUsersHandler);

// ADMIN 전용 사용자 관리
router.post('/', authenticate, authorize(Role.ADMIN), createUserHandler);
router.get('/', authenticate, authorize(Role.ADMIN), listUsersHandler);
router.get('/:id', authenticate, authorize(Role.ADMIN), getUserByIdHandler);
router.patch('/:id', authenticate, authorize(Role.ADMIN), updateUserHandler);
router.delete('/:id', authenticate, authorize(Role.ADMIN), deactivateUserHandler);

export default router;
