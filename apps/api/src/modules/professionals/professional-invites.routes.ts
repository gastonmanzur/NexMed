import { Router } from 'express';
import type { Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../core/async-handler.js';
import type { AuthenticatedRequest } from '../auth/types/auth-request.js';
import { ProfessionalInviteService } from './services/professional-invite.service.js';

const paramsSchema = z.object({ token: z.string().trim().min(16) });
const acceptSchema = z.object({ password: z.string().min(8), confirmPassword: z.string().min(8) });
const service = new ProfessionalInviteService();

export const professionalInvitesRouter = Router();

professionalInvitesRouter.get('/:token', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { token } = paramsSchema.parse(req.params);
  const data = await service.get(token);
  res.status(200).json({ success: true, data });
}));

professionalInvitesRouter.post('/:token/accept', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { token } = paramsSchema.parse(req.params);
  const input = acceptSchema.parse(req.body);
  const data = await service.accept(token, input);
  res.status(200).json({ success: true, data });
}));
