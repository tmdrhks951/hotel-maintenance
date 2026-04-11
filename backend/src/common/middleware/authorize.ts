import { Request, Response, NextFunction } from 'express';
import { Role, Position } from '@prisma/client';
import { AppError } from '@/common/errors/AppError';

/**
 * Role 기반 인가 미들웨어
 * authenticate 미들웨어 이후에 사용해야 한다.
 *
 * 사용 예시:
 *   router.get('/admin', authenticate, authorize(Role.ADMIN), handler)
 *   router.post('/review', authenticate, authorize(Role.ADMIN, Role.QC), handler)
 *
 * Position 기반 세부 제어(e.g. TEAM_LEADER만 가능한 작업)는
 * 서비스 레이어에서 req.user.position을 직접 확인한다.
 */
export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('인증이 필요합니다', 401, true, 'UNAUTHORIZED'));
      return;
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      next(new AppError('접근 권한이 없습니다', 403, true, 'FORBIDDEN'));
      return;
    }

    next();
  };
}

/**
 * Position 기반 인가 미들웨어
 * Role 체크 이후 추가적인 Position 제한이 필요할 때 사용한다.
 *
 * 사용 예시:
 *   router.delete(
 *     '/branch/:id',
 *     authenticate,
 *     authorize(Role.ADMIN, Role.OPERATIONS),
 *     authorizePosition(Position.TEAM_LEADER, Position.DEPUTY_LEADER),
 *     handler
 *   )
 */
export function authorizePosition(...positions: Position[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('인증이 필요합니다', 401, true, 'UNAUTHORIZED'));
      return;
    }

    if (positions.length > 0 && !positions.includes(req.user.position)) {
      next(new AppError('접근 권한이 없습니다', 403, true, 'FORBIDDEN'));
      return;
    }

    next();
  };
}
