import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import { notificationChannels } from '../../notifications/models/notification.model.js';

const reminderDispatchSchema = new mongoose.Schema(
  {
    appointmentId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Appointment', index: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Organization', index: true },
    ruleId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'ReminderRule', index: true },
    scheduledFor: { type: Date, required: true, index: true },
    channel: { type: String, enum: notificationChannels, default: 'in_app' },
    status: { type: String, enum: ['pending', 'sent', 'canceled', 'failed'], default: 'pending', index: true },
    sentAt: { type: Date, default: null },
    canceledAt: { type: Date, default: null },
    cancelReason: { type: String, default: null },
    attemptCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

reminderDispatchSchema.index({ appointmentId: 1, ruleId: 1 }, { unique: true });
reminderDispatchSchema.index({ status: 1, scheduledFor: 1 });

export type ReminderDispatchDocument = InferSchemaType<typeof reminderDispatchSchema> & { _id: mongoose.Types.ObjectId };

export const ReminderDispatchModel: Model<ReminderDispatchDocument> = mongoose.model<ReminderDispatchDocument>('ReminderDispatch', reminderDispatchSchema);
