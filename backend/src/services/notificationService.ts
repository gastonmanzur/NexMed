import { Types } from "mongoose";
import { Notification, NotificationRecipientType } from "../models/Notification";

type CreateNotificationInput = {
  recipientUserId: string | Types.ObjectId;
  recipientType: NotificationRecipientType;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  dedupeKey?: string;
};

export async function createNotificationIdempotent(input: CreateNotificationInput) {
  try {
    const payload: Record<string, any> = {
      recipientUserId: new Types.ObjectId(input.recipientUserId),
      recipientType: input.recipientType,
      type: input.type,
      title: input.title,
      message: input.message,
    };

    if (input.data !== undefined) payload.data = input.data;
    if (input.dedupeKey !== undefined) payload.dedupeKey = input.dedupeKey;

    const notification = await Notification.create(payload);

    return { created: true, notification };
  } catch (error) {
    if ((error as any)?.code === 11000 && input.dedupeKey) {
      return { created: false, notification: null };
    }

    throw error;
  }
}

export async function listNotifications(params: {
  userId: string;
  userType: NotificationRecipientType;
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}) {
  const page = Math.max(1, Number(params.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(params.limit ?? 50)));

  const filter: Record<string, any> = {
    recipientUserId: new Types.ObjectId(params.userId),
    recipientType: params.userType,
  };

  if (params.unreadOnly) {
    filter.readAt = null;
  }

  const [items, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Notification.countDocuments(filter),
  ]);

  return { items, page, limit, total };
}

export async function getUnreadCount(params: { userId: string; userType: NotificationRecipientType }) {
  const unreadCount = await Notification.countDocuments({
    recipientUserId: new Types.ObjectId(params.userId),
    recipientType: params.userType,
    readAt: null,
  });

  return { unreadCount };
}

export async function markRead(params: {
  userId: string;
  userType: NotificationRecipientType;
  notificationId: string;
}) {
  if (!Types.ObjectId.isValid(params.notificationId)) {
    return null;
  }

  return Notification.findOneAndUpdate(
    {
      _id: new Types.ObjectId(params.notificationId),
      recipientUserId: new Types.ObjectId(params.userId),
      recipientType: params.userType,
    },
    { $set: { readAt: new Date() } },
    { new: true }
  ).lean();
}

export async function markAllRead(params: { userId: string; userType: NotificationRecipientType }) {
  const result = await Notification.updateMany(
    {
      recipientUserId: new Types.ObjectId(params.userId),
      recipientType: params.userType,
      readAt: null,
    },
    { $set: { readAt: new Date() } }
  );

  return { modifiedCount: result.modifiedCount };
}
