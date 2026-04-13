/// [AUTH STEP ADD — 신규 파일]
import { getRedisClient } from '@/config/redis';
import { AppError } from '@/common/errors/AppError';

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
// Redis 사용 가능 확인
// ================================================================

function requireRedis() {
  const redis = getRedisClient();
  if (!redis) {
    throw new AppError(
      '인증 서비스가 일시적으로 사용 불가합니다. 잠시 후 다시 시도해주세요',
      503,
      true,
      'REDIS_UNAVAILABLE',
    );
  }
  return redis;
}

// ================================================================
// 인증코드 저장 (TTL 5분)
// ================================================================

export async function storeCode(phone: string, code: string): Promise<void> {
  const redis = requireRedis();
  await redis.set(`${CODE_PREFIX}${phone}`, code, 'EX', CODE_TTL);
}

// ================================================================
// 인증코드 검증
// ================================================================

export async function verifyCode(phone: string, code: string): Promise<boolean> {
  const redis = requireRedis();

  const stored = await redis.get(`${CODE_PREFIX}${phone}`);
  if (!stored || stored !== code) return false;

  // 인증 성공: 코드 삭제 + 인증 완료 플래그 설정
  await redis.del(`${CODE_PREFIX}${phone}`);
  await redis.set(`${VERIFIED_PREFIX}${phone}`, '1', 'EX', VERIFIED_TTL);

  return true;
}

// ================================================================
// 인증 완료 여부 확인
// ================================================================

export async function isVerified(phone: string): Promise<boolean> {
  const redis = requireRedis();
  const val = await redis.get(`${VERIFIED_PREFIX}${phone}`);
  return val === '1';
}

// ================================================================
// 인증 완료 상태 소비 (사용 후 삭제)
// ================================================================

export async function consumeVerified(phone: string): Promise<void> {
  const redis = requireRedis();
  await redis.del(`${VERIFIED_PREFIX}${phone}`);
}
