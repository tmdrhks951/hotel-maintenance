import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '@/common/middleware/authenticate';
import { authorize } from '@/common/middleware/authorize';
import {
  getKpiSummaryHandler,
  getAgingRequestsHandler,
  getReopenedRequestsHandler,
  getRepeatIssuesHandler,
} from './admin.controller';

const router = Router();

// 모든 admin 라우트: 인증 + ADMIN 권한 강제
router.use(authenticate);
router.use(authorize(Role.ADMIN));

router.get('/kpi/summary', getKpiSummaryHandler);
router.get('/exceptions/aging', getAgingRequestsHandler);
router.get('/exceptions/reopened', getReopenedRequestsHandler);
router.get('/exceptions/repeat-issues', getRepeatIssuesHandler);

export default router;
