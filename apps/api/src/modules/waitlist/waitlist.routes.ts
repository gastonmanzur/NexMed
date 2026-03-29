import { Router } from 'express';
import { asyncHandler } from '../../core/async-handler.js';
import { waitlistController } from './controllers/waitlist.controller.js';

export const waitlistRouter = Router({ mergeParams: true });

waitlistRouter.get('/', asyncHandler(waitlistController.listMine));
waitlistRouter.post('/', asyncHandler(waitlistController.createMine));
waitlistRouter.patch('/:waitlistId/cancel', asyncHandler(waitlistController.cancelMine));
