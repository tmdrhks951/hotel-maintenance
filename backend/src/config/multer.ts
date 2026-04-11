import multer from 'multer';
import path from 'path';
import { randomBytes } from 'crypto';
import fs from 'fs';

// ================================================================
// 로컬 디스크 스토리지 (개발 환경)
//
// TODO: 운영 환경에서는 MinIO 스토리지로 교체
// config/minio.ts의 minioClient를 활용해
// multer-s3 또는 커스텀 스토리지 엔진으로 전환 가능
// ================================================================

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// 서버 시작 시 uploads 디렉토리 자동 생성
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${randomBytes(8).toString('hex')}`;
    cb(null, `${unique}${ext}`);
  },
});

export const imageUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다'));
    }
  },
});
