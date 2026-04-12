import { Client as MinioClient } from 'minio';
import { env } from './env';

// TODO: STEP 2+에서 실제 파일 업로드/다운로드 기능 연결

let minioClient: MinioClient | null = null;

export function getMinioClient(): MinioClient | null {
  return minioClient;
}

export async function connectMinio(): Promise<void> {
  try {
    minioClient = new MinioClient({
      endPoint: env.MINIO_ENDPOINT,
      port: parseInt(env.MINIO_PORT, 10),
      useSSL: false,
      accessKey: env.MINIO_ACCESS_KEY,
      secretKey: env.MINIO_SECRET_KEY,
    });

    // 연결 확인용 ping
    await minioClient.listBuckets();
    console.log('✅ MinIO connected');
  } catch (error) {
    console.warn('⚠️  MinIO connection failed (non-fatal):', (error as Error).message);
    minioClient = null;
  }
}
