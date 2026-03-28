import { Router } from 'express';
import { asyncHandler } from '../../core/async-handler.js';
import { requireOrganizationMember, requireOrganizationRole } from '../organizations/middleware/organization-auth.middleware.js';
import { professionalsController } from './controllers/professionals.controller.js';

export const professionalsRouter = Router({ mergeParams: true });
export const specialtiesRouter = Router({ mergeParams: true });

professionalsRouter.get('/', asyncHandler(requireOrganizationMember), asyncHandler(professionalsController.listProfessionals));
professionalsRouter.post(
  '/',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin')),
  asyncHandler(professionalsController.createProfessional)
);
professionalsRouter.get(
  '/:professionalId',
  asyncHandler(requireOrganizationMember),
  asyncHandler(professionalsController.getProfessional)
);
professionalsRouter.patch(
  '/:professionalId',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin')),
  asyncHandler(professionalsController.updateProfessional)
);
professionalsRouter.patch(
  '/:professionalId/status',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin')),
  asyncHandler(professionalsController.updateProfessionalStatus)
);
professionalsRouter.put(
  '/:professionalId/specialties',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin')),
  asyncHandler(professionalsController.replaceProfessionalSpecialties)
);

specialtiesRouter.get('/', asyncHandler(requireOrganizationMember), asyncHandler(professionalsController.listSpecialties));
specialtiesRouter.post(
  '/',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin')),
  asyncHandler(professionalsController.createSpecialty)
);
specialtiesRouter.get('/:specialtyId', asyncHandler(requireOrganizationMember), asyncHandler(professionalsController.getSpecialty));
specialtiesRouter.patch(
  '/:specialtyId',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin')),
  asyncHandler(professionalsController.updateSpecialty)
);
specialtiesRouter.patch(
  '/:specialtyId/status',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin')),
  asyncHandler(professionalsController.updateSpecialtyStatus)
);
