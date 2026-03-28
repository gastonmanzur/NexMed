import { Router } from 'express';
import { asyncHandler } from '../../core/async-handler.js';
import { requireOrganizationMember, requireOrganizationRole } from '../organizations/middleware/organization-auth.middleware.js';
import { appointmentsController } from './controllers/appointments.controller.js';

export const appointmentsRouter = Router({ mergeParams: true });

appointmentsRouter.get('/', asyncHandler(requireOrganizationMember), asyncHandler(appointmentsController.list));
appointmentsRouter.post(
  '/',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin')),
  asyncHandler(appointmentsController.create)
);
appointmentsRouter.get('/:appointmentId', asyncHandler(requireOrganizationMember), asyncHandler(appointmentsController.getById));
appointmentsRouter.patch(
  '/:appointmentId/cancel',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin')),
  asyncHandler(appointmentsController.cancel)
);
appointmentsRouter.patch(
  '/:appointmentId/reschedule',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin')),
  asyncHandler(appointmentsController.reschedule)
);
