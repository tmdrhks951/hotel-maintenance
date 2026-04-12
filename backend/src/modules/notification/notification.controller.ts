import { Request, Response, NextFunction } from 'express';
import {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
} from './notification.service';
import { sseManager } from '@/common/sse/SseManager';

// GET /notifications
export async function getNotificationsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user!;
    const unreadOnly = req.query.unreadOnly === 'true';
    const data = await getNotifications(user.id, unreadOnly);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// GET /notifications/unread-count
export async function getUnreadCountHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user!;
    const count = await getUnreadCount(user.id);
    res.json({ success: true, data: { count } });
  } catch (err) {
    next(err);
  }
}

// PATCH /notifications/read-all
export async function markAllReadHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user!;
    await markAllRead(user.id);
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}

// GET /notifications/stream  — SSE 연결 (EventSource)
export function sseStreamHandler(req: Request, res: Response): void {
  const user = req.user!;

  // SSE 헤더 설정
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // nginx 프록시 버퍼링 비활성화
  res.flushHeaders();

  // 연결 등록
  sseManager.add(user.id, res);

  // 초기 연결 확인 이벤트
  res.write('event: connected\ndata: {}\n\n');

  // 25초마다 ping (프록시/방화벽 타임아웃 방지)
  const ping = setInterval(() => {
    try {
      res.write('event: ping\ndata: {}\n\n');
    } catch {
      clearInterval(ping);
    }
  }, 25_000);

  // 클라이언트 연결 해제 시 정리
  req.on('close', () => {
    clearInterval(ping);
    sseManager.remove(user.id, res);
  });
}

// PATCH /notifications/:id/read
export async function markReadHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user!;
    await markRead(req.params.id, user.id);
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}
