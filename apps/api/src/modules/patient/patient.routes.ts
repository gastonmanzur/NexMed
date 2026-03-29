import { Router } from 'express';
import { asyncHandler } from '../../core/async-handler.js';
import { requireAuth } from '../auth/middleware/auth.middleware.js';
import { patientController } from './controllers/patient.controller.js';
import { waitlistRouter } from '../waitlist/waitlist.routes.js';

export const joinRouter = Router();
export const patientRouter = Router();

joinRouter.get('/:tokenOrSlug', asyncHandler(patientController.joinPreview));

patientRouter.use(requireAuth);

patientRouter.get('/me', asyncHandler(patientController.me));
patientRouter.patch('/me', asyncHandler(patientController.patchMe));
patientRouter.post('/join', asyncHandler(patientController.joinResolve));
patientRouter.get('/organizations', asyncHandler(patientController.organizations));
patientRouter.get('/organizations/:organizationId/catalog', asyncHandler(patientController.organizationCatalog));
patientRouter.get('/organizations/:organizationId/availability', asyncHandler(patientController.availability));
patientRouter.post('/organizations/:organizationId/appointments', asyncHandler(patientController.createAppointment));
patientRouter.get('/appointments', asyncHandler(patientController.listAppointments));
patientRouter.get('/appointments/:appointmentId', asyncHandler(patientController.getAppointment));
patientRouter.patch('/appointments/:appointmentId/cancel', asyncHandler(patientController.cancelAppointment));
patientRouter.patch('/appointments/:appointmentId/reschedule', asyncHandler(patientController.rescheduleAppointment));
patientRouter.get('/events', asyncHandler(patientController.listEvents));
patientRouter.patch('/events/read-all', asyncHandler(patientController.markEventsRead));

patientRouter.use('/waitlist', waitlistRouter);
