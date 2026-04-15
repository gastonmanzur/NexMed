import { Router } from 'express';
import { asyncHandler } from '../../core/async-handler.js';
import { requireAuth, requireRoles } from '../auth/middleware/auth.middleware.js';
import { AdminController } from './admin.controller.js';

const controller = new AdminController();

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRoles('admin'));

adminRouter.get('/dashboard', asyncHandler(controller.dashboard));
adminRouter.get('/summary', asyncHandler(controller.summary));
adminRouter.get('/plans', asyncHandler(controller.listPlans));
adminRouter.post('/plans', asyncHandler(controller.createPlan));
adminRouter.patch('/plans/:planId', asyncHandler(controller.updatePlan));
adminRouter.get('/discounts', asyncHandler(controller.listDiscounts));
adminRouter.post('/discounts', asyncHandler(controller.createDiscount));
adminRouter.get('/discounts/:discountId', asyncHandler(controller.getDiscount));
adminRouter.patch('/discounts/:discountId', asyncHandler(controller.updateDiscount));
adminRouter.get('/users', asyncHandler(controller.listUsers));
adminRouter.patch('/users/:userId/role', asyncHandler(controller.updateUserRole));
adminRouter.get('/payments', asyncHandler(controller.listPayments));
adminRouter.get('/subscriptions', asyncHandler(controller.listSubscriptions));
adminRouter.post('/notifications/send', asyncHandler(controller.sendNotification));
adminRouter.get('/avatars', asyncHandler(controller.listAvatars));
adminRouter.delete('/avatars/:userId', asyncHandler(controller.deleteAvatar));
adminRouter.get('/feedback', asyncHandler(controller.listFeedback));
adminRouter.patch('/feedback/:feedbackId', asyncHandler(controller.updateFeedback));
adminRouter.get('/organizations', asyncHandler(controller.listOrganizations));
adminRouter.get('/organizations/:organizationId', asyncHandler(controller.getOrganizationDetail));
adminRouter.patch('/organizations/:organizationId/status', asyncHandler(controller.updateOrganizationStatus));
adminRouter.patch('/organizations/:organizationId/beta', asyncHandler(controller.updateOrganizationBeta));
adminRouter.get('/monetization-config', asyncHandler(controller.getMonetizationConfig));
adminRouter.patch('/monetization-config', asyncHandler(controller.updateMonetizationConfig));
