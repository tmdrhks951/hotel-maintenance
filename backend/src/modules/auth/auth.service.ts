import crypto from 'crypto';
import { env } from '@/config/env';
import { prisma } from '@/config/prisma';
import { AppError } from '@/common/errors/AppError';
import { hashPassword, verifyPassword } from '@/common/utils/password.util';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '@/common/utils/jwt.util';
/// [AUTH STEP ADD START]
import * as phoneService from '@/modules/phone/phone.service';
import type { SignupInput, FindLoginIdInput, RequestPasswordResetInput } from './auth.dto';
/// [AUTH STEP ADD END]

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

/// [AUTH STEP ADD START]
/** 회원가입 시 loginId에 붙이는 도메인 */
const LOGIN_ID_DOMAIN = '@urbanhost.co.kr';

/** loginId 정규화 — @가 없으면 도메인 자동 추가 */
function normalizeLoginId(input: string): string {
  if (input.includes('@')) return input;
  return input + LOGIN_ID_DOMAIN;
}
/// [AUTH STEP ADD END]

// ================================================================
// login
// ================================================================

/// [AUTH STEP MODIFY START] — loginId/email 양쪽 지원 + status 체크 추가
export async function login(identifier: string, password: string) {
  // loginId 정규화 (@ 없으면 도메인 추가)
  const normalizedId = normalizeLoginId(identifier);

  // 1. 사용자 조회 — loginId 또는 email로 검색 (하위 호환)
  const user = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      OR: [
        { loginId: normalizedId },
        { email: normalizedId },
        // 원본 입력으로도 시도 (기존 email 로그인 호환)
        { loginId: identifier },
        { email: identifier },
      ],
    },
    select: {
      id: true,
      email: true,
      loginId: true,
      name: true,
      role: true,
      position: true,
      department: true,
      status: true,
      branchId: true,
      branchIds: true,
      isActive: true,
      passwordHash: true,
    },
  });

  // 이메일/비밀번호 구분 없이 동일 메시지 — 사용자 열거 공격 방지
  if (!user) {
    throw new AppError('아이디 또는 비밀번호가 올바르지 않습니다', 401);
  }

  // 2. 승인 상태 체크 — isActive보다 먼저 확인 (더 명확한 메시지 제공)
  if (user.status === 'PENDING') {
    throw new AppError('승인 대기 중인 계정입니다. 관리자 승인 후 로그인할 수 있습니다', 403, true, 'ACCOUNT_PENDING');
  }
  if (user.status === 'REJECTED') {
    throw new AppError('승인이 거부된 계정입니다. 관리자에게 문의하세요', 403, true, 'ACCOUNT_REJECTED');
  }

  // 3. 비활성 계정 차단 (기존 로직 유지)
  if (!user.isActive) {
    throw new AppError('비활성화된 계정입니다. 관리자에게 문의하세요', 403, true, 'ACCOUNT_INACTIVE');
  }

  // 4. 비밀번호 검증 (bcrypt timing-safe)
  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    throw new AppError('아이디 또는 비밀번호가 올바르지 않습니다', 401);
  }

  // 5. 토큰 발급
  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role,
    position: user.position,
    branchId: user.branchId,
    branchIds: user.branchIds,
  });

  const refreshToken = signRefreshToken(user.id);

  // 6. refresh token DB 저장 (SHA-256 해시)
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshToken),
      userId: user.id,
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  // 7. 응답 — passwordHash 제거
  const { passwordHash: _omit, ...safeUser } = user;

  return { user: safeUser, accessToken, refreshToken };
}
/// [AUTH STEP MODIFY END]

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
          branchIds: true,
          isActive: true,
          deletedAt: true,
          /// [AUTH STEP ADD START]
          status: true,
          /// [AUTH STEP ADD END]
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
  /// [AUTH STEP ADD START] — 승인 상태 체크
  if (stored.user.status !== 'APPROVED') {
    throw new AppError('승인되지 않은 계정입니다', 403, true, 'ACCOUNT_NOT_APPROVED');
  }
  /// [AUTH STEP ADD END]

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
    branchIds: stored.user.branchIds,
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

/// [AUTH STEP ADD START]

// ================================================================
// signup — 회원가입
// ================================================================

export async function signup(dto: SignupInput) {
  // 1. 전화번호 인증 완료 확인
  const phoneVerified = await phoneService.isVerified(dto.phone);
  if (!phoneVerified) {
    throw new AppError('전화번호 인증을 먼저 완료해주세요', 400, true, 'PHONE_NOT_VERIFIED');
  }

  // 2. loginId 생성
  const loginId = dto.loginIdPrefix + LOGIN_ID_DOMAIN;

  // 3. loginId 중복 체크
  const existingLoginId = await prisma.user.findFirst({
    where: { loginId },
  });
  if (existingLoginId) {
    throw new AppError('이미 사용 중인 아이디입니다', 409, true, 'LOGIN_ID_CONFLICT');
  }

  // 4. email 중복 체크
  const existingEmail = await prisma.user.findFirst({
    where: { email: dto.email },
  });
  if (existingEmail) {
    throw new AppError('이미 사용 중인 이메일입니다', 409, true, 'EMAIL_CONFLICT');
  }

  // 5. branchIds 유효성 확인
  const validBranchIds: string[] = [];
  if (dto.branchIds.length > 0) {
    const branches = await prisma.branch.findMany({
      where: { id: { in: dto.branchIds }, deletedAt: null },
      select: { id: true },
    });
    if (branches.length !== dto.branchIds.length) {
      throw new AppError('존재하지 않는 지점이 포함되어 있습니다', 404, true, 'BRANCH_NOT_FOUND');
    }
    validBranchIds.push(...branches.map((b) => b.id));
  }

  // 6. 비밀번호 + 보안 답변 해시
  const passwordHash = await hashPassword(dto.password);
  const answer1Hash = await hashPassword(dto.securityAnswer1);
  const answer2Hash = await hashPassword(dto.securityAnswer2);

  // 7. 사용자 생성 — status = PENDING
  const user = await prisma.user.create({
    data: {
      loginId,
      email: dto.email,
      passwordHash,
      name: dto.name,
      role: dto.role,
      department: dto.department,
      position: dto.position,
      phone: dto.phone,
      branchId: validBranchIds[0] ?? null,       // 첫 번째 = primary
      branchIds: validBranchIds,                  // 전체 목록
      status: 'PENDING',
      isActive: false, // 승인 전까지 비활성
      securityQuestion1: dto.securityQuestion1,
      securityAnswer1: answer1Hash,
      securityQuestion2: dto.securityQuestion2,
      securityAnswer2: answer2Hash,
    },
    select: {
      id: true,
      loginId: true,
      email: true,
      name: true,
      role: true,
      department: true,
      position: true,
      status: true,
      createdAt: true,
    },
  });

  // 8. 전화번호 인증 상태 소비
  await phoneService.consumeVerified(dto.phone);

  return user;
}

// ================================================================
// sendCode — 전화번호 인증코드 발송
// ================================================================

export async function sendCode(phone: string) {
  const code = phoneService.generateCode();
  await phoneService.storeCode(phone, code);

  // TODO: 실제 SMS 발송 연동 (알리고/NHN Cloud 등)
  // 보안: 프로덕션에서는 절대 응답에 코드를 포함하지 않는다.
  // 개발 환경에서만 코드 반환 (프론트 자동입력용) + 콘솔 출력
  if (env.NODE_ENV !== 'production') {
    console.log(`📱 [DEV] 인증코드 → ${phone}: ${code}`);
    return { message: '인증코드가 발송되었습니다', code };
  }

  return { message: '인증코드가 발송되었습니다' };
}

// ================================================================
// verifyCode — 전화번호 인증코드 검증
// ================================================================

export async function verifyCodeAction(phone: string, code: string) {
  const isValid = await phoneService.verifyCode(phone, code);

  if (!isValid) {
    throw new AppError('인증코드가 올바르지 않거나 만료되었습니다', 400, true, 'INVALID_CODE');
  }

  return { message: '전화번호 인증이 완료되었습니다', verified: true };
}

// ================================================================
// findLoginId — 아이디 찾기
// ================================================================

export async function findLoginId(dto: FindLoginIdInput) {
  // 1. 전화번호 인증 완료 확인
  const phoneVerified = await phoneService.isVerified(dto.phone);
  if (!phoneVerified) {
    throw new AppError('전화번호 인증을 먼저 완료해주세요', 400, true, 'PHONE_NOT_VERIFIED');
  }

  // 2. 조건 일치 사용자 검색
  const user = await prisma.user.findFirst({
    where: {
      name: dto.name,
      department: dto.department,
      position: dto.position,
      phone: dto.phone,
      deletedAt: null,
    },
    select: {
      loginId: true,
      email: true,
    },
  });

  if (!user) {
    throw new AppError('일치하는 계정을 찾을 수 없습니다', 404, true, 'USER_NOT_FOUND');
  }

  // 3. 전화번호 인증 소비
  await phoneService.consumeVerified(dto.phone);

  // loginId가 있으면 반환, 없으면 email 반환 (레거시 호환)
  return { loginId: user.loginId ?? user.email };
}

// ================================================================
// checkLoginId — 아이디 중복 확인
// ================================================================

export async function checkLoginId(loginIdPrefix: string) {
  const loginId = `${loginIdPrefix.trim()}@urbanhost.co.kr`;
  const existing = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      OR: [{ loginId }, { loginId: loginIdPrefix.trim() }],
    },
    select: { id: true },
  });
  return { available: !existing };
}

// ================================================================
// requestPasswordReset — 비밀번호 재설정 요청 생성
// ================================================================

export async function requestPasswordReset(dto: RequestPasswordResetInput) {
  // 1. loginId 정규화
  const loginId = normalizeLoginId(dto.loginId);

  // 2. 사용자 검색 (loginId 또는 email)
  const user = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      OR: [
        { loginId },
        { email: loginId },
        { loginId: dto.loginId },
        { email: dto.loginId },
      ],
    },
    select: {
      id: true,
      name: true,
      department: true,
      position: true,
      securityAnswer1: true,
      securityAnswer2: true,
    },
  });

  if (!user) {
    throw new AppError('일치하는 계정을 찾을 수 없습니다', 404, true, 'USER_NOT_FOUND');
  }

  // 3. 본인 식별 정보 확인
  if (user.name !== dto.name) {
    throw new AppError('입력한 정보가 일치하지 않습니다', 400, true, 'INFO_MISMATCH');
  }
  if (user.department !== dto.department) {
    throw new AppError('입력한 정보가 일치하지 않습니다', 400, true, 'INFO_MISMATCH');
  }
  if (user.position !== dto.position) {
    throw new AppError('입력한 정보가 일치하지 않습니다', 400, true, 'INFO_MISMATCH');
  }

  // 4. 보안 답변 검증 (bcrypt 해시 비교)
  if (!user.securityAnswer1 || !user.securityAnswer2) {
    throw new AppError('보안 질문이 설정되지 않은 계정입니다', 400, true, 'NO_SECURITY_QUESTIONS');
  }

  const answer1Valid = await verifyPassword(dto.securityAnswer1, user.securityAnswer1);
  const answer2Valid = await verifyPassword(dto.securityAnswer2, user.securityAnswer2);

  if (!answer1Valid || !answer2Valid) {
    throw new AppError('보안 답변이 일치하지 않습니다', 400, true, 'SECURITY_ANSWER_MISMATCH');
  }

  // 5. 기존 PENDING 요청 중복 체크
  const existingRequest = await prisma.passwordResetRequest.findFirst({
    where: {
      userId: user.id,
      status: 'PENDING',
    },
  });

  if (existingRequest) {
    throw new AppError(
      '이미 비밀번호 재설정 요청이 접수되어 있습니다. 관리자 승인을 기다려주세요',
      409,
      true,
      'RESET_REQUEST_EXISTS',
    );
  }

  // 6. 재설정 요청 생성
  const request = await prisma.passwordResetRequest.create({
    data: {
      userId: user.id,
      status: 'PENDING',
    },
    select: {
      id: true,
      status: true,
      createdAt: true,
    },
  });

  return request;
}

// ================================================================
// getSecurityQuestions — 보안질문 조회 (비밀번호 찾기용)
// ================================================================

export async function getSecurityQuestions(loginId: string) {
  const normalizedId = normalizeLoginId(loginId);

  const user = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      OR: [
        { loginId: normalizedId },
        { email: normalizedId },
        { loginId },
        { email: loginId },
      ],
    },
    select: {
      securityQuestion1: true,
      securityQuestion2: true,
    },
  });

  if (!user) {
    throw new AppError('일치하는 계정을 찾을 수 없습니다', 404, true, 'USER_NOT_FOUND');
  }

  return {
    securityQuestion1: user.securityQuestion1 ?? null,
    securityQuestion2: user.securityQuestion2 ?? null,
  };
}

/// [AUTH STEP ADD END]
