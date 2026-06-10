import type { Response } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../../auth/types/auth-request.js';
import { OrganizationHealthInsuranceService } from '../services/organization-health-insurance.service.js';

const service = new OrganizationHealthInsuranceService();
const paramsSchema = z.object({ organizationId: z.string().trim().min(1) });
const itemParamsSchema = z.object({ organizationId: z.string().trim().min(1), healthInsuranceId: z.string().trim().min(1) });
const writeSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  requiresMemberNumber: z.boolean().optional(),
  requiresPlan: z.boolean().optional(),
  notes: z.string().trim().max(500).nullable().optional()
});
const createSchema = writeSchema.extend({ name: z.string().trim().min(1).max(120) });

export const organizationHealthInsuranceController = {
  list: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId } = paramsSchema.parse(req.params);
    res.status(200).json({ success: true, data: await service.list(organizationId) });
  },
  create: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId } = paramsSchema.parse(req.params);
    res.status(201).json({ success: true, data: await service.create(organizationId, createSchema.parse(req.body)) });
  },
  update: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId, healthInsuranceId } = itemParamsSchema.parse(req.params);
    res.status(200).json({ success: true, data: await service.update(organizationId, healthInsuranceId, writeSchema.parse(req.body)) });
  }
};
