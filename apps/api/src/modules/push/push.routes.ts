import { Router } from 'express';
import { env } from '../../config/env.js';
import { asyncHandler } from '../../core/async-handler.js';
import { createRateLimiter } from '../../core/rate-limit-middleware.js';
import { requireAuth, requireRoles } from '../auth/middleware/auth.middleware.js';
import { pushController } from './controllers/push.controller.js';

export const pushRouter = Router();

const pushRateLimiter = createRateLimiter({
  keyPrefix: 'push',
  windowMs: env.PUSH_RATE_LIMIT_WINDOW_MS,
  max: env.PUSH_RATE_LIMIT_MAX
});

pushRouter.post('/devices', requireAuth, pushRateLimiter, asyncHandler(pushController.register));
pushRouter.patch('/devices/token', requireAuth, pushRateLimiter, asyncHandler(pushController.refresh));
pushRouter.delete('/devices', requireAuth, pushRateLimiter, asyncHandler(pushController.unregister));
pushRouter.get('/devices', requireAuth, asyncHandler(pushController.listMine));
pushRouter.post('/send-test', requireAuth, pushRateLimiter, asyncHandler(pushController.sendTestMine));

pushRouter.post('/admin/send', requireAuth, requireRoles('admin'), asyncHandler(pushController.sendAdmin));
