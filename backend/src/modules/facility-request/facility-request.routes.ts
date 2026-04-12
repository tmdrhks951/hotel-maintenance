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
  getQcCompletedHandler,
  qcVerifyHandler,
  getOperationsPendingHandler,
  operationsConfirmHandler,
  getQcHistoryHandler,
  updateFacilityRequestHandler,
  deleteFacilityRequestHandler,
  reopenFacilityRequestHandler,
  getOperationsDashboardHandler,
  getWorkHistoryHandler,
} from './facility-request.controller';
import {
  getCommentsHandler,
  createCommentHandler,
  deleteCommentHandler,
} from '../comment/comment.controller';

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

// GET /facility-requests/qc-completed  (STEP 8 — QC/ADMIN)
router.get('/qc-completed', authorize(Role.QC, Role.ADMIN), getQcCompletedHandler);

// GET /facility-requests/operations-pending  (STEP 8 — OPERATIONS/ADMIN/VENDOR)
router.get('/operations-pending', authorize(Role.OPERATIONS, Role.ADMIN, Role.VENDOR), getOperationsPendingHandler);

// GET /facility-requests/qc-history  (STEP 9 — QC/ADMIN)
router.get('/qc-history', authorize(Role.QC, Role.ADMIN), getQcHistoryHandler);

// GET /facility-requests/operations-dashboard  (OPERATIONS/ADMIN/VENDOR)
router.get('/operations-dashboard', authorize(Role.OPERATIONS, Role.ADMIN, Role.VENDOR), getOperationsDashboardHandler);

// GET /facility-requests/work-history  (QC/OPERATIONS/ADMIN)
router.get('/work-history', getWorkHistoryHandler);

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

// GET /facility-requests/:id  (STEP 6/8 — QC/OPERATIONS/ADMIN/VENDOR)
router.get('/:id', authorize(Role.QC, Role.OPERATIONS, Role.ADMIN, Role.VENDOR), getFacilityRequestDetailHandler);

// PATCH /facility-requests/:id/qc-review  (STEP 6 — QC/ADMIN)
router.patch('/:id/qc-review', authorize(Role.QC, Role.ADMIN), qcReviewHandler);

// PATCH /facility-requests/:id/schedule  (STEP 6 — QC/ADMIN)
router.patch('/:id/schedule', authorize(Role.QC, Role.ADMIN), updateScheduleHandler);

// PATCH /facility-requests/:id/assign  (STEP 6 — QC/ADMIN)
router.patch('/:id/assign', authorize(Role.QC, Role.ADMIN), assignWorkerHandler);

// PATCH /facility-requests/:id/qc-verify  (STEP 8 — QC/ADMIN)
router.patch('/:id/qc-verify', authorize(Role.QC, Role.ADMIN), qcVerifyHandler);

// PATCH /facility-requests/:id/operations-confirm  (STEP 8 — OPERATIONS/ADMIN)
router.patch('/:id/operations-confirm', authorize(Role.OPERATIONS, Role.ADMIN), operationsConfirmHandler);

// PATCH /facility-requests/:id/reopen  (STEP 11 — QC/OPERATIONS/ADMIN)
router.patch('/:id/reopen', authorize(Role.QC, Role.OPERATIONS, Role.ADMIN), reopenFacilityRequestHandler);

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

// PATCH /facility-requests/:id  (수정 — ADMIN + QC/OPERATIONS 팀장급, 서비스에서 position 체크)
router.patch('/:id', authorize(Role.QC, Role.OPERATIONS, Role.ADMIN), updateFacilityRequestHandler);

// DELETE /facility-requests/:id  (삭제 — ADMIN + QC/OPERATIONS 팀장급, 서비스에서 position 체크)
router.delete('/:id', authorize(Role.QC, Role.OPERATIONS, Role.ADMIN), deleteFacilityRequestHandler);

// ----------------------------------------------------------------
// 댓글 (STEP 9) — 모든 인증 사용자
// ----------------------------------------------------------------

// GET /facility-requests/:id/comments
router.get('/:id/comments', getCommentsHandler);

// POST /facility-requests/:id/comments
router.post('/:id/comments', createCommentHandler);

// DELETE /facility-requests/:id/comments/:commentId
router.delete('/:id/comments/:commentId', deleteCommentHandler);

export default router;
