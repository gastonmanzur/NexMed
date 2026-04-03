import type { Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { AppError } from '../../../core/errors.js';
import { env } from '../../../config/env.js';
import type { AuthenticatedRequest } from '../../auth/types/auth-request.js';
import { OrganizationService } from '../services/organization.service.js';
import { OrganizationLogoService } from '../services/organization-logo.service.js';

const organizationTypeSchema = z.enum(['clinic', 'office', 'esthetic_center', 'professional_cabinet', 'other']);

const createOrganizationSchema = z.object({
  name: z.string().trim().min(1).max(160),
  type: organizationTypeSchema,
  contactEmail: z.string().trim().email().optional(),
  phone: z.string().trim().min(1).max(40).optional(),
  address: z.string().trim().min(1).max(200).optional(),
  city: z.string().trim().min(1).max(120).optional(),
  country: z.string().trim().min(1).max(120).optional()
});

const updateOrganizationProfileSchema = z.object({
  name: z.string().trim().min(1).max(160),
  displayName: z.string().trim().min(1).max(160).optional(),
  type: organizationTypeSchema,
  contactEmail: z.string().trim().email().optional(),
  phone: z.string().trim().min(3).max(40).optional(),
  address: z.string().trim().min(1).max(200).optional(),
  city: z.string().trim().min(1).max(120),
  country: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  logoUrl: z.string().trim().url().optional(),
  timezone: z.string().trim().min(1).max(80),
  locale: z.string().trim().min(2).max(35).optional(),
  currency: z.string().trim().min(3).max(10).optional(),
  patientCancellationAllowed: z.boolean().optional(),
  patientCancellationHoursLimit: z.number().int().min(0).max(720).optional(),
  patientRescheduleAllowed: z.boolean().optional(),
  patientRescheduleHoursLimit: z.number().int().min(0).max(720).optional()
});

const organizationIdSchema = z.object({
  organizationId: z.string().trim().min(1)
});


const checkoutSchema = z.object({
  planId: z.string().trim().min(1)
});

const service = new OrganizationService();
const logoService = new OrganizationLogoService();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: env.AVATAR_MAX_SIZE_BYTES } });

export const organizationLogoUploadMiddleware = upload.single('logo');
export const organizationLogoMulterErrorHandler = (error: unknown): never => {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    throw new AppError('FILE_TOO_LARGE', 413, 'Logo exceeds max file size');
  }

  throw error instanceof Error ? error : new AppError('UPLOAD_ERROR', 400, 'Unable to upload logo');
};

export const organizationController = {
  create: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const data = createOrganizationSchema.parse(req.body);
    const result = await service.createOrganization(req.auth!.userId, data);

    res.status(201).json({
      success: true,
      data: result
    });
  },

  myOrganizations: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const data = await service.getMyOrganizations(req.auth!.userId);
    res.status(200).json({ success: true, data });
  },

  getById: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId } = organizationIdSchema.parse(req.params);
    const organization = await service.getOrganizationForUser({
      actorUserId: req.auth!.userId,
      actorGlobalRole: req.auth!.globalRole,
      organizationId
    });

    res.status(200).json({
      success: true,
      data: organization
    });
  },

  myMembershipInOrganization: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId } = organizationIdSchema.parse(req.params);
    const membership = await service.getMembershipForUser(organizationId, req.auth!.userId);
    res.status(200).json({ success: true, data: membership });
  },

  getProfile: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId } = organizationIdSchema.parse(req.params);
    const profile = await service.getProfileForUser({ organizationId, actorUserId: req.auth!.userId });

    res.status(200).json({
      success: true,
      data: profile
    });
  },

  updateProfile: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId } = organizationIdSchema.parse(req.params);
    const data = updateOrganizationProfileSchema.parse(req.body);

    const profile = await service.updateProfile({
      organizationId,
      actorUserId: req.auth!.userId,
      data
    });

    res.status(200).json({
      success: true,
      data: profile
    });
  },

  getOnboardingStatus: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId } = organizationIdSchema.parse(req.params);
    const onboarding = await service.getOnboardingStatusForUser({ organizationId, actorUserId: req.auth!.userId });

    res.status(200).json({
      success: true,
      data: onboarding
    });
  },

  getDashboardSummary: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId } = organizationIdSchema.parse(req.params);
    const summary = await service.getDashboardSummaryForUser({
      organizationId,
      actorUserId: req.auth!.userId
    });

    res.status(200).json({
      success: true,
      data: summary
    });
  },

  getInviteLink: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId } = organizationIdSchema.parse(req.params);
    const data = await service.getInviteLinkForUser({
      organizationId,
      actorUserId: req.auth!.userId
    });
    res.status(200).json({ success: true, data });
  },

  regenerateInviteLink: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId } = organizationIdSchema.parse(req.params);
    const data = await service.regenerateInviteLinkForUser({
      organizationId,
      actorUserId: req.auth!.userId
    });
    res.status(200).json({ success: true, data });
  },

  listPlans: async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    const data = await service.listPlansForUser();
    res.status(200).json({ success: true, data });
  },

  getSubscription: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId } = organizationIdSchema.parse(req.params);
    const data = await service.getOrganizationSubscriptionForUser({
      organizationId,
      actorUserId: req.auth!.userId
    });

    res.status(200).json({ success: true, data });
  },

  checkoutSubscription: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId } = organizationIdSchema.parse(req.params);
    const { planId } = checkoutSchema.parse(req.body);

    const data = await service.startOrganizationCheckout({
      organizationId,
      actorUserId: req.auth!.userId,
      planId
    });

    res.status(200).json({ success: true, data });
  },

  uploadLogo: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId } = organizationIdSchema.parse(req.params);
    const data = await logoService.uploadLogo({
      organizationId,
      actorUserId: req.auth!.userId,
      file: req.file
    });
    res.status(200).json({ success: true, data });
  },

  deleteLogo: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId } = organizationIdSchema.parse(req.params);
    const data = await logoService.deleteLogo({
      organizationId,
      actorUserId: req.auth!.userId
    });
    res.status(200).json({ success: true, data });
  },

};
