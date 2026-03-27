import { Router } from 'express';
import { env } from '../../config/env.js';
import { asyncHandler } from '../../core/async-handler.js';
import { createRateLimiter } from '../../core/rate-limit-middleware.js';
import { authController } from './controllers/auth.controller.js';
import { requireAuth, requireRoles } from './middleware/auth.middleware.js';

export const authRouter = Router();

const authRateLimiter = createRateLimiter({
  keyPrefix: 'auth',
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX
});

authRouter.post('/register', authRateLimiter, asyncHandler(authController.register));
authRouter.get('/verify-email', asyncHandler(authController.verifyEmail));
authRouter.post('/login', authRateLimiter, asyncHandler(authController.login));
authRouter.post('/google', authRateLimiter, asyncHandler(authController.loginWithGoogle));
authRouter.post('/refresh', authRateLimiter, asyncHandler(authController.refresh));
authRouter.post('/logout', authRateLimiter, asyncHandler(authController.logout));
authRouter.post('/forgot-password', authRateLimiter, asyncHandler(authController.forgotPassword));
authRouter.post('/reset-password', authRateLimiter, asyncHandler(authController.resetPassword));

authRouter.get('/me', requireAuth, asyncHandler(authController.me));
authRouter.post('/change-password', requireAuth, asyncHandler(authController.changePassword));
authRouter.post('/logout-all', requireAuth, asyncHandler(authController.logoutAll));
authRouter.get('/admin-only', requireAuth, requireRoles('admin'), asyncHandler(authController.adminOnly));
