import { z } from 'zod';

export const LoginDto = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
});

export const RefreshTokenDto = z.object({
  refreshToken: z.string().min(1, 'refreshToken이 필요합니다'),
});

export type LoginInput = z.infer<typeof LoginDto>;
export type RefreshTokenInput = z.infer<typeof RefreshTokenDto>;
