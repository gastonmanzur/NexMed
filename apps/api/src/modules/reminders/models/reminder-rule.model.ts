import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import { notificationChannels } from '../../notifications/models/notification.model.js';

export const reminderRuleStatuses = ['active', 'inactive'] as const;

const reminderRuleSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Organization', index: true },
    triggerHoursBefore: { type: Number, required: true, min: 1, max: 720 },
    channel: { type: String, enum: notificationChannels, default: 'in_app' },
    status: { type: String, enum: reminderRuleStatuses, default: 'active', index: true }
  },
  { timestamps: true }
);

reminderRuleSchema.index({ organizationId: 1, triggerHoursBefore: 1, channel: 1 }, { unique: true });

export type ReminderRuleDocument = InferSchemaType<typeof reminderRuleSchema> & { _id: mongoose.Types.ObjectId };

export const ReminderRuleModel: Model<ReminderRuleDocument> = mongoose.model<ReminderRuleDocument>('ReminderRule', reminderRuleSchema);
