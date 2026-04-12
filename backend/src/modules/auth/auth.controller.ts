import { Request, Response, NextFunction } from 'express';
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
// 기존 핸들러 (변경 최소화)
// ================================================================

/// [AUTH STEP MODIFY START] — loginId/email 양쪽 지원
export async function loginHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = LoginDto.parse(req.body);
    const identifier = input.loginId || input.email || '';
    const result = await authService.login(identifier, input.password);

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
    const input = RefreshTokenDto.parse(req.body);
    const result = await authService.refresh(input.refreshToken);

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function logoutHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = RefreshTokenDto.parse(req.body);
    await authService.logout(input.refreshToken);

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

/// [AUTH STEP ADD END]
