import http from 'http';
import { createApp } from './app';
import { env } from '@/config/env';
import { connectPrisma, disconnectPrisma } from '@/config/prisma';
import { connectRedis, disconnectRedis } from '@/config/redis';
import { connectMinio } from '@/config/minio';
import { initSocket } from '@/lib/socket';

async function bootstrap(): Promise<void> {
  const app = createApp();
  const httpServer = http.createServer(app);

  // Socket.io 초기화
  initSocket(httpServer);

  // 외부 서비스 연결 (모두 non-fatal — 없어도 서버 기동)
  await connectPrisma();
  await connectRedis();
  await connectMinio();

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
