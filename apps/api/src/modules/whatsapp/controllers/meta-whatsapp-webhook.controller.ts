import type { Request, Response } from 'express';
import { env } from '../../../config/env.js';
import { logger } from '../../../config/logger.js';
import { AppointmentNotificationModel } from '../models/appointment-notification.model.js';

export const metaWhatsAppWebhookController = {
  verify: (req: Request, res: Response): void => {
    const mode = req.query['hub.mode']; const token = req.query['hub.verify_token']; const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === env.META_WHATSAPP_VERIFY_TOKEN) { res.status(200).send(String(challenge ?? '')); return; }
    res.sendStatus(403);
  },
  receive: (req: Request, res: Response): void => {
    res.sendStatus(200);
    void processPayload(req.body).catch((error) => logger.warn({ error }, 'meta whatsapp webhook processing failed'));
  }
};
async function processPayload(payload: any): Promise<void> {
  const entries = Array.isArray(payload?.entry) ? payload.entry : [];
  for (const entry of entries) for (const change of (Array.isArray(entry?.changes) ? entry.changes : [])) {
    const statuses = Array.isArray(change?.value?.statuses) ? change.value.statuses : [];
    for (const status of statuses) {
      const id = status?.id; if (!id) continue;
      const value = status.status;
      const update: any = { providerResponse: status };
      if (value === 'sent') { update.status = 'sent'; update.sentAt = new Date(Number(status.timestamp ?? Date.now()/1000)*1000); }
      if (value === 'delivered') { update.status = 'delivered'; update.deliveredAt = new Date(Number(status.timestamp ?? Date.now()/1000)*1000); }
      if (value === 'read') { update.status = 'read'; update.readAt = new Date(Number(status.timestamp ?? Date.now()/1000)*1000); }
      if (value === 'failed') { update.status = 'failed'; update.failedAt = new Date(); update.errorMessage = status.errors?.[0]?.message ?? 'meta_delivery_failed'; update.errorCode = status.errors?.[0]?.code ? String(status.errors[0].code) : null; }
      await AppointmentNotificationModel.findOneAndUpdate({ providerMessageId: id }, { $set: update }).exec();
    }
  }
}
