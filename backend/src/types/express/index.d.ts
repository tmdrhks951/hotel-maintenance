import { Role, Position } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      /**
       * authenticate 미들웨어 통과 후 주입되는 인증 정보
       * access token payload에서 파싱한 최소 정보만 포함
       */
      user?: {
        id: string;
        role: Role;
        position: Position;
        branchId: string | null;
        branchIds: string[];
      };
    }
  }
}

export {};
