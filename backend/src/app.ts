import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { env } from '@/config/env';
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

  // 요청 로깅
  app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // 업로드 파일 정적 서빙
  // URL: GET /uploads/:filename
  // TODO: 운영 환경에서는 MinIO presigned URL로 교체
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // API 라우터
  app.use('/api/v1', routes);

  // 404 핸들러 (라우터 이후)
  app.use(notFoundHandler);

  // 에러 핸들러 (반드시 마지막)
  app.use(errorHandler);

  return app;
}
