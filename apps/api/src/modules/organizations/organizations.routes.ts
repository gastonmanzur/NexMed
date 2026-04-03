import { Router } from 'express';
import { asyncHandler } from '../../core/async-handler.js';
import { requireAuth } from '../auth/middleware/auth.middleware.js';
import {
  organizationController,
  organizationLogoMulterErrorHandler,
  organizationLogoUploadMiddleware
} from './controllers/organization.controller.js';
import { requireOrganizationMember, requireOrganizationRole } from './middleware/organization-auth.middleware.js';
import { professionalsRouter, specialtiesRouter } from '../professionals/professionals.routes.js';
import { professionalAvailabilityRouter } from '../availability/availability.routes.js';
import { appointmentsRouter } from '../appointments/appointments.routes.js';
import { organizationReminderRouter } from '../reminders/reminder.routes.js';

export const organizationsRouter = Router();

organizationsRouter.use(requireAuth);

const uploadOrganizationLogo = (
  req: Parameters<typeof organizationLogoUploadMiddleware>[0],
  res: Parameters<typeof organizationLogoUploadMiddleware>[1],
  next: Parameters<typeof organizationLogoUploadMiddleware>[2]
): void => {
  organizationLogoUploadMiddleware(req, res, (error: unknown) => {
    if (error) {
      try {
        organizationLogoMulterErrorHandler(error);
      } catch (mappedError) {
        next(mappedError);
        return;
      }
    }
    next();
  });
};

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
organizationsRouter.post(
  '/:organizationId/logo',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin')),
  uploadOrganizationLogo,
  asyncHandler(organizationController.uploadLogo)
);
organizationsRouter.delete(
  '/:organizationId/logo',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin')),
  asyncHandler(organizationController.deleteLogo)
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


organizationsRouter.get(
  '/:organizationId/invite-link',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin')),
  asyncHandler(organizationController.getInviteLink)
);
organizationsRouter.post(
  '/:organizationId/invite-link/regenerate',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin')),
  asyncHandler(organizationController.regenerateInviteLink)
);
organizationsRouter.get(
  '/:organizationId/subscription',
  asyncHandler(requireOrganizationMember),
  asyncHandler(organizationController.getSubscription)
);
organizationsRouter.post(
  '/:organizationId/subscription/checkout',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin')),
  asyncHandler(organizationController.checkoutSubscription)
);

organizationsRouter.use('/:organizationId/professionals', professionalsRouter);
organizationsRouter.use('/:organizationId/specialties', specialtiesRouter);
organizationsRouter.use('/:organizationId/professionals/:professionalId', professionalAvailabilityRouter);
organizationsRouter.use('/:organizationId/appointments', appointmentsRouter);

organizationsRouter.use('/:organizationId/reminder-rules', organizationReminderRouter);
