import { Router } from 'express';
import { env } from '../../config/env.js';
import { asyncHandler } from '../../core/async-handler.js';
import { createRateLimiter } from '../../core/rate-limit-middleware.js';
import { requireAuth, requireRoles } from '../auth/middleware/auth.middleware.js';
import { PaymentsController } from './controllers/payments.controller.js';

const controller = new PaymentsController();

export const paymentsRouter = Router();

const webhookRateLimiter = createRateLimiter({
  keyPrefix: 'payments-webhook',
  windowMs: env.WEBHOOK_RATE_LIMIT_WINDOW_MS,
  max: env.WEBHOOK_RATE_LIMIT_MAX
});

paymentsRouter.post('/webhooks/mercadopago', webhookRateLimiter, asyncHandler(controller.webhook));

paymentsRouter.post('/one-time', requireAuth, asyncHandler(controller.createOneTime));
paymentsRouter.post('/subscriptions', requireAuth, asyncHandler(controller.createSubscription));
paymentsRouter.get('/orders/:orderId', requireAuth, asyncHandler(controller.getOrderStatus));
paymentsRouter.get('/subscriptions/me', requireAuth, asyncHandler(controller.getMySubscriptionStatus));

paymentsRouter.get('/admin/transactions', requireAuth, requireRoles('admin'), asyncHandler(controller.listAdminTransactions));
paymentsRouter.get('/admin/subscriptions', requireAuth, requireRoles('admin'), asyncHandler(controller.listAdminSubscriptions));
