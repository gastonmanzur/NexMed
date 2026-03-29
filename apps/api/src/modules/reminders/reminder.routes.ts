import { Router } from 'express';
import { asyncHandler } from '../../core/async-handler.js';
import { requireAuth, requireRoles } from '../auth/middleware/auth.middleware.js';
import { requireOrganizationMember, requireOrganizationRole } from '../organizations/middleware/organization-auth.middleware.js';
import { reminderController } from './controllers/reminder.controller.js';

export const organizationReminderRouter = Router({ mergeParams: true });
export const reminderAdminRouter = Router();

organizationReminderRouter.get('/', asyncHandler(requireOrganizationMember), asyncHandler(reminderController.list));
organizationReminderRouter.post('/', asyncHandler(requireOrganizationMember), asyncHandler(requireOrganizationRole('owner', 'admin')), asyncHandler(reminderController.create));
organizationReminderRouter.patch('/:ruleId', asyncHandler(requireOrganizationMember), asyncHandler(requireOrganizationRole('owner', 'admin')), asyncHandler(reminderController.patch));
organizationReminderRouter.patch('/:ruleId/status', asyncHandler(requireOrganizationMember), asyncHandler(requireOrganizationRole('owner', 'admin')), asyncHandler(reminderController.patchStatus));

reminderAdminRouter.use(requireAuth, requireRoles('admin'));
reminderAdminRouter.post('/run', asyncHandler(reminderController.runNow));
