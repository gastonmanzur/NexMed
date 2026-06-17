import { Router } from 'express';
import { asyncHandler } from '../../core/async-handler.js';
import { requireAuth } from '../auth/middleware/auth.middleware.js';
import { professionalPanelController } from './controllers/professional-panel.controller.js';
import { requireProfessionalMembership } from './middleware/professional-auth.middleware.js';
import { clinicalController } from '../clinical/controllers/clinical.controller.js';

export const professionalPanelRouter = Router();

professionalPanelRouter.use(requireAuth);
professionalPanelRouter.use(asyncHandler(requireProfessionalMembership));
professionalPanelRouter.get('/me', asyncHandler(professionalPanelController.me));
professionalPanelRouter.get('/dashboard', asyncHandler(professionalPanelController.dashboard));
professionalPanelRouter.get('/appointments', asyncHandler(professionalPanelController.appointments));
professionalPanelRouter.get('/waiting-room', asyncHandler(professionalPanelController.waitingRoom));
professionalPanelRouter.get('/appointments/today', asyncHandler(professionalPanelController.appointments));
professionalPanelRouter.post('/appointments/:appointmentId/start', asyncHandler(professionalPanelController.startAppointment));
professionalPanelRouter.post('/appointments/:appointmentId/complete', asyncHandler(professionalPanelController.completeAppointment));

professionalPanelRouter.get('/appointments/:appointmentId/attention', asyncHandler(clinicalController.attention));
professionalPanelRouter.get('/patients/:patientProfileId/clinical-record', asyncHandler(clinicalController.getRecord));
professionalPanelRouter.patch('/patients/:patientProfileId/clinical-record', asyncHandler(clinicalController.updateRecord));
professionalPanelRouter.get('/patients/:patientProfileId/encounters', asyncHandler(clinicalController.encounters));
professionalPanelRouter.post('/appointments/:appointmentId/encounter', asyncHandler(clinicalController.saveEncounter));
professionalPanelRouter.patch('/encounters/:encounterId', asyncHandler(clinicalController.patchEncounter));
professionalPanelRouter.post('/encounters/:encounterId/sign', asyncHandler(clinicalController.signEncounter));
professionalPanelRouter.get('/messages', asyncHandler(clinicalController.professionalMessages));
professionalPanelRouter.post('/messages', asyncHandler(clinicalController.createProfessionalMessage));
professionalPanelRouter.patch('/messages/:messageId/read', asyncHandler(clinicalController.readProfessionalMessage));
professionalPanelRouter.patch('/messages/:messageId/resolve', asyncHandler(clinicalController.resolveProfessionalMessage));
