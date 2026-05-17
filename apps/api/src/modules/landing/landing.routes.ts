import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../../core/async-handler.js';
import { requireAuth, requireRoles } from '../auth/middleware/auth.middleware.js';
import { LandingController } from './landing.controller.js';

const controller = new LandingController();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } });
export const landingRouter = Router();

landingRouter.get('/published', asyncHandler(controller.getPublished));
landingRouter.get('/admin', requireAuth, requireRoles('admin'), asyncHandler(controller.getAdmin));
landingRouter.put('/admin/draft', requireAuth, requireRoles('admin'), asyncHandler(controller.saveDraft));
landingRouter.post('/admin/publish', requireAuth, requireRoles('admin'), asyncHandler(controller.publish));
landingRouter.post('/admin/media', requireAuth, requireRoles('admin'), upload.single('file'), asyncHandler(controller.uploadMedia));
landingRouter.delete('/admin/media', requireAuth, requireRoles('admin'), asyncHandler(controller.deleteMedia));
