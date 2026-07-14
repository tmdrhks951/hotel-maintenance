import { randomUUID } from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { Role, Position } from '@prisma/client';
import { env } from '@/config/env';

// ================================================================
// Payload 타입 정의
// ================================================================

export interface JwtAccessPayload {
  sub: string;
  role: Role;
  position: Position;
  branchId: string | null;
  branchIds: string[];
}

export interface JwtRefreshPayload {
  sub: string;
}

// ================================================================
// 발급
// ================================================================

export function signAccessToken(payload: JwtAccessPayload): string {
  const options: SignOptions = {
    subject: payload.sub,
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
  };

  return jwt.sign(
    {
      role: payload.role,
      position: payload.position,
      branchId: payload.branchId,
      branchIds: payload.branchIds,
    },
    env.JWT_ACCESS_SECRET,
    options,
  );
}

export function signRefreshToken(userId: string): string {
  const options: SignOptions = {
    subject: userId,
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
    // 토큰 고유 ID — 같은 사용자가 같은 초에 여러 세션을 만들어도 (공용 계정
    // 동시 로그인/갱신) 토큰 문자열이 항상 달라 tokenHash 유니크 충돌 방지
    jwtid: randomUUID(),
  };

  return jwt.sign({}, env.JWT_REFRESH_SECRET, options);
}

// ================================================================
// 검증
// ================================================================

export function verifyAccessToken(token: string): JwtAccessPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as jwt.JwtPayload & {
    role: Role;
    position: Position;
    branchId: string | null;
    branchIds?: string[];
  };

  if (!decoded.sub || !decoded.role || !decoded.position) {
    throw new Error('Invalid token payload');
  }

  const branchId = decoded.branchId ?? null;
  return {
    sub: decoded.sub,
    role: decoded.role,
    position: decoded.position,
    branchId,
    branchIds: decoded.branchIds ?? (branchId ? [branchId] : []),
  };
}

export function verifyRefreshToken(token: string): JwtRefreshPayload {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as jwt.JwtPayload;

  if (!decoded.sub) {
    throw new Error('Invalid token payload');
  }

  return { sub: decoded.sub };
}
