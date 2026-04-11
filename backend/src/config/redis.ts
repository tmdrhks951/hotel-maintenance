import Redis from 'ioredis';
import { env } from './env';

// TODO: STEP 2+에서 실제 캐싱/세션 기능 연결

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  return redisClient;
}

export async function connectRedis(): Promise<void> {
  try {
    redisClient = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      // 초기 연결 실패 시 자동 재연결 하지 않음
      // Redis가 없는 환경에서 에러 반복 출력 방지
      retryStrategy: () => null,
    });

    // error 이벤트 핸들러 없으면 Node.js가 uncaughtException으로 처리하므로 반드시 등록
    redisClient.on('error', () => {
      // retryStrategy: null 이므로 재연결 시도 없음 — 로그 출력 생략
    });

    await redisClient.connect();
    console.log('✅ Redis connected');
  } catch (error) {
    console.warn('⚠️  Redis connection failed (non-fatal):', (error as Error).message);
    if (redisClient) {
      redisClient.disconnect();
      redisClient = null;
    }
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
