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
import { analyticsRouter } from '../analytics/analytics.routes.js';
import { organizationHealthInsuranceRouter } from './organization-health-insurance.routes.js';
import { organizationWhatsAppSettingsController } from '../whatsapp/controllers/organization-whatsapp-settings.controller.js';
import { appointmentNotificationController } from '../whatsapp/controllers/appointment-notification.controller.js';
import { clinicalController } from '../clinical/controllers/clinical.controller.js';

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
  '/:organizationId/patients',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin', 'staff')),
  asyncHandler(organizationController.listPatients)
);
organizationsRouter.get(
  '/:organizationId/patients/:patientProfileId',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin', 'staff')),
  asyncHandler(organizationController.getPatientDetail)
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
  '/:organizationId/subscription/discount/validate',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin')),
  asyncHandler(organizationController.validateSubscriptionDiscount)
);
organizationsRouter.post(
  '/:organizationId/subscription/checkout',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin')),
  asyncHandler(organizationController.checkoutSubscription)
);


organizationsRouter.get(
  '/:organizationId/whatsapp-settings',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin', 'manager', 'staff')),
  asyncHandler(organizationWhatsAppSettingsController.get)
);
organizationsRouter.patch(
  '/:organizationId/whatsapp-settings',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin', 'manager')),
  asyncHandler(organizationWhatsAppSettingsController.upsert)
);
organizationsRouter.put(
  '/:organizationId/whatsapp-settings',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin', 'manager')),
  asyncHandler(organizationWhatsAppSettingsController.upsert)
);
organizationsRouter.get(
  '/:organizationId/whatsapp-notifications',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin', 'manager', 'staff')),
  asyncHandler(appointmentNotificationController.listByOrganization)
);
organizationsRouter.get(
  '/:organizationId/whatsapp/health',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin', 'manager', 'staff')),
  asyncHandler(organizationWhatsAppSettingsController.health)
);
organizationsRouter.post(
  '/:organizationId/whatsapp/test',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin', 'manager')),
  asyncHandler(organizationWhatsAppSettingsController.test)
);
organizationsRouter.get(
  '/:organizationId/appointments/:appointmentId/notifications',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin', 'staff')),
  asyncHandler(appointmentNotificationController.listByAppointment)
);


organizationsRouter.get(
  '/:organizationId/internal-messages',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin', 'manager', 'staff')),
  asyncHandler(clinicalController.organizationMessages)
);
organizationsRouter.post(
  '/:organizationId/appointments/:appointmentId/internal-messages',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin', 'manager', 'staff')),
  asyncHandler(clinicalController.createOrganizationAppointmentMessage)
);
organizationsRouter.post(
  '/:organizationId/internal-messages/:messageId/reply',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin', 'manager', 'staff')),
  asyncHandler(clinicalController.replyOrganizationMessage)
);
organizationsRouter.patch(
  '/:organizationId/internal-messages/:messageId/read',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin', 'manager', 'staff')),
  asyncHandler(clinicalController.readOrganizationMessage)
);
organizationsRouter.patch(
  '/:organizationId/internal-messages/:messageId/resolve',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin', 'manager', 'staff')),
  asyncHandler(clinicalController.resolveOrganizationMessage)
);

organizationsRouter.use('/:organizationId/professionals', professionalsRouter);
organizationsRouter.use('/:organizationId/specialties', specialtiesRouter);
organizationsRouter.use('/:organizationId/professionals/:professionalId', professionalAvailabilityRouter);
organizationsRouter.use('/:organizationId/appointments', appointmentsRouter);
organizationsRouter.use('/:organizationId/health-insurances', organizationHealthInsuranceRouter);

organizationsRouter.use('/:organizationId/reminder-rules', organizationReminderRouter);
organizationsRouter.use('/:organizationId/analytics', analyticsRouter);
