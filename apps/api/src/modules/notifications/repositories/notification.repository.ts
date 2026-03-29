import { NotificationModel, type NotificationDocument } from '../models/notification.model.js';

interface CreateNotificationInput {
  userId: string;
  organizationId?: string | null;
  patientProfileId?: string | null;
  type: (typeof import('../models/notification.model.js').notificationTypes)[number];
  title: string;
  message: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  channel?: (typeof import('../models/notification.model.js').notificationChannels)[number];
  status?: (typeof import('../models/notification.model.js').notificationStatuses)[number];
}

export class NotificationRepository {
  async create(input: CreateNotificationInput): Promise<NotificationDocument> {
    return NotificationModel.create({
      ...input,
      organizationId: input.organizationId ?? null,
      patientProfileId: input.patientProfileId ?? null,
      relatedEntityType: input.relatedEntityType ?? null,
      relatedEntityId: input.relatedEntityId ?? null,
      channel: input.channel ?? 'in_app',
      status: input.status ?? 'delivered'
    });
  }

  async listByUser(userId: string, opts?: { unreadOnly?: boolean; readOnly?: boolean }): Promise<NotificationDocument[]> {
    const query: Record<string, unknown> = { userId };
    if (opts?.unreadOnly) query.readAt = null;
    if (opts?.readOnly) query.readAt = { $ne: null };
    return NotificationModel.find(query).sort({ createdAt: -1 }).limit(200).exec();
  }

  async findByIdForUser(notificationId: string, userId: string): Promise<NotificationDocument | null> {
    return NotificationModel.findOne({ _id: notificationId, userId }).exec();
  }

  async markRead(notificationId: string, userId: string): Promise<NotificationDocument | null> {
    return NotificationModel.findOneAndUpdate(
      { _id: notificationId, userId },
      { $set: { readAt: new Date(), status: 'read' } },
      { new: true }
    ).exec();
  }

  async existsByDedupKey(input: { userId: string; type: string; relatedEntityId: string; channel: string }): Promise<boolean> {
    const row = await NotificationModel.findOne({
      userId: input.userId,
      type: input.type,
      relatedEntityId: input.relatedEntityId,
      channel: input.channel
    }).select('_id').lean();

    return Boolean(row);
  }
}
