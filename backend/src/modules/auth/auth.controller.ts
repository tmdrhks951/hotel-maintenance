import { Request, Response, NextFunction } from 'express';
import { env } from '@/config/env';
import { AppError } from '@/common/errors/AppError';
import {
  LoginDto,
  RefreshTokenDto,
  /// [AUTH STEP ADD START]
  SignupDto,
  SendCodeDto,
  VerifyCodeDto,
  FindLoginIdDto,
  RequestPasswordResetDto,
  /// [AUTH STEP ADD END]
} from './auth.dto';
import * as authService from './auth.service';

// ================================================================
// refresh token httpOnly 쿠키 — XSS로부터 리프레시 토큰 보호
// 프로덕션은 크로스 도메인(Vercel↔Railway)이므로 SameSite=None + Secure
// ================================================================

const REFRESH_COOKIE = 'refresh_token';
const REFRESH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30일 (JWT_REFRESH_EXPIRES_IN과 일치)

function refreshCookieOptions() {
  const isProd = env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? ('none' as const) : ('lax' as const),
    path: '/api/v1/auth',
    maxAge: REFRESH_COOKIE_MAX_AGE,
  };
}

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, refreshCookieOptions());
}

function clearRefreshCookie(res: Response): void {
  const { maxAge: _omit, ...opts } = refreshCookieOptions();
  res.clearCookie(REFRESH_COOKIE, opts);
}

/** 쿠키 우선, body 하위 호환 */
function extractRefreshToken(req: Request): string | null {
  const fromCookie = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
  if (fromCookie) return fromCookie;
  const input = RefreshTokenDto.parse(req.body ?? {});
  return input.refreshToken ?? null;
}

// ================================================================
// 기존 핸들러
// ================================================================

/// [AUTH STEP MODIFY START] — loginId/email 양쪽 지원
export async function loginHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = LoginDto.parse(req.body);
    const identifier = input.loginId || input.email || '';
    const { refreshToken, ...result } = await authService.login(identifier, input.password);

    // 리프레시 토큰은 httpOnly 쿠키로만 전달 (응답 body에서 제외)
    setRefreshCookie(res, refreshToken);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
/// [AUTH STEP MODIFY END]

export async function refreshHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rawToken = extractRefreshToken(req);
    if (!rawToken) {
      throw new AppError('인증이 필요합니다. 다시 로그인해주세요', 401, true, 'TOKEN_MISSING');
    }
    const { refreshToken, ...result } = await authService.refresh(rawToken);

    setRefreshCookie(res, refreshToken);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    clearRefreshCookie(res);
    next(err);
  }
}

export async function logoutHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rawToken = extractRefreshToken(req);
    if (rawToken) {
      await authService.logout(rawToken).catch(() => { /* 이미 무효한 토큰이어도 로그아웃은 성공 처리 */ });
    }
    clearRefreshCookie(res);
    res.status(200).json({ success: true, message: '로그아웃 되었습니다' });
  } catch (err) {
    next(err);
  }
}

/// [AUTH STEP ADD START]

// ================================================================
// 회원가입
// ================================================================

export async function signupHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = SignupDto.parse(req.body);
    const result = await authService.signup(input);

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ================================================================
// 전화번호 인증코드 발송
// ================================================================

export async function sendCodeHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = SendCodeDto.parse(req.body);
    const result = await authService.sendCode(input.phone);

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ================================================================
// 전화번호 인증코드 검증
// ================================================================

export async function verifyCodeHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = VerifyCodeDto.parse(req.body);
    const result = await authService.verifyCodeAction(input.phone, input.code);

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ================================================================
// 아이디 찾기
// ================================================================

export async function findLoginIdHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = FindLoginIdDto.parse(req.body);
    const result = await authService.findLoginId(input);

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ================================================================
// 비밀번호 재설정 요청 생성
// ================================================================

export async function requestPasswordResetHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = RequestPasswordResetDto.parse(req.body);
    const result = await authService.requestPasswordReset(input);

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ================================================================
// 보안질문 조회
// ================================================================

export async function getSecurityQuestionsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const loginId = req.query.loginId as string;
    if (!loginId?.trim()) {
      res.status(400).json({ success: false, message: '아이디를 입력해주세요' });
      return;
    }
    const result = await authService.getSecurityQuestions(loginId.trim());
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ================================================================
// 아이디 중복 확인
// ================================================================

export async function checkLoginIdHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const loginId = req.query.loginId as string;
    if (!loginId?.trim()) {
      res.status(400).json({ success: false, message: '아이디를 입력해주세요' });
      return;
    }
    const result = await authService.checkLoginId(loginId.trim());
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ================================================================
// 회원가입용 공개 지점 목록 (인증 불필요)
// ================================================================

export async function publicBranchesHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { listBranches } = await import('@/modules/branch/branch.service');
    const branches = await listBranches({ isActive: true });
    res.status(200).json({ success: true, data: branches });
  } catch (err) {
    next(err);
  }
}

/// [AUTH STEP ADD END]
