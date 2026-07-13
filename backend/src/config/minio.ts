import { Client as MinioClient } from 'minio';
import { env } from './env';

// S3 호환 오브젝트 스토리지 (MinIO / AWS S3 / Cloudflare R2)
// STORAGE_DRIVER=minio 일 때 lib/storage.ts가 실제 업로드에 사용한다.

let minioClient: MinioClient | null = null;

export function getMinioClient(): MinioClient | null {
  return minioClient;
}

export async function connectMinio(): Promise<void> {
  // local 드라이버면 연결 시도 자체를 생략 (불필요한 경고 로그 방지)
  if (env.STORAGE_DRIVER !== 'minio') {
    console.log('ℹ️  Storage driver = local (오브젝트 스토리지 미사용)');
    return;
  }

  try {
    minioClient = new MinioClient({
      endPoint: env.MINIO_ENDPOINT,
      port: parseInt(env.MINIO_PORT, 10),
      useSSL: env.MINIO_USE_SSL === 'true',
      accessKey: env.MINIO_ACCESS_KEY,
      secretKey: env.MINIO_SECRET_KEY,
    });

    // 버킷 확인 및 생성
    const bucketExists = await minioClient.bucketExists(env.MINIO_BUCKET);
    if (!bucketExists) {
      await minioClient.makeBucket(env.MINIO_BUCKET);
      console.log(`✅ MinIO bucket created: ${env.MINIO_BUCKET}`);
    }

    // 업로드 파일 공개 읽기 정책 (S3/R2 등 정책 API 미지원 스토리지는 경고만)
    try {
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${env.MINIO_BUCKET}/*`],
          },
        ],
      };
      await minioClient.setBucketPolicy(env.MINIO_BUCKET, JSON.stringify(policy));
    } catch (policyErr) {
      console.warn(
        '⚠️  버킷 공개 정책 설정 실패 — 스토리지 콘솔에서 공개 읽기 또는 MINIO_PUBLIC_URL(CDN) 설정 필요:',
        (policyErr as Error).message,
      );
    }

    console.log('✅ Object storage connected');
  } catch (error) {
    // STORAGE_DRIVER=minio인데 연결 실패 → 업로드 시 503으로 명확히 실패 (silent 유실 방지)
    console.error(
      '❌ Object storage connection failed — 업로드가 동작하지 않습니다:',
      (error as Error).message,
    );
    minioClient = null;
  }
}
