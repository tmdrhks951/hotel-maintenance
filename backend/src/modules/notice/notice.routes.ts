import { Router } from 'express';
import { Role, Position } from '@prisma/client';
import { authenticate } from '@/common/middleware/authenticate';
import { authorize, authorizePositionOrAdmin } from '@/common/middleware/authorize';
import {
  getNoticesHandler,
  getNoticeHandler,
  createNoticeHandler,
  updateNoticeHandler,
  deleteNoticeHandler,
} from './notice.controller';

const router = Router();

// 모든 라우트: 인증 필수
router.use(authenticate);

// 목록 / 상세 — 모든 인증 사용자
router.get('/', getNoticesHandler);
router.get('/:id', getNoticeHandler);

// 생성 / 수정 / 삭제 — ADMIN + QC/OPERATIONS 팀장급
const leaderOrAdmin = [
  authorize(Role.ADMIN, Role.QC, Role.OPERATIONS),
  authorizePositionOrAdmin(Position.TEAM_LEADER, Position.DEPUTY_LEADER),
];

router.post('/', ...leaderOrAdmin, createNoticeHandler);
router.patch('/:id', ...leaderOrAdmin, updateNoticeHandler);
router.delete('/:id', ...leaderOrAdmin, deleteNoticeHandler);

export default router;
