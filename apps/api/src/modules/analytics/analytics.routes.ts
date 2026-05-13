import { Router } from 'express';
import { asyncHandler } from '../../core/async-handler.js';
import { requireOrganizationMember, requireOrganizationRole } from '../organizations/middleware/organization-auth.middleware.js';
import { analyticsController } from './controllers/analytics.controller.js';

export const analyticsRouter = Router({ mergeParams: true });

analyticsRouter.get(
  '/summary',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin', 'staff')),
  asyncHandler(analyticsController.summary)
);
