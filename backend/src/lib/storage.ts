import path from 'path';
import { randomBytes } from 'crypto';
import { env } from '@/config/env';
import { getMinioClient } from '@/config/minio';
import { AppError } from '@/common/errors/AppError';

// ================================================================
// 파일 저장 어댑터
//
// STORAGE_DRIVER=local (기본): multer diskStorage가 UPLOAD_DIR에 이미 저장 → /uploads 상대경로 반환
// STORAGE_DRIVER=minio       : multer memoryStorage 버퍼를 S3 호환 스토리지(MinIO/S3/R2)에 업로드
//                              → 절대 URL 반환 (프론트 PhotoGallery는 절대 URL을 그대로 사용)
// ================================================================

function objectPublicBase(): string {
  if (env.MINIO_PUBLIC_URL) {
    return env.MINIO_PUBLIC_URL.replace(/\/+$/, '');
  }
  const protocol = env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
  const defaultPort = env.MINIO_USE_SSL === 'true' ? '443' : '80';
  const portPart = env.MINIO_PORT === defaultPort ? '' : `:${env.MINIO_PORT}`;
  return `${protocol}://${env.MINIO_ENDPOINT}${portPart}`;
}

/**
 * 업로드된 파일을 저장하고 media.url에 넣을 URL을 반환한다.
 * 오브젝트 스토리지 업로드는 DB 트랜잭션 밖에서 호출할 것 (외부 IO로 트랜잭션 지연 방지).
 */
export async function storeUploadedFile(file: Express.Multer.File): Promise<string> {
  if (env.STORAGE_DRIVER === 'minio') {
    const client = getMinioClient();
    if (!client) {
      throw new AppError(
        '파일 저장소에 연결할 수 없습니다. 잠시 후 다시 시도해주세요',
        503,
        true,
        'STORAGE_UNAVAILABLE',
      );
    }
    if (!file.buffer) {
      // memoryStorage가 아닌 경우 방어 — 설정 불일치
      throw new AppError('파일 데이터를 읽을 수 없습니다', 500, true, 'UPLOAD_ERROR');
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const key = `${Date.now()}-${randomBytes(8).toString('hex')}${ext}`;

    await client.putObject(env.MINIO_BUCKET, key, file.buffer, file.size, {
      'Content-Type': file.mimetype,
    });

    return `${objectPublicBase()}/${env.MINIO_BUCKET}/${key}`;
  }

  // local: multer diskStorage가 UPLOAD_DIR에 저장 완료 (app.ts가 /uploads로 정적 서빙)
  return `/uploads/${file.filename}`;
}
