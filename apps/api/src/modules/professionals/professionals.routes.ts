import { Router } from 'express';
import { asyncHandler } from '../../core/async-handler.js';
import { requireOrganizationMember, requireOrganizationRole } from '../organizations/middleware/organization-auth.middleware.js';
import { professionalsController, professionalAvatarUploadMiddleware, professionalAvatarMulterErrorHandler } from './controllers/professionals.controller.js';

export const professionalsRouter = Router({ mergeParams: true });
export const specialtiesRouter = Router({ mergeParams: true });


const uploadProfessionalAvatar = (req: Parameters<typeof professionalAvatarUploadMiddleware>[0], res: Parameters<typeof professionalAvatarUploadMiddleware>[1], next: Parameters<typeof professionalAvatarUploadMiddleware>[2]): void => {
  professionalAvatarUploadMiddleware(req, res, (error: unknown) => {
    if (error) {
      try { professionalAvatarMulterErrorHandler(error); } catch (mappedError) { next(mappedError); return; }
    }
    next();
  });
};


professionalsRouter.get(
  '/',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin', 'staff')),
  asyncHandler(professionalsController.listProfessionals)
);
professionalsRouter.post(
  '/',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin')),
  asyncHandler(professionalsController.createProfessional)
);
professionalsRouter.get(
  '/:professionalId',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin', 'staff')),
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

professionalsRouter.post(
  '/:professionalId/avatar',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin')),
  uploadProfessionalAvatar,
  asyncHandler(professionalsController.uploadProfessionalAvatar)
);
professionalsRouter.delete(
  '/:professionalId/avatar',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin')),
  asyncHandler(professionalsController.deleteProfessionalAvatar)
);

professionalsRouter.put(
  '/:professionalId/specialties',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin')),
  asyncHandler(professionalsController.replaceProfessionalSpecialties)
);

specialtiesRouter.get(
  '/',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin', 'staff')),
  asyncHandler(professionalsController.listSpecialties)
);
specialtiesRouter.post(
  '/',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin')),
  asyncHandler(professionalsController.createSpecialty)
);
specialtiesRouter.get(
  '/:specialtyId',
  asyncHandler(requireOrganizationMember),
  asyncHandler(requireOrganizationRole('owner', 'admin', 'staff')),
  asyncHandler(professionalsController.getSpecialty)
);
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
