import { Router } from 'express';
import { authenticate } from '@/common/middleware/authenticate';
import {
  listLocationsHandler,
  createLocationHandler,
  getLocationHandler,
  updateLocationHandler,
} from './location.controller';

// ================================================================
// 중첩 라우터: /branches/:branchId/locations
// ================================================================

export const branchLocationRouter = Router({ mergeParams: true });

// 모든 라우트: 인증 필수
branchLocationRouter.use(authenticate);

// GET  /branches/:branchId/locations — ADMIN·QC·OPERATIONS (접근 제어는 컨트롤러 레벨)
branchLocationRouter.get('/', listLocationsHandler);

// POST /branches/:branchId/locations — ADMIN만 생성
branchLocationRouter.post('/', createLocationHandler);

// ================================================================
// 독립 라우터: /locations/:locationId
// ================================================================

export const locationRouter = Router();

locationRouter.use(authenticate);

// GET   /locations/:locationId
locationRouter.get('/:locationId', getLocationHandler);

// PATCH /locations/:locationId — ADMIN만 수정 (컨트롤러에서 role 재확인)
locationRouter.patch('/:locationId', updateLocationHandler);
