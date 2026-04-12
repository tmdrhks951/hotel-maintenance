import { Router } from 'express';
import { authenticate } from '@/common/middleware/authenticate';
import {
  getNotificationsHandler,
  getUnreadCountHandler,
  markAllReadHandler,
  markReadHandler,
  sseStreamHandler,
} from './notification.controller';

const router = Router();

router.use(authenticate);

// 파라미터 없는 경로 먼저
router.get('/', getNotificationsHandler);
router.get('/unread-count', getUnreadCountHandler);
router.get('/stream', sseStreamHandler);   // SSE 연결 엔드포인트
router.patch('/read-all', markAllReadHandler);

// 파라미터 경로 나중에
router.patch('/:id/read', markReadHandler);

export default router;
