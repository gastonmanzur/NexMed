import type { Response } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../auth/types/auth-request.js";
import { SalesService } from "../services/sales.service.js";

const service = new SalesService();
const idSchema = z.object({ sellerId: z.string().min(1) });
const nullableText = z.string().trim().max(1000).nullable().optional();
const createSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().email(),
  phone: z.string().trim().max(40).nullable().optional(),
  referralCode: z.string().trim().min(3).max(40).optional(),
  commissionType: z.enum(["percentage", "fixed"]),
  commissionRate: z.number().min(0),
  commissionDurationMonths: z.number().int().positive().nullable().optional(),
  commissionHoldDays: z.number().int().min(0).max(365).default(0),
  notes: nullableText,
});
const updateSchema = z.object({
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  status: z.enum(["active", "inactive", "blocked"]).optional(),
  commissionType: z.enum(["percentage", "fixed"]).optional(),
  commissionRate: z.number().min(0).optional(),
  commissionDurationMonths: z.number().int().positive().nullable().optional(),
  commissionHoldDays: z.number().int().min(0).max(365).optional(),
  notes: nullableText,
});

export const adminSalesController = {
  list: async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    res.json({ success: true, data: await service.listSellers() });
  },
  create: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    res
      .status(201)
      .json({
        success: true,
        data: await service.createSeller(
          req.auth!.userId,
          createSchema.parse(req.body),
        ),
      });
  },
  detail: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { sellerId } = idSchema.parse(req.params);
    res.json({ success: true, data: await service.getSeller(sellerId) });
  },
  update: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { sellerId } = idSchema.parse(req.params);
    res.json({
      success: true,
      data: await service.updateSeller(sellerId, updateSchema.parse(req.body)),
    });
  },
  renewInvitation: async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    const { sellerId } = idSchema.parse(req.params);
    res.json({ success: true, data: await service.renewInvitation(sellerId) });
  },
};
