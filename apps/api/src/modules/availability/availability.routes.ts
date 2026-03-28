import { Router } from 'express';
import { asyncHandler } from '../../core/async-handler.js';
import { requireOrganizationMember, requireOrganizationRole } from '../organizations/middleware/organization-auth.middleware.js';
import { availabilityController } from './controllers/availability.controller.js';

export const professionalAvailabilityRouter = Router({ mergeParams: true });

professionalAvailabilityRouter.get(
  '/availability-rules',
  asyncHandler(requireOrganizationMember),
  asyncHandler(availabilityController.listRules)
);
professionalAvailabilityRouter.post(
  '/availability-rules',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin')),
  asyncHandler(availabilityController.createRule)
);
professionalAvailabilityRouter.get(
  '/availability-rules/:ruleId',
  asyncHandler(requireOrganizationMember),
  asyncHandler(availabilityController.getRule)
);
professionalAvailabilityRouter.patch(
  '/availability-rules/:ruleId',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin')),
  asyncHandler(availabilityController.updateRule)
);
professionalAvailabilityRouter.patch(
  '/availability-rules/:ruleId/status',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin')),
  asyncHandler(availabilityController.updateRuleStatus)
);

professionalAvailabilityRouter.get(
  '/availability-exceptions',
  asyncHandler(requireOrganizationMember),
  asyncHandler(availabilityController.listExceptions)
);
professionalAvailabilityRouter.post(
  '/availability-exceptions',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin')),
  asyncHandler(availabilityController.createException)
);
professionalAvailabilityRouter.patch(
  '/availability-exceptions/:exceptionId',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin')),
  asyncHandler(availabilityController.updateException)
);
professionalAvailabilityRouter.patch(
  '/availability-exceptions/:exceptionId/status',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin')),
  asyncHandler(availabilityController.updateExceptionStatus)
);

professionalAvailabilityRouter.get(
  '/availability',
  asyncHandler(requireOrganizationMember),
  asyncHandler(availabilityController.getCalculatedAvailability)
);
