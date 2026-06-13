import type { Response } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../../auth/types/auth-request.js';
import { OrganizationWhatsAppSettingsService } from '../services/organization-whatsapp-settings.service.js';

const paramsSchema = z.object({ organizationId: z.string().trim().min(1) });
const bodySchema = z.object({
  enabled: z.boolean(),
  provider: z.enum(['manual', 'noop', 'meta_cloud_api']),
  displayPhoneNumber: z.string().trim().max(40).nullable().optional(),
  meta: z.object({
    phoneNumberId: z.string().trim().max(120).nullable().optional(),
    businessAccountId: z.string().trim().max(120).nullable().optional(),
    apiVersion: z.string().trim().max(30).nullable().optional(),
    accessToken: z.string().trim().max(5000).nullable().optional()
  }).optional(),
  templates: z.object({
    appointmentConfirmation: z.string().trim().min(1).max(120).nullable().optional(),
    appointmentReminder: z.string().trim().min(1).max(120).nullable().optional(),
    appointmentCancellation: z.string().trim().min(1).max(120).nullable().optional(),
    appointmentRescheduled: z.string().trim().min(1).max(120).nullable().optional()
  }).default({}),
  reminderHoursBefore: z.number().int().min(1).max(720).default(24),
  secondReminderHoursBefore: z.number().int().min(1).max(720).nullable().optional()
});

const service = new OrganizationWhatsAppSettingsService();

export const organizationWhatsAppSettingsController = {
  get: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId } = paramsSchema.parse(req.params);
    res.status(200).json({ success: true, data: await service.get(organizationId) });
  },
  upsert: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId } = paramsSchema.parse(req.params);
    const body = bodySchema.parse(req.body);
    res.status(200).json({
      success: true,
      data: await service.upsert(organizationId, {
        enabled: body.enabled,
        provider: body.provider,
        ...(body.displayPhoneNumber !== undefined ? { displayPhoneNumber: body.displayPhoneNumber } : {}),
        ...(body.meta !== undefined ? { meta: body.meta } : {}),
        templates: body.templates,
        reminderHoursBefore: body.reminderHoursBefore,
        ...(body.secondReminderHoursBefore !== undefined ? { secondReminderHoursBefore: body.secondReminderHoursBefore } : {})
      })
    });
  }
};
