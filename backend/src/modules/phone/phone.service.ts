/// [AUTH STEP ADD — 신규 파일]
import { getRedisClient } from '@/config/redis';

// ================================================================
// Redis Key 네이밍
// ================================================================

const CODE_PREFIX = 'phone:verify:code:';
const VERIFIED_PREFIX = 'phone:verify:verified:';
const CODE_TTL = 300;       // 5분
const VERIFIED_TTL = 1800;  // 30분

// ================================================================
// 인증코드 생성
// ================================================================

export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ================================================================
// 저장소 추상화 — Redis 우선, 없으면 인메모리 폴백
// 인메모리 폴백은 단일 인스턴스 배포에서만 유효 (다중 인스턴스는 Redis 필수)
// ================================================================

const memoryStore = new Map<string, { value: string; expiresAt: number }>();

function memoryGet(key: string): string | null {
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value;
}

function memorySet(key: string, value: string, ttlSeconds: number): void {
  memoryStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  // 만료 항목 청소 (호출 시점 기준)
  if (memoryStore.size > 1000) {
    const now = Date.now();
    for (const [k, v] of memoryStore) {
      if (now > v.expiresAt) memoryStore.delete(k);
    }
  }
}

async function storeGet(key: string): Promise<string | null> {
  const redis = getRedisClient();
  if (redis) return redis.get(key);
  return memoryGet(key);
}

async function storeSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  const redis = getRedisClient();
  if (redis) {
    await redis.set(key, value, 'EX', ttlSeconds);
    return;
  }
  memorySet(key, value, ttlSeconds);
}

async function storeDel(key: string): Promise<void> {
  const redis = getRedisClient();
  if (redis) {
    await redis.del(key);
    return;
  }
  memoryStore.delete(key);
}

// ================================================================
// 인증코드 저장 (TTL 5분)
// ================================================================

export async function storeCode(phone: string, code: string): Promise<void> {
  await storeSet(`${CODE_PREFIX}${phone}`, code, CODE_TTL);
}

// ================================================================
// 인증코드 검증
// ================================================================

export async function verifyCode(phone: string, code: string): Promise<boolean> {
  const stored = await storeGet(`${CODE_PREFIX}${phone}`);
  if (!stored || stored !== code) return false;

  // 인증 성공: 코드 삭제 + 인증 완료 플래그 설정
  await storeDel(`${CODE_PREFIX}${phone}`);
  await storeSet(`${VERIFIED_PREFIX}${phone}`, '1', VERIFIED_TTL);

  return true;
}

// ================================================================
// 인증 완료 여부 확인
// ================================================================

export async function isVerified(phone: string): Promise<boolean> {
  const val = await storeGet(`${VERIFIED_PREFIX}${phone}`);
  return val === '1';
}

// ================================================================
// 인증 완료 상태 소비 (사용 후 삭제)
// ================================================================

export async function consumeVerified(phone: string): Promise<void> {
  await storeDel(`${VERIFIED_PREFIX}${phone}`);
}
