import type { Response } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../../auth/types/auth-request.js';
import { AppointmentNotificationRepository } from '../repositories/appointment-notification.repository.js';

const appointmentParamsSchema = z.object({ organizationId: z.string().trim().min(1), appointmentId: z.string().trim().min(1) });
const orgParamsSchema = z.object({ organizationId: z.string().trim().min(1) });
const repo = new AppointmentNotificationRepository();
const mask = (v: string) => v.length <= 4 ? '****' : `${'*'.repeat(Math.max(0, v.length - 4))}${v.slice(-4)}`;
const toDto = (row: Awaited<ReturnType<AppointmentNotificationRepository['listByAppointment']>>[number]) => ({
  id: row._id.toString(), organizationId: row.organizationId.toString(), appointmentId: row.appointmentId?.toString() ?? null, isTest: row.isTest ?? false, channel: row.channel, type: row.type, status: row.status,
  scheduledFor: row.scheduledFor.toISOString(), sentAt: row.sentAt?.toISOString() ?? null, deliveredAt: row.deliveredAt?.toISOString() ?? null, readAt: row.readAt?.toISOString() ?? null, failedAt: row.failedAt?.toISOString() ?? null, skippedAt: row.skippedAt?.toISOString() ?? null,
  recipientPhone: mask(row.recipientPhone), normalizedRecipientPhone: mask(row.normalizedRecipientPhone), senderDisplayName: row.senderDisplayName ?? 'NexMed', provider: row.provider ?? 'meta_cloud_api', templateName: row.templateName ?? null, templateLanguage: row.templateLanguage ?? 'es', templateParams: row.templateParams ?? [], providerMessageId: row.providerMessageId ?? null, errorMessage: row.errorMessage ?? row.error ?? null, attempts: row.attempts, lastAttemptAt: row.lastAttemptAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString()
});
export const appointmentNotificationController = {
  listByAppointment: async (req: AuthenticatedRequest, res: Response): Promise<void> => { const { organizationId, appointmentId } = appointmentParamsSchema.parse(req.params); res.status(200).json({ success: true, data: (await repo.listByAppointment(organizationId, appointmentId)).map(toDto) }); },
  listByOrganization: async (req: AuthenticatedRequest, res: Response): Promise<void> => { const { organizationId } = orgParamsSchema.parse(req.params); res.status(200).json({ success: true, data: (await repo.listByOrganization(organizationId, 100)).map(toDto) }); }
};
