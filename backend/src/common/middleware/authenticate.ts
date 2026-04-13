import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '@/common/utils/jwt.util';
import { AppError } from '@/common/errors/AppError';

/**
 * 인증 미들웨어
 * Authorization: Bearer <accessToken> 헤더를 검증하고
 * req.user에 파싱된 페이로드를 주입한다.
 *
 * 이 미들웨어는 "누구인가"만 판단한다.
 * "무엇을 할 수 있는가"는 authorize 미들웨어가 담당한다.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  // SSE 연결은 EventSource가 헤더를 설정할 수 없으므로 ?token= 쿼리 파라미터로 대체 허용
  const token: string | null = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : typeof req.query.token === 'string'
    ? req.query.token
    : null;

  if (!token) {
    next(new AppError('인증이 필요합니다', 401, true, 'UNAUTHORIZED'));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      role: payload.role,
      position: payload.position,
      branchId: payload.branchId,
      branchIds: payload.branchIds,
    };
    next();
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === 'TokenExpiredError') {
        next(new AppError('토큰이 만료되었습니다', 401, true, 'TOKEN_EXPIRED'));
        return;
      }
    }
    next(new AppError('유효하지 않은 토큰입니다', 401, true, 'TOKEN_INVALID'));
  }
}
