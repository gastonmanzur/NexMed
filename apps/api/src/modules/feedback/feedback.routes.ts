import { Router } from 'express';
import { asyncHandler } from '../../core/async-handler.js';
import { requireAuth } from '../auth/middleware/auth.middleware.js';
import { feedbackController } from './controllers/feedback.controller.js';

export const feedbackRouter = Router();

feedbackRouter.use(requireAuth);
feedbackRouter.post('/', asyncHandler(feedbackController.create));
