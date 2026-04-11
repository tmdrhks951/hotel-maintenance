import { PrismaClient } from '@prisma/client';
import { env } from './env';

// STEP 1: Prisma 연결 준비 구조. 실제 도메인 쿼리는 STEP 2+에서 사용.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: env.DATABASE_URL,
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function connectPrisma(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('✅ Prisma connected');
  } catch (error) {
    // STEP 1: DB 없이도 서버 실행 가능하도록 non-fatal 처리
    console.warn('⚠️  Prisma connection failed (non-fatal):', (error as Error).message);
  }
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
