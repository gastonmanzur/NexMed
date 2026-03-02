import { Schema, Types, model } from "mongoose";

export type NotificationRecipientType = "patient" | "clinic";

export interface NotificationDocument {
  _id: Types.ObjectId;
  recipientUserId: Types.ObjectId;
  recipientType: NotificationRecipientType;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  readAt?: Date | null;
  dedupeKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<NotificationDocument>(
  {
    recipientUserId: { type: Schema.Types.ObjectId, required: true, index: true },
    recipientType: { type: String, enum: ["patient", "clinic"], required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    data: { type: Schema.Types.Mixed, default: null },
    readAt: { type: Date, default: null },
    dedupeKey: { type: String, default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ dedupeKey: 1 }, { unique: true, sparse: true });
notificationSchema.index({ recipientUserId: 1, readAt: 1, createdAt: -1 });

export const Notification = model<NotificationDocument>("Notification", notificationSchema);
