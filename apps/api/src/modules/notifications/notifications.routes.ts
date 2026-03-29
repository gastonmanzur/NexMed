import { Router } from 'express';
import { asyncHandler } from '../../core/async-handler.js';
import { requireAuth } from '../auth/middleware/auth.middleware.js';
import { notificationController } from './controllers/notification.controller.js';

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);
notificationsRouter.get('/me', asyncHandler(notificationController.me));
notificationsRouter.patch('/:notificationId/read', asyncHandler(notificationController.markRead));
