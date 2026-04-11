import { Request, Response } from 'express';
import { prisma } from '@/config/prisma';
import { getRedisClient } from '@/config/redis';
import { getMinioClient } from '@/config/minio';

export async function getHealth(_req: Request, res: Response): Promise<void> {
  const checks: Record<string, string> = {
    server: 'ok',
  };

  // DB 연결 확인
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch {
    checks.database = 'unavailable';
  }

  // Redis 연결 확인
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.ping();
      checks.redis = 'ok';
    } catch {
      checks.redis = 'unavailable';
    }
  } else {
    checks.redis = 'not_connected';
  }

  // MinIO 연결 확인
  const minio = getMinioClient();
  if (minio) {
    try {
      await minio.listBuckets();
      checks.minio = 'ok';
    } catch {
      checks.minio = 'unavailable';
    }
  } else {
    checks.minio = 'not_connected';
  }

  const allOk = Object.values(checks).every((v) => v === 'ok');

  res.status(allOk ? 200 : 207).json({
    success: true,
    status: allOk ? 'ok' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
}
