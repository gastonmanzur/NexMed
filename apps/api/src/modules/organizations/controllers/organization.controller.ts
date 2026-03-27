import type { Response } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../../auth/types/auth-request.js';
import { OrganizationService } from '../services/organization.service.js';

const createOrganizationSchema = z.object({
  name: z.string().trim().min(1).max(160),
  type: z.enum(['clinic', 'office', 'esthetic_center', 'professional_cabinet', 'other']),
  contactEmail: z.string().trim().email().optional(),
  phone: z.string().trim().min(1).max(40).optional(),
  address: z.string().trim().min(1).max(200).optional(),
  city: z.string().trim().min(1).max(120).optional(),
  country: z.string().trim().min(1).max(120).optional()
});

const organizationIdSchema = z.object({
  organizationId: z.string().trim().min(1)
});

const service = new OrganizationService();

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
  }
};
