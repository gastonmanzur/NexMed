import type { Response } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../../auth/types/auth-request.js';
import { OrganizationWhatsAppSettingsService } from '../services/organization-whatsapp-settings.service.js';
import { WhatsAppNotificationService } from '../services/whatsapp-notification.service.js';

const paramsSchema = z.object({ organizationId: z.string().trim().min(1) });
const bodySchema = z.object({
  enabled: z.boolean().optional(),
  sendConfirmation: z.boolean().optional(), sendReminder: z.boolean().optional(), sendMidpointReminder: z.boolean().optional(), sendSecondReminder: z.boolean().optional(),
  reminderHoursBefore: z.number().int().min(1).max(720).optional(), secondReminderHoursBefore: z.number().int().min(1).max(720).nullable().optional(),
  templateLanguage: z.enum(['es', 'es_AR']).optional(),
  templates: z.object({ confirmation: z.string().optional(), reminder: z.string().optional(), cancellation: z.string().optional(), rescheduled: z.string().optional(), notice: z.string().optional(), appointmentConfirmation: z.string().optional(), appointmentReminder: z.string().optional(), appointmentCancellation: z.string().optional(), appointmentRescheduled: z.string().optional() }).optional()
});
const testSchema = z.object({ phone: z.string().trim().min(6), patientName: z.string().trim().max(80).optional() });
const service = new OrganizationWhatsAppSettingsService();
const notifications = new WhatsAppNotificationService();

export const organizationWhatsAppSettingsController = {
  get: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId } = paramsSchema.parse(req.params);
    res.status(200).json({ success: true, data: await service.get(organizationId) });
  },
  upsert: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId } = paramsSchema.parse(req.params);
    const body = bodySchema.parse(req.body);
    const templates = body.templates ? { confirmation: body.templates.confirmation ?? body.templates.appointmentConfirmation, reminder: body.templates.reminder ?? body.templates.appointmentReminder, cancellation: body.templates.cancellation ?? body.templates.appointmentCancellation, rescheduled: body.templates.rescheduled ?? body.templates.appointmentRescheduled, notice: body.templates.notice } : undefined;
    const update: any = { ...body }; if (templates) update.templates = templates;
    res.status(200).json({ success: true, data: await service.upsert(organizationId, update) });
  },
  test: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId } = paramsSchema.parse(req.params);
    const body = testSchema.parse(req.body);
    const data = await notifications.scheduleTestNotification(organizationId, body.phone, body.patientName);
    res.status(201).json({ success: true, data });
  }
};
