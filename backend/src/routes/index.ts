import { Router } from 'express';
import healthRoutes from '@/modules/health/health.routes';
import authRoutes from '@/modules/auth/auth.routes';
import userRoutes from '@/modules/user/user.routes';
import branchRoutes from '@/modules/branch/branch.routes';
import { locationRouter } from '@/modules/location/location.routes';
import facilityRequestRoutes from '@/modules/facility-request/facility-request.routes';
import notificationRoutes from '@/modules/notification/notification.routes';
import adminRoutes from '@/modules/admin/admin.routes';
import recurringScheduleRoutes from '@/modules/recurring-schedule/recurring-schedule.routes';
/// [STEP12 ADD START]
import noticeRoutes from '@/modules/notice/notice.routes';
import manualRoutes from '@/modules/manual/manual.routes';
/// [STEP12 ADD END]

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/branches', branchRoutes);
router.use('/locations', locationRouter);
router.use('/facility-requests', facilityRequestRoutes);
router.use('/notifications', notificationRoutes);   // STEP 10
router.use('/admin', adminRoutes);                  // STEP 10
router.use('/recurring-schedules', recurringScheduleRoutes);
/// [STEP12 ADD START]
router.use('/notices', noticeRoutes);
router.use('/manuals', manualRoutes);
/// [STEP12 ADD END]

export default router;
