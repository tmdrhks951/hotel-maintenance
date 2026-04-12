import { Router } from 'express';
import healthRoutes from '@/modules/health/health.routes';
import authRoutes from '@/modules/auth/auth.routes';
import userRoutes from '@/modules/user/user.routes';
import branchRoutes from '@/modules/branch/branch.routes';
import { locationRouter } from '@/modules/location/location.routes';
import facilityRequestRoutes from '@/modules/facility-request/facility-request.routes';
import notificationRoutes from '@/modules/notification/notification.routes';
import adminRoutes from '@/modules/admin/admin.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/branches', branchRoutes);
router.use('/locations', locationRouter);
router.use('/facility-requests', facilityRequestRoutes);
router.use('/notifications', notificationRoutes);   // STEP 10
router.use('/admin', adminRoutes);                  // STEP 10

export default router;
