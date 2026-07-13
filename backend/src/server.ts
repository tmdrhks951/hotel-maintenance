import http from 'http';
import { createApp } from './app';
import { env } from '@/config/env';
import { connectPrisma, disconnectPrisma } from '@/config/prisma';
import { connectRedis, disconnectRedis } from '@/config/redis';
import { connectMinio } from '@/config/minio';
import { initSocket } from '@/lib/socket';
import { generateScheduledRequests } from '@/modules/recurring-schedule/recurring-schedule.service';

// 반복 점검 자동 생성 주기 (10분) — 서버 기동 시 1회 + 주기 실행
const SCHEDULE_GENERATION_INTERVAL_MS = 10 * 60 * 1000;

function startRecurringScheduleWorker(): NodeJS.Timeout {
  const run = async (): Promise<void> => {
    try {
      const result = await generateScheduledRequests();
      if (result.createdCount > 0) {
        console.log(`🗓️  반복 점검 자동 생성: ${result.createdCount}건 (검사 ${result.checkedCount}건)`);
      }
    } catch (err) {
      console.error('⚠️  반복 점검 자동 생성 실패 (다음 주기에 재시도):', (err as Error).message);
    }
  };
  void run();
  const timer = setInterval(() => void run(), SCHEDULE_GENERATION_INTERVAL_MS);
  timer.unref(); // 종료 시 이벤트 루프를 붙잡지 않음
  return timer;
}

async function bootstrap(): Promise<void> {
  const app = createApp();
  const httpServer = http.createServer(app);

  // Socket.io 초기화
  initSocket(httpServer);

  // 외부 서비스 연결 (모두 non-fatal — 없어도 서버 기동)
  await connectPrisma();
  await connectRedis();
  await connectMinio();

  // 반복 점검 스케줄 자동 생성 워커
  startRecurringScheduleWorker();

  const port = parseInt(env.PORT, 10);

  httpServer.listen(port, () => {
    console.log(`\n🚀 Server running   → http://localhost:${port}`);
    console.log(`📡 Health check     → http://localhost:${port}/api/v1/health`);
    console.log(`🌍 Environment      → ${env.NODE_ENV}\n`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    httpServer.close(async () => {
      await disconnectPrisma();
      await disconnectRedis();
      console.log('✅ Server shut down cleanly');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('❌ Bootstrap failed:', err);
  process.exit(1);
});
