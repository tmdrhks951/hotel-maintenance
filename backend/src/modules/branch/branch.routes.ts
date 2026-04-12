import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '@/common/middleware/authenticate';
import { authorize } from '@/common/middleware/authorize';
import { branchLocationRouter } from '@/modules/location/location.routes';
import {
  listBranchesHandler,
  getBranchHandler,
  createBranchHandler,
  updateBranchHandler,
  deleteBranchHandler,
} from './branch.controller';

const router = Router();

// ----------------------------------------------------------------
// GET  /branches      — ADMIN·QC·OPERATIONS (역할별 범위는 컨트롤러)
// GET  /branches/:id  — ADMIN·QC·OPERATIONS (역할별 범위는 컨트롤러)
// ----------------------------------------------------------------
router.get('/', authenticate, listBranchesHandler);
router.get('/:id', authenticate, getBranchHandler);

// ----------------------------------------------------------------
// POST / PATCH / DELETE — ADMIN 전용
// ----------------------------------------------------------------
router.post('/', authenticate, authorize(Role.ADMIN), createBranchHandler);
router.patch('/:id', authenticate, authorize(Role.ADMIN), updateBranchHandler);
router.delete('/:id', authenticate, authorize(Role.ADMIN), deleteBranchHandler);

// ----------------------------------------------------------------
// 중첩 라우터: /branches/:branchId/locations
// ----------------------------------------------------------------
router.use('/:branchId/locations', branchLocationRouter);

export default router;
