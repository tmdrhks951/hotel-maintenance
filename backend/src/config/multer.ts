import multer from 'multer';
import path from 'path';
import { randomBytes } from 'crypto';
import fs from 'fs';
import { env } from './env';

// ================================================================
// 로컬 디스크 스토리지
//
// UPLOAD_DIR 환경변수로 저장 경로 지정 가능 (Railway Volume 등 영구 스토리지 마운트용)
// - 환경변수 미설정 시: process.cwd()/uploads (개발 환경 기본값)
// - Railway 등 컨테이너 환경: 영구 볼륨을 마운트한 경로 지정 필수
//   (미지정 시 컨테이너 재배포마다 업로드 파일 소실)
// ================================================================

export const UPLOAD_DIR =
  process.env.UPLOAD_DIR && process.env.UPLOAD_DIR.trim().length > 0
    ? process.env.UPLOAD_DIR
    : path.join(process.cwd(), 'uploads');

// 서버 시작 시 uploads 디렉토리 자동 생성
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
// 시작 로그: Railway 로그에서 실제 사용 중인 경로 확인용
// eslint-disable-next-line no-console
console.log(`[multer] UPLOAD_DIR = ${UPLOAD_DIR}`);

// STORAGE_DRIVER=minio: 버퍼로 받아 storage.ts가 오브젝트 스토리지에 업로드
// STORAGE_DRIVER=local: 디스크에 바로 저장 (기존 동작)
const storage =
  env.STORAGE_DRIVER === 'minio'
    ? multer.memoryStorage()
    : multer.diskStorage({
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
