import { Router, Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '@/common/middleware/authenticate';
import { authorize } from '@/common/middleware/authorize';
import { imageUpload } from '@/config/multer';
import { AppError } from '@/common/errors/AppError';
import {
  duplicateCheckHandler,
  getQcQueueHandler,
  getFacilityRequestDetailHandler,
  createFacilityRequestHandler,
  qcReviewHandler,
  updateScheduleHandler,
  assignWorkerHandler,
  completeWorkHandler,
} from './facility-request.controller';

const router = Router();

// 모든 라우트: 인증 필수
router.use(authenticate);

// ----------------------------------------------------------------
// 파라미터 없는 경로 — 반드시 /:id 앞에 위치
// ----------------------------------------------------------------

// GET /facility-requests/duplicate-check  (STEP 5 — 모든 인증 사용자)
router.get('/duplicate-check', duplicateCheckHandler);

// GET /facility-requests/qc-queue  (STEP 6 — QC/ADMIN)
router.get('/qc-queue', authorize(Role.QC, Role.ADMIN), getQcQueueHandler);

// POST /facility-requests  (STEP 5 — multipart/form-data)
router.post(
  '/',
  (req: Request, res: Response, next: NextFunction) => {
    imageUpload.single('image')(req, res, (err) => {
      if (err) {
        return next(new AppError(err.message ?? '파일 업로드 오류', 400, true, 'UPLOAD_ERROR'));
      }
      next();
    });
  },
  createFacilityRequestHandler,
);

// ----------------------------------------------------------------
// /:id 파라미터 경로
// ----------------------------------------------------------------

// GET /facility-requests/:id  (STEP 6 — QC/ADMIN)
router.get('/:id', authorize(Role.QC, Role.ADMIN), getFacilityRequestDetailHandler);

// PATCH /facility-requests/:id/qc-review  (STEP 6 — QC/ADMIN)
router.patch('/:id/qc-review', authorize(Role.QC, Role.ADMIN), qcReviewHandler);

// PATCH /facility-requests/:id/schedule  (STEP 6 — QC/ADMIN)
router.patch('/:id/schedule', authorize(Role.QC, Role.ADMIN), updateScheduleHandler);

// PATCH /facility-requests/:id/assign  (STEP 6 — QC/ADMIN)
router.patch('/:id/assign', authorize(Role.QC, Role.ADMIN), assignWorkerHandler);

// POST /facility-requests/:id/complete  (STEP 7 — QC/ADMIN, multipart/form-data)
router.post(
  '/:id/complete',
  authorize(Role.QC, Role.ADMIN),
  (req: Request, res: Response, next: NextFunction) => {
    imageUpload.single('image')(req, res, (err) => {
      if (err) {
        return next(new AppError(err.message ?? '파일 업로드 오류', 400, true, 'UPLOAD_ERROR'));
      }
      next();
    });
  },
  completeWorkHandler,
);

export default router;
