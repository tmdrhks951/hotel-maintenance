import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from './AppError';
import { env } from '@/config/env';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  // Zod 유효성 검사 실패
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: '입력 데이터가 올바르지 않습니다',
      errors: err.flatten().fieldErrors,
    });
    return;
  }

  // 운영상 예측 가능한 에러
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.code && { code: err.code }),
      ...(env.NODE_ENV === 'development' && { stack: err.stack }),
    });
    return;
  }

  // 예기치 않은 에러 — 상세 내용 외부 노출 금지
  console.error('Unexpected error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
