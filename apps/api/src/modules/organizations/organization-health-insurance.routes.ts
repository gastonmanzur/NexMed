import { Router } from 'express';
import { asyncHandler } from '../../core/async-handler.js';
import { requireOrganizationMember, requireOrganizationRole } from './middleware/organization-auth.middleware.js';
import { organizationHealthInsuranceController } from './controllers/organization-health-insurance.controller.js';

export const organizationHealthInsuranceRouter = Router({ mergeParams: true });

organizationHealthInsuranceRouter.get('/', asyncHandler(requireOrganizationMember), asyncHandler(requireOrganizationRole('owner', 'admin', 'staff')), asyncHandler(organizationHealthInsuranceController.list));
organizationHealthInsuranceRouter.post('/', asyncHandler(requireOrganizationMember), asyncHandler(requireOrganizationRole('owner', 'admin')), asyncHandler(organizationHealthInsuranceController.create));
organizationHealthInsuranceRouter.patch('/:healthInsuranceId', asyncHandler(requireOrganizationMember), asyncHandler(requireOrganizationRole('owner', 'admin')), asyncHandler(organizationHealthInsuranceController.update));
