import { Router } from 'express';
import { Role, Position } from '@prisma/client';
import { authenticate } from '@/common/middleware/authenticate';
import { authorize, authorizePosition } from '@/common/middleware/authorize';
import {
  listSchedulesHandler,
  getScheduleHandler,
  createScheduleHandler,
  updateScheduleHandler,
  deleteScheduleHandler,
  generateHandler,
} from './recurring-schedule.controller';

const router = Router();

router.use(authenticate);

// ── 조회: 모든 역할 가능 ──
router.get('/', authorize(Role.ADMIN, Role.QC, Role.OPERATIONS), listSchedulesHandler);
router.get('/:id', authorize(Role.ADMIN, Role.QC, Role.OPERATIONS), getScheduleHandler);

// ── 등록: QC·OPERATIONS 전원 가능 ──
router.post('/', authorize(Role.QC, Role.OPERATIONS), createScheduleHandler);

// ── 수정/삭제/수동생성: QC·OPERATIONS 팀장급만 ──
const teamLeaderOnly = [
  authorize(Role.QC, Role.OPERATIONS),
  authorizePosition(Position.TEAM_LEADER, Position.DEPUTY_LEADER),
];

router.patch('/:id', ...teamLeaderOnly, updateScheduleHandler);
router.delete('/:id', ...teamLeaderOnly, deleteScheduleHandler);
router.post('/generate', ...teamLeaderOnly, generateHandler);

export default router;
