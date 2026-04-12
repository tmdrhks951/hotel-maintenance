import multer from 'multer';
import path from 'path';
import { randomBytes } from 'crypto';
import fs from 'fs';

// ================================================================
// 로컬 디스크 스토리지 (개발 환경)
//
// TODO: 운영 환경에서는 MinIO 스토리지로 교체
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

// 이미지 + 영상 (최대 5초 → 파일 크기로 제한) 모두 허용
const ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
  'video/mp4',
  'video/quicktime',   // .mov
  'video/webm',
  'video/3gpp',        // 모바일
];

export const mediaUpload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB (영상 포함)
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('이미지 또는 영상(mp4, mov, webm) 파일만 업로드 가능합니다'));
    }
  },
});

// 하위 호환: 기존 imageUpload 이름 유지
export const imageUpload = mediaUpload;
