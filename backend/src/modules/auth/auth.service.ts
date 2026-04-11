import crypto from 'crypto';
import { prisma } from '@/config/prisma';
import { AppError } from '@/common/errors/AppError';
import { verifyPassword } from '@/common/utils/password.util';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '@/common/utils/jwt.util';

// ================================================================
// 내부 유틸
// ================================================================

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/** JWT_REFRESH_EXPIRES_IN(30d)과 동기화 */
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

function getRefreshTokenExpiry(): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
  return expiry;
}

// ================================================================
// login
// ================================================================

export async function login(email: string, password: string) {
  // 1. 사용자 조회 (soft delete 제외)
  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      position: true,
      branchId: true,
      isActive: true,
      passwordHash: true,
    },
  });

  // 이메일/비밀번호 구분 없이 동일 메시지 — 사용자 열거 공격 방지
  if (!user) {
    throw new AppError('이메일 또는 비밀번호가 올바르지 않습니다', 401);
  }

  // 2. 비활성 계정 차단
  if (!user.isActive) {
    throw new AppError('비활성화된 계정입니다. 관리자에게 문의하세요', 403, true, 'ACCOUNT_INACTIVE');
  }

  // 3. 비밀번호 검증 (bcrypt timing-safe)
  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    throw new AppError('이메일 또는 비밀번호가 올바르지 않습니다', 401);
  }

  // 4. 토큰 발급
  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role,
    position: user.position,
    branchId: user.branchId,
  });

  const refreshToken = signRefreshToken(user.id);

  // 5. refresh token DB 저장 (SHA-256 해시)
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshToken),
      userId: user.id,
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  // 6. 응답 — passwordHash 제거
  const { passwordHash: _omit, ...safeUser } = user;

  return { user: safeUser, accessToken, refreshToken };
}

// ================================================================
// refresh
// ================================================================

export async function refresh(rawToken: string) {
  // 1. JWT 서명/만료 검증
  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(rawToken);
  } catch (err) {
    if (err instanceof Error && err.name === 'TokenExpiredError') {
      throw new AppError('토큰이 만료되었습니다. 다시 로그인해주세요', 401, true, 'TOKEN_EXPIRED');
    }
    throw new AppError('유효하지 않은 토큰입니다', 401, true, 'TOKEN_INVALID');
  }

  const tokenHash = hashToken(rawToken);

  // 2. DB에서 토큰 조회
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          role: true,
          position: true,
          branchId: true,
          isActive: true,
          deletedAt: true,
        },
      },
    },
  });

  // 3. DB에 없음 → 이미 rotation된 토큰 재사용 시도 (탈취 가능성)
  //    해당 userId의 모든 활성 토큰을 즉시 폐기
  if (!stored) {
    await prisma.refreshToken.updateMany({
      where: { userId: payload.sub, isRevoked: false },
      data: { isRevoked: true },
    });
    throw new AppError('유효하지 않은 토큰입니다', 401, true, 'TOKEN_INVALID');
  }

  // 4. 이미 revoked → reuse attack
  if (stored.isRevoked) {
    await prisma.refreshToken.updateMany({
      where: { userId: stored.userId, isRevoked: false },
      data: { isRevoked: true },
    });
    throw new AppError('비정상적인 접근이 감지되었습니다. 다시 로그인해주세요', 401, true, 'TOKEN_REUSE_DETECTED');
  }

  // 5. DB expiresAt 만료 확인 (JWT 만료와 이중 검증)
  if (stored.expiresAt < new Date()) {
    throw new AppError('토큰이 만료되었습니다. 다시 로그인해주세요', 401, true, 'TOKEN_EXPIRED');
  }

  // 6. 사용자 상태 확인
  if (stored.user.deletedAt) {
    throw new AppError('존재하지 않는 계정입니다', 401, true, 'USER_NOT_FOUND');
  }
  if (!stored.user.isActive) {
    throw new AppError('비활성화된 계정입니다. 관리자에게 문의하세요', 403, true, 'ACCOUNT_INACTIVE');
  }

  // 7. Token rotation — 구 토큰 revoke + 신 토큰 발급
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { isRevoked: true },
  });

  const newAccessToken = signAccessToken({
    sub: stored.user.id,
    role: stored.user.role,
    position: stored.user.position,
    branchId: stored.user.branchId,
  });

  const newRefreshToken = signRefreshToken(stored.user.id);

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(newRefreshToken),
      userId: stored.user.id,
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

// ================================================================
// logout
// ================================================================

export async function logout(rawToken: string) {
  const tokenHash = hashToken(rawToken);

  // 해당 토큰만 revoke (다른 기기 세션은 유지)
  await prisma.refreshToken.updateMany({
    where: { tokenHash, isRevoked: false },
    data: { isRevoked: true },
  });
}
