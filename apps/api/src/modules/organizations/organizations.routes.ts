import { Router } from 'express';
import { asyncHandler } from '../../core/async-handler.js';
import { requireAuth } from '../auth/middleware/auth.middleware.js';
import { organizationController } from './controllers/organization.controller.js';
import { requireOrganizationMember } from './middleware/organization-auth.middleware.js';

export const organizationsRouter = Router();

organizationsRouter.use(requireAuth);

organizationsRouter.post('/', asyncHandler(organizationController.create));
organizationsRouter.get('/my', asyncHandler(organizationController.myOrganizations));
organizationsRouter.get('/:organizationId', asyncHandler(requireOrganizationMember), asyncHandler(organizationController.getById));
organizationsRouter.get(
  '/:organizationId/membership',
  asyncHandler(requireOrganizationMember),
  asyncHandler(organizationController.myMembershipInOrganization)
);
