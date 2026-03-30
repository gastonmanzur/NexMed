import { Router } from 'express';
import { asyncHandler } from '../../core/async-handler.js';
import { requireAuth } from '../auth/middleware/auth.middleware.js';
import { organizationController } from '../organizations/controllers/organization.controller.js';

export const plansRouter = Router();

plansRouter.use(requireAuth);
plansRouter.get('/', asyncHandler(organizationController.listPlans));
