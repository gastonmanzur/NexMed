import { Schema, Types, model } from "mongoose";

export type NotificationUserType = "patient" | "clinic";

export interface NotificationDocument {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  userType: NotificationUserType;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  dedupeKey?: string;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<NotificationDocument>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    userType: { type: String, enum: ["patient", "clinic"], required: true, index: true },
    type: { type: String, required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    data: { type: Schema.Types.Mixed, required: false },
    dedupeKey: { type: String, required: false, unique: true, sparse: true },
    readAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

export const Notification = model<NotificationDocument>("Notification", notificationSchema);
