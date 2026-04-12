import { z } from 'zod';

// ================================================================
// 기존 DTO (변경 없음)
// ================================================================

export const LoginDto = z.object({
  /// [AUTH STEP MODIFY START] — loginId 또는 email 허용
  loginId: z.string().min(1).optional(),
  email: z.string().min(1).optional(),
  /// [AUTH STEP MODIFY END]
  password: z.string().min(1, '비밀번호를 입력해주세요'),
}).refine(d => d.loginId || d.email, {
  message: 'loginId 또는 email이 필요합니다',
});

export const RefreshTokenDto = z.object({
  refreshToken: z.string().min(1, 'refreshToken이 필요합니다'),
});

export type LoginInput = z.infer<typeof LoginDto>;
export type RefreshTokenInput = z.infer<typeof RefreshTokenDto>;

/// [AUTH STEP ADD START]

// ================================================================
// 회원가입 DTO
// ================================================================

export const SignupDto = z.object({
  loginIdPrefix: z.string()
    .min(2, '아이디는 2자 이상이어야 합니다')
    .regex(/^[a-zA-Z0-9._-]+$/, '아이디는 영문, 숫자, ., -, _ 만 사용 가능합니다'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다'),
  name: z.string().min(1, '이름을 입력해주세요'),
  role: z.enum(['ADMIN', 'OPERATIONS', 'QC', 'VENDOR']),
  department: z.enum(['OPERATIONS_1', 'OPERATIONS_2', 'OPERATIONS_3', 'QC_1', 'QC_3', 'NONE']).default('NONE'),
  position: z.enum(['TEAM_LEADER', 'DEPUTY_LEADER', 'MEMBER', 'OTHER']).default('MEMBER'),
  phone: z.string().min(1, '전화번호를 입력해주세요'),
  email: z.string().email('올바른 이메일 형식이 아닙니다'),
  branchIds: z.array(z.string()).default([]),
  securityQuestion1: z.string().min(1, '보안 질문 1을 입력해주세요'),
  securityAnswer1: z.string().min(1, '보안 답변 1을 입력해주세요'),
  securityQuestion2: z.string().min(1, '보안 질문 2를 입력해주세요'),
  securityAnswer2: z.string().min(1, '보안 답변 2를 입력해주세요'),
});

export type SignupInput = z.infer<typeof SignupDto>;

// ================================================================
// 전화번호 인증 DTO
// ================================================================

export const SendCodeDto = z.object({
  phone: z.string().min(1, '전화번호를 입력해주세요'),
});

export const VerifyCodeDto = z.object({
  phone: z.string().min(1, '전화번호를 입력해주세요'),
  code: z.string().length(6, '인증코드는 6자리입니다'),
});

export type SendCodeInput = z.infer<typeof SendCodeDto>;
export type VerifyCodeInput = z.infer<typeof VerifyCodeDto>;

// ================================================================
// 아이디 찾기 DTO
// ================================================================

export const FindLoginIdDto = z.object({
  name: z.string().min(1, '이름을 입력해주세요'),
  department: z.enum(['OPERATIONS_1', 'OPERATIONS_2', 'OPERATIONS_3', 'QC_1', 'QC_3', 'NONE']),
  position: z.enum(['TEAM_LEADER', 'DEPUTY_LEADER', 'MEMBER', 'OTHER']),
  phone: z.string().min(1, '전화번호를 입력해주세요'),
});

export type FindLoginIdInput = z.infer<typeof FindLoginIdDto>;

// ================================================================
// 비밀번호 찾기 (재설정 요청 생성) DTO
// ================================================================

export const RequestPasswordResetDto = z.object({
  loginId: z.string().min(1, '아이디를 입력해주세요'),
  name: z.string().min(1, '이름을 입력해주세요'),
  department: z.enum(['OPERATIONS_1', 'OPERATIONS_2', 'OPERATIONS_3', 'QC_1', 'QC_3', 'NONE']),
  position: z.enum(['TEAM_LEADER', 'DEPUTY_LEADER', 'MEMBER', 'OTHER']),
  securityAnswer1: z.string().min(1, '보안 답변 1을 입력해주세요'),
  securityAnswer2: z.string().min(1, '보안 답변 2를 입력해주세요'),
});

export type RequestPasswordResetInput = z.infer<typeof RequestPasswordResetDto>;

/// [AUTH STEP ADD END]
