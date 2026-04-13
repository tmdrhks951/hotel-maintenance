import { Router } from 'express';
import {
  loginHandler,
  refreshHandler,
  logoutHandler,
  /// [AUTH STEP ADD START]
  signupHandler,
  sendCodeHandler,
  verifyCodeHandler,
  findLoginIdHandler,
  requestPasswordResetHandler,
  getSecurityQuestionsHandler,
  checkLoginIdHandler,
  /// [AUTH STEP ADD END]
} from './auth.controller';

const router = Router();

// 기존 라우트 (변경 없음)
// POST /api/v1/auth/login
router.post('/login', loginHandler);

// POST /api/v1/auth/refresh
router.post('/refresh', refreshHandler);

// POST /api/v1/auth/logout
router.post('/logout', logoutHandler);

/// [AUTH STEP ADD START]

// POST /api/v1/auth/signup — 회원가입
router.post('/signup', signupHandler);

// POST /api/v1/auth/send-code — 전화번호 인증코드 발송
router.post('/send-code', sendCodeHandler);

// POST /api/v1/auth/verify-code — 전화번호 인증코드 검증
router.post('/verify-code', verifyCodeHandler);

// POST /api/v1/auth/find-login-id — 아이디 찾기
router.post('/find-login-id', findLoginIdHandler);

// POST /api/v1/auth/request-password-reset — 비밀번호 재설정 요청
router.post('/request-password-reset', requestPasswordResetHandler);

// GET /api/v1/auth/security-questions — 보안질문 조회
router.get('/security-questions', getSecurityQuestionsHandler);

// GET /api/v1/auth/check-login-id?loginId=xxx — 아이디 중복 확인
router.get('/check-login-id', checkLoginIdHandler);

/// [AUTH STEP ADD END]

export default router;
