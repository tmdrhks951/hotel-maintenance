import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { env } from '@/config/env';
import { UPLOAD_DIR } from '@/config/multer';
import routes from '@/routes/index';
import { errorHandler } from '@/common/errors/errorHandler';
import { notFoundHandler } from '@/common/middleware/notFound';

export function createApp(): express.Application {
  const app = express();

  // 보안 헤더 (uploads 정적 파일을 위해 CSP crossOrigin 허용)
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // CORS
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );

  // 요청 로깅 — 보안: 쿼리스트링(SSE 토큰 등)은 로그에 남기지 않음
  morgan.token('url', (req) => (req as express.Request).originalUrl.split('?')[0]);
  app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Cookie parsing — refresh token httpOnly 쿠키용
  app.use(cookieParser());

  // 업로드 파일 정적 서빙
  // URL: GET /uploads/:filename
  // 실제 디스크 경로는 UPLOAD_DIR 환경변수로 지정 (Railway Volume 등 영구 스토리지)
  app.use('/uploads', express.static(UPLOAD_DIR));

  // 인증 라우트 브루트포스 방지 — 로그인/인증코드/비밀번호 재설정 무제한 시도 차단
  // refresh/logout은 정상 사용 빈도가 높아 제외 (공용 IP 오차단 방지)
  const authLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5분
    limit: env.NODE_ENV === 'production' ? 30 : 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { code: 'RATE_LIMITED', message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요' } },
  });
  for (const path of ['login', 'signup', 'send-code', 'verify-code', 'find-login-id', 'request-password-reset']) {
    app.use(`/api/v1/auth/${path}`, authLimiter);
  }

  // API 라우터
  app.use('/api/v1', routes);

  // 404 핸들러 (라우터 이후)
  app.use(notFoundHandler);

  // 에러 핸들러 (반드시 마지막)
  app.use(errorHandler);

  return app;
}
