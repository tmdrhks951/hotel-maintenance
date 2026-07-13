import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '@/common/middleware/authenticate';
import { authorize } from '@/common/middleware/authorize';
import {
  getMeHandler,
  changeMyPasswordHandler,
  createUserHandler,
  listUsersHandler,
  getUserByIdHandler,
  updateUserHandler,
  deactivateUserHandler,
  getAssignableUsersHandler,
  listPendingUsersHandler,
  approveUserHandler,
  rejectUserHandler,
} from './user.controller';

const router = Router();

// GET /api/v1/users/me — 본인 정보 (인증만 필요)
router.get('/me', authenticate, getMeHandler);

// PATCH /api/v1/users/me/password — 본인 비밀번호 변경 (인증만 필요)
router.patch('/me/password', authenticate, changeMyPasswordHandler);

// GET /api/v1/users/assignable — STEP 6: 담당자 후보 조회 (QC/ADMIN)
// /me, /assignable 를 /:id 앞에 배치
router.get('/assignable', authenticate, authorize(Role.QC, Role.ADMIN), getAssignableUsersHandler);

// GET /api/v1/users/pending — 승인 대기 사용자 목록 (ADMIN)
router.get('/pending', authenticate, authorize(Role.ADMIN), listPendingUsersHandler);

// ADMIN 전용 사용자 관리
router.post('/', authenticate, authorize(Role.ADMIN), createUserHandler);
router.get('/', authenticate, authorize(Role.ADMIN), listUsersHandler);
router.get('/:id', authenticate, authorize(Role.ADMIN), getUserByIdHandler);
router.patch('/:id', authenticate, authorize(Role.ADMIN), updateUserHandler);
router.delete('/:id', authenticate, authorize(Role.ADMIN), deactivateUserHandler);

// PATCH /api/v1/users/:id/approve — 사용자 승인 (ADMIN)
router.patch('/:id/approve', authenticate, authorize(Role.ADMIN), approveUserHandler);

// PATCH /api/v1/users/:id/reject — 사용자 거부 (ADMIN)
router.patch('/:id/reject', authenticate, authorize(Role.ADMIN), rejectUserHandler);

export default router;
