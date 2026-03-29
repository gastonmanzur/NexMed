import mongoose, { type InferSchemaType, type Model } from 'mongoose';

export const notificationTypes = [
  'appointment_booked',
  'appointment_canceled',
  'appointment_rescheduled',
  'appointment_reminder',
  'availability_alert',
  'general_event'
] as const;

export const notificationChannels = ['in_app', 'email', 'push'] as const;
export const notificationStatuses = ['pending', 'delivered', 'read', 'failed'] as const;

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User', index: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'Organization', default: null, index: true },
    patientProfileId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'PatientProfile', default: null, index: true },
    type: { type: String, enum: notificationTypes, required: true, index: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    relatedEntityType: { type: String, required: false, trim: true, default: null },
    relatedEntityId: { type: String, required: false, trim: true, default: null },
    channel: { type: String, enum: notificationChannels, default: 'in_app', index: true },
    status: { type: String, enum: notificationStatuses, default: 'delivered', index: true },
    readAt: { type: Date, required: false, default: null }
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index(
  { userId: 1, type: 1, relatedEntityId: 1, channel: 1 },
  { unique: true, partialFilterExpression: { relatedEntityId: { $type: 'string' } } }
);

export type NotificationDocument = InferSchemaType<typeof notificationSchema> & { _id: mongoose.Types.ObjectId };

export const NotificationModel: Model<NotificationDocument> = mongoose.model<NotificationDocument>('Notification', notificationSchema);
