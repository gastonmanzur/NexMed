import type { Response } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../../auth/types/auth-request.js';
import { AppointmentNotificationRepository } from '../repositories/appointment-notification.repository.js';

const paramsSchema = z.object({ organizationId: z.string().trim().min(1), appointmentId: z.string().trim().min(1) });
const repo = new AppointmentNotificationRepository();

const toDto = (row: Awaited<ReturnType<AppointmentNotificationRepository['listByAppointment']>>[number]) => ({
  id: row._id.toString(),
  organizationId: row.organizationId.toString(),
  appointmentId: row.appointmentId.toString(),
  channel: row.channel,
  type: row.type,
  status: row.status,
  scheduledFor: row.scheduledFor.toISOString(),
  sentAt: row.sentAt ? row.sentAt.toISOString() : null,
  recipientPhone: row.recipientPhone,
  normalizedRecipientPhone: row.normalizedRecipientPhone,
  senderDisplayPhone: row.senderDisplayPhone ?? null,
  provider: row.provider ?? null,
  templateName: row.templateName ?? null,
  templateParams: row.templateParams ?? null,
  providerMessageId: row.providerMessageId ?? null,
  error: row.error ?? null,
  attempts: row.attempts,
  lastAttemptAt: row.lastAttemptAt ? row.lastAttemptAt.toISOString() : null,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString()
});

export const appointmentNotificationController = {
  listByAppointment: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId, appointmentId } = paramsSchema.parse(req.params);
    const rows = await repo.listByAppointment(organizationId, appointmentId);
    res.status(200).json({ success: true, data: rows.map(toDto) });
  }
};
