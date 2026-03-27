import { Router } from 'express';
import { asyncHandler } from '../../core/async-handler.js';
import { requireAuth, requireRoles } from '../auth/middleware/auth.middleware.js';
import { AdminController } from './admin.controller.js';

const controller = new AdminController();

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRoles('admin'));

adminRouter.get('/dashboard', asyncHandler(controller.dashboard));
adminRouter.get('/users', asyncHandler(controller.listUsers));
adminRouter.patch('/users/:userId/role', asyncHandler(controller.updateUserRole));
adminRouter.get('/payments', asyncHandler(controller.listPayments));
adminRouter.get('/subscriptions', asyncHandler(controller.listSubscriptions));
adminRouter.post('/notifications/send', asyncHandler(controller.sendNotification));
adminRouter.get('/avatars', asyncHandler(controller.listAvatars));
adminRouter.delete('/avatars/:userId', asyncHandler(controller.deleteAvatar));
adminRouter.get('/monetization-config', asyncHandler(controller.getMonetizationConfig));
adminRouter.patch('/monetization-config', asyncHandler(controller.updateMonetizationConfig));
