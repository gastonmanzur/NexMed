import type { Response } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../../auth/types/auth-request.js';
import { ReminderService } from '../services/reminder.service.js';

const service = new ReminderService();

const orgPathSchema = z.object({ organizationId: z.string().trim().min(1) });
const rulePathSchema = orgPathSchema.extend({ ruleId: z.string().trim().min(1) });
const createSchema = z.object({
  triggerHoursBefore: z.number().int().min(1).max(720),
  channel: z.enum(['in_app', 'email', 'push']).default('in_app')
});
const patchSchema = z.object({
  triggerHoursBefore: z.number().int().min(1).max(720).optional(),
  channel: z.enum(['in_app', 'email', 'push']).optional()
});
const statusSchema = z.object({ status: z.enum(['active', 'inactive']) });

export const reminderController = {
  list: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId } = orgPathSchema.parse(req.params);
    const data = await service.listRules(organizationId);
    res.status(200).json({ success: true, data });
  },

  create: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId } = orgPathSchema.parse(req.params);
    const input = createSchema.parse(req.body);
    const data = await service.createRule(organizationId, input);
    res.status(201).json({ success: true, data });
  },

  patch: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId, ruleId } = rulePathSchema.parse(req.params);
    const input = patchSchema.parse(req.body);
    const data = await service.updateRule(organizationId, ruleId, input);
    res.status(200).json({ success: true, data });
  },

  patchStatus: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId, ruleId } = rulePathSchema.parse(req.params);
    const { status } = statusSchema.parse(req.body);
    const data = await service.updateRuleStatus(organizationId, ruleId, status);
    res.status(200).json({ success: true, data });
  },

  runNow: async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    const data = await service.runDueReminders();
    res.status(200).json({ success: true, data });
  }
};
