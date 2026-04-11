import { Router } from 'express';
import healthRoutes from '@/modules/health/health.routes';
import authRoutes from '@/modules/auth/auth.routes';
import userRoutes from '@/modules/user/user.routes';
import branchRoutes from '@/modules/branch/branch.routes';
import { locationRouter } from '@/modules/location/location.routes';
import facilityRequestRoutes from '@/modules/facility-request/facility-request.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/branches', branchRoutes);             // /branches/:branchId/locations 중첩 포함
router.use('/locations', locationRouter);          // /locations/:locationId 독립 경로
router.use('/facility-requests', facilityRequestRoutes);

// TODO: STEP 6+ 추가
// router.use('/notifications', notificationRoutes);

export default router;
