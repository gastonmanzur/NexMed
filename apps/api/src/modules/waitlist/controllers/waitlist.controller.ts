import type { Response } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../../auth/types/auth-request.js';
import { WaitlistService } from '../services/waitlist.service.js';

const service = new WaitlistService();

const createSchema = z.object({
  organizationId: z.string().trim().min(1),
  specialtyId: z.string().trim().min(1).optional(),
  professionalId: z.string().trim().min(1).optional(),
  startDate: z.string().trim().min(1),
  endDate: z.string().trim().min(1),
  timeWindowStart: z.string().trim().min(1).optional(),
  timeWindowEnd: z.string().trim().min(1).optional()
});

const pathSchema = z.object({ waitlistId: z.string().trim().min(1) });

export const waitlistController = {
  listMine: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const data = await service.listForUser(req.auth!.userId);
    res.status(200).json({ success: true, data });
  },

  createMine: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const input = createSchema.parse(req.body);
    const data = await service.createForUser(req.auth!.userId, input);
    res.status(201).json({ success: true, data });
  },

  cancelMine: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { waitlistId } = pathSchema.parse(req.params);
    const data = await service.cancelForUser(req.auth!.userId, waitlistId);
    res.status(200).json({ success: true, data });
  }
};
