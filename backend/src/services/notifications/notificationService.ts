import { Types } from "mongoose";
import { Notification, NotificationDocument, NotificationUserType } from "../../models/Notification";

export async function createNotification(params: {
  userId: string;
  userType: NotificationUserType;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  dedupeKey?: string;
}) {
  if (params.dedupeKey) {
    const existing = await Notification.findOne({ dedupeKey: params.dedupeKey }).select("_id").lean<{ _id: Types.ObjectId } | null>();
    if (existing?._id) return { created: false, notificationId: String(existing._id) };
  }

  const payload: {
    userId: Types.ObjectId;
    userType: NotificationUserType;
    type: string;
    title: string;
    message: string;
    data?: Record<string, unknown>;
    dedupeKey?: string;
  } = {
    userId: new Types.ObjectId(params.userId),
    userType: params.userType,
    type: params.type,
    title: params.title,
    message: params.message,
  };

  if (params.data) payload.data = params.data;
  if (params.dedupeKey) payload.dedupeKey = params.dedupeKey;

  const created = await Notification.create(payload);

  return { created: true, notificationId: String(created._id) };
}

export async function listNotifications(params: { userId: string; userType: NotificationUserType; page?: number; limit?: number }) {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(50, Math.max(1, params.limit ?? 50));

  const filter = {
    userId: new Types.ObjectId(params.userId),
    userType: params.userType,
  };

  const [items, total] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean<NotificationDocument[]>(),
    Notification.countDocuments(filter),
  ]);

  return { items, total, page, limit };
}

export async function getUnreadCount(params: { userId: string; userType: NotificationUserType }) {
  const count = await Notification.countDocuments({
    userId: new Types.ObjectId(params.userId),
    userType: params.userType,
    readAt: null,
  });
  return { unreadCount: count };
}

export async function markAllRead(params: { userId: string; userType: NotificationUserType }) {
  const result = await Notification.updateMany(
    {
      userId: new Types.ObjectId(params.userId),
      userType: params.userType,
      readAt: null,
    },
    { $set: { readAt: new Date() } }
  );

  return { updated: result.modifiedCount };
}

export async function markRead(params: { userId: string; userType: NotificationUserType; notificationId: string }) {
  const result = await Notification.findOneAndUpdate(
    {
      _id: params.notificationId,
      userId: new Types.ObjectId(params.userId),
      userType: params.userType,
      readAt: null,
    },
    { $set: { readAt: new Date() } },
    { new: true }
  ).lean();

  return { updated: Boolean(result), notification: result };
}
