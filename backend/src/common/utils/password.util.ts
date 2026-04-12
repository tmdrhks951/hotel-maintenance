import bcrypt from 'bcryptjs';
import { env } from '@/config/env';

/**
 * 비밀번호를 bcrypt로 해싱한다.
 * rounds는 env.BCRYPT_ROUNDS 기준 (기본 12)
 */
export async function hashPassword(plaintext: string): Promise<string> {
  const rounds = parseInt(env.BCRYPT_ROUNDS, 10);
  return bcrypt.hash(plaintext, rounds);
}

/**
 * 평문과 해시를 비교한다.
 * bcrypt.compare는 timing-safe 비교를 보장하므로 직접 구현 불필요.
 */
export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}
