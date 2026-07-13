import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('4000'),
  DATABASE_URL: z
    .string()
    .default('postgresql://postgres:password@localhost:5432/hotel_maintenance'),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // 파일 저장 드라이버 — local: 디스크(UPLOAD_DIR), minio: S3 호환 오브젝트 스토리지(MinIO/S3/R2)
  STORAGE_DRIVER: z.enum(['local', 'minio']).default('local'),
  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.string().default('9000'),
  MINIO_USE_SSL: z.string().default('false'),
  MINIO_ACCESS_KEY: z.string().default('minioadmin'),
  MINIO_SECRET_KEY: z.string().default('minioadmin'),
  MINIO_BUCKET: z.string().default('hotel-files'),
  /// 오브젝트 공개 URL 베이스 (CDN/R2 퍼블릭 도메인 등). 미설정 시 endpoint 기반 생성
  MINIO_PUBLIC_URL: z.string().optional(),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // SMS 발송 — none: 미연동(개발 모드에서만 인증 가능), aligo: 알리고 문자 API
  SMS_PROVIDER: z.enum(['none', 'aligo']).default('none'),
  ALIGO_API_KEY: z.string().optional(),
  ALIGO_USER_ID: z.string().optional(),
  /// 알리고에 사전 등록된 발신번호
  SMS_SENDER: z.string().optional(),

  // JWT — access/refresh 시크릿은 반드시 서로 달라야 함
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  // bcrypt
  BCRYPT_ROUNDS: z.string().default('12'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

// 프로덕션 안전장치 — 로컬 기본값으로 조용히 기동하는 사고 방지
if (parsed.data.NODE_ENV === 'production') {
  const requiredInProd = ['DATABASE_URL', 'CORS_ORIGIN'] as const;
  const missing = requiredInProd.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`❌ 프로덕션 필수 환경변수 누락: ${missing.join(', ')}`);
    process.exit(1);
  }
}

export const env = parsed.data;
