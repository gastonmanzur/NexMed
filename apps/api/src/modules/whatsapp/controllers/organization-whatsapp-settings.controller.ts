import type { Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../../core/errors.js';
import type { AuthenticatedRequest } from '../../auth/types/auth-request.js';
import { OrganizationWhatsAppSettingsService } from '../services/organization-whatsapp-settings.service.js';

const paramsSchema = z.object({ organizationId: z.string().trim().min(1) });
const suspendSchema = z.object({ suspended: z.boolean() });
const bodySchema = z.object({
  enabled: z.boolean().optional(),
  senderDisplayName: z.string().trim().min(1).max(120).optional(),
  senderDisplayPhone: z.string().trim().max(40).nullable().optional(),
  sendConfirmation: z.boolean().optional(), sendReminder: z.boolean().optional(), sendMidpointReminder: z.boolean().optional(), sendSecondReminder: z.boolean().optional(),
  reminderHoursBefore: z.number().int().min(1).max(720).optional(), secondReminderHoursBefore: z.number().int().min(1).max(720).nullable().optional(),
  templateLanguage: z.literal('es_AR').optional(),
  templates: z.object({ confirmation: z.string().optional(), test: z.string().nullable().optional(), reminder: z.string().optional(), cancellation: z.string().optional(), rescheduled: z.string().optional(), notice: z.string().optional(), appointmentConfirmation: z.string().optional(), appointmentReminder: z.string().optional(), appointmentCancellation: z.string().optional(), appointmentRescheduled: z.string().optional() }).optional()
});
const service = new OrganizationWhatsAppSettingsService();

export const organizationWhatsAppSettingsController = {
  get: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId } = paramsSchema.parse(req.params);
    res.status(200).json({ success: true, data: await service.get(organizationId) });
  },
  upsert: async (_req: AuthenticatedRequest, _res: Response): Promise<void> => {
    throw new AppError('WHATSAPP_SETTINGS_GLOBAL_ONLY', 403, 'La configuración de WhatsApp es global y solo puede administrarla el super admin.');
  },
  getGlobal: async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    res.status(200).json({ success: true, data: await service.getGlobal() });
  },
  upsertGlobal: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const body = bodySchema.parse(req.body);
    const templates = body.templates ? { confirmation: body.templates.confirmation ?? body.templates.appointmentConfirmation, test: body.templates.test, reminder: body.templates.reminder ?? body.templates.appointmentReminder, cancellation: body.templates.cancellation ?? body.templates.appointmentCancellation, rescheduled: body.templates.rescheduled ?? body.templates.appointmentRescheduled, notice: body.templates.notice } : undefined;
    const update: any = { ...body }; if (templates) update.templates = templates;
    res.status(200).json({ success: true, data: await service.upsertGlobal(update, req.auth?.userId) });
  },
  setOrganizationSuspended: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId } = paramsSchema.parse(req.params);
    const { suspended } = suspendSchema.parse(req.body);
    res.status(200).json({ success: true, data: await service.setOrganizationSuspended(organizationId, suspended, req.auth?.userId) });
  },
  health: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId } = paramsSchema.parse(req.params);
    const settings = await service.get(organizationId);
    const headerImageConfigured = Boolean(settings.headerImageConfigured);
    res.status(200).json({ success: true, data: { providerConfigured: settings.globalProviderConfigured, headerImageConfigured, headerImageReachable: headerImageConfigured, confirmationTemplate: { name: settings.templates.confirmation, language: settings.templateLanguage, approved: null, headerType: headerImageConfigured ? 'IMAGE' : 'NONE' } } });
  },
  test: async (_req: AuthenticatedRequest, _res: Response): Promise<void> => {
    throw new AppError('WHATSAPP_TEST_GLOBAL_ONLY', 403, 'Las pruebas de WhatsApp solo pueden ejecutarse desde la administración global.');
  }
};
