import type { Response } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../auth/types/auth-request.js";
import { SalesService } from "../services/sales.service.js";

const service = new SalesService();
const tokenSchema = z.object({ token: z.string().min(20) });

export const salesController = {
  invitation: async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    const { token } = tokenSchema.parse(req.params);
    res.json({ success: true, data: await service.invitationDetails(token) });
  },
  accept: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { token } = tokenSchema.parse(req.params);
    res.json({
      success: true,
      data: await service.acceptInvitation(token, req.auth!.userId),
    });
  },
  dashboard: async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    res.json({
      success: true,
      data: await service.dashboard(req.auth!.userId),
    });
  },
};
