import { Router } from 'express';
import { asyncHandler } from '../../core/async-handler.js';
import { requireAuth } from '../auth/middleware/auth.middleware.js';
import { professionalPanelController } from './controllers/professional-panel.controller.js';
import { requireProfessionalMembership } from './middleware/professional-auth.middleware.js';

export const professionalPanelRouter = Router();

professionalPanelRouter.use(requireAuth);
professionalPanelRouter.use(asyncHandler(requireProfessionalMembership));
professionalPanelRouter.get('/me', asyncHandler(professionalPanelController.me));
professionalPanelRouter.get('/dashboard', asyncHandler(professionalPanelController.dashboard));
professionalPanelRouter.get('/appointments', asyncHandler(professionalPanelController.appointments));
professionalPanelRouter.get('/waiting-room', asyncHandler(professionalPanelController.waitingRoom));
