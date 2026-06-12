import { Router } from 'express';
import { asyncHandler } from '../../core/async-handler.js';
import { requireAuth } from '../auth/middleware/auth.middleware.js';
import { patientController } from './controllers/patient.controller.js';
import { waitlistRouter } from '../waitlist/waitlist.routes.js';

export const joinRouter = Router();
export const publicPatientRouter = Router();
export const patientRouter = Router();

joinRouter.get('/:tokenOrSlug', asyncHandler(patientController.joinPreview));
joinRouter.get('/:tokenOrSlug/catalog', asyncHandler(patientController.publicCatalog));
joinRouter.get('/:tokenOrSlug/availability', asyncHandler(patientController.publicAvailability));
joinRouter.get('/:tokenOrSlug/health-insurances', asyncHandler(patientController.publicHealthInsurances));
joinRouter.get('/:tokenOrSlug/patient-session', asyncHandler(patientController.joinPatientSession));
joinRouter.post('/:tokenOrSlug/patient-lookup', asyncHandler(patientController.patientLookup));
joinRouter.post('/:tokenOrSlug/patient-prefill', asyncHandler(patientController.patientPrefill));
joinRouter.post('/:tokenOrSlug/patient-confirm', asyncHandler(patientController.patientConfirm));
joinRouter.post('/:tokenOrSlug/appointments/express', asyncHandler(patientController.createExpressAppointment));

publicPatientRouter.get('/patient-express-session/me', asyncHandler(patientController.expressSessionMe));

patientRouter.use(requireAuth);

patientRouter.get('/me', asyncHandler(patientController.me));
patientRouter.patch('/me', asyncHandler(patientController.patchMe));
patientRouter.post('/join', asyncHandler(patientController.joinResolve));
patientRouter.get('/organizations', asyncHandler(patientController.organizations));
patientRouter.get('/organizations/:organizationId/catalog', asyncHandler(patientController.organizationCatalog));
patientRouter.get('/organizations/:organizationId/availability', asyncHandler(patientController.availability));
patientRouter.post('/organizations/:organizationId/appointments', asyncHandler(patientController.createAppointment));
patientRouter.get('/family-members', asyncHandler(patientController.listFamilyMembers));
patientRouter.post('/family-members', asyncHandler(patientController.createFamilyMember));
patientRouter.get('/family-members/:familyMemberId', asyncHandler(patientController.getFamilyMember));
patientRouter.patch('/family-members/:familyMemberId', asyncHandler(patientController.patchFamilyMember));
patientRouter.delete('/family-members/:familyMemberId', asyncHandler(patientController.deleteFamilyMember));
patientRouter.get('/appointments', asyncHandler(patientController.listAppointments));
patientRouter.get('/appointments/:appointmentId', asyncHandler(patientController.getAppointment));
patientRouter.patch('/appointments/:appointmentId/confirm-attendance', asyncHandler(patientController.confirmAppointmentAttendance));
patientRouter.patch('/appointments/:appointmentId/cancel', asyncHandler(patientController.cancelAppointment));
patientRouter.patch('/appointments/:appointmentId/reschedule', asyncHandler(patientController.rescheduleAppointment));
patientRouter.get('/events', asyncHandler(patientController.listEvents));
patientRouter.patch('/events/read-all', asyncHandler(patientController.markEventsRead));

patientRouter.use('/waitlist', waitlistRouter);
