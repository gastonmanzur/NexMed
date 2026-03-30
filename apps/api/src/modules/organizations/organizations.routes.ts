import { Router } from 'express';
import { asyncHandler } from '../../core/async-handler.js';
import { requireAuth } from '../auth/middleware/auth.middleware.js';
import { organizationController } from './controllers/organization.controller.js';
import { requireOrganizationMember, requireOrganizationRole } from './middleware/organization-auth.middleware.js';
import { professionalsRouter, specialtiesRouter } from '../professionals/professionals.routes.js';
import { professionalAvailabilityRouter } from '../availability/availability.routes.js';
import { appointmentsRouter } from '../appointments/appointments.routes.js';
import { organizationReminderRouter } from '../reminders/reminder.routes.js';

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
organizationsRouter.get(
  '/:organizationId/profile',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin', 'staff')),
  asyncHandler(organizationController.getProfile)
);
organizationsRouter.patch(
  '/:organizationId/profile',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin')),
  asyncHandler(organizationController.updateProfile)
);
organizationsRouter.get(
  '/:organizationId/onboarding-status',
  asyncHandler(requireOrganizationMember),
  asyncHandler(organizationController.getOnboardingStatus)
);
organizationsRouter.get(
  '/:organizationId/dashboard-summary',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin', 'staff')),
  asyncHandler(organizationController.getDashboardSummary)
);

organizationsRouter.use('/:organizationId/professionals', professionalsRouter);
organizationsRouter.use('/:organizationId/specialties', specialtiesRouter);
organizationsRouter.use('/:organizationId/professionals/:professionalId', professionalAvailabilityRouter);
organizationsRouter.use('/:organizationId/appointments', appointmentsRouter);

organizationsRouter.use('/:organizationId/reminder-rules', organizationReminderRouter);
