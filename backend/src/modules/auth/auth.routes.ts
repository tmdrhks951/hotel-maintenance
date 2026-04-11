import { Router } from 'express';
import { loginHandler, refreshHandler, logoutHandler } from './auth.controller';

const router = Router();

// POST /api/v1/auth/login
router.post('/login', loginHandler);

// POST /api/v1/auth/refresh
router.post('/refresh', refreshHandler);

// POST /api/v1/auth/logout
router.post('/logout', logoutHandler);

export default router;
