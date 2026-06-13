import mongoose, { type InferSchemaType, type Model } from 'mongoose';

export const appointmentNotificationChannels = ['whatsapp'] as const;
export const appointmentNotificationTypes = ['appointment_confirmation', 'appointment_reminder', 'appointment_cancellation', 'appointment_rescheduled'] as const;
export const appointmentNotificationStatuses = ['pending', 'processing', 'sent', 'failed', 'skipped', 'manual_required', 'cancelled'] as const;

const appointmentNotificationSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Organization', index: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Appointment', index: true },
    patientProfileId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'PatientProfile', index: true, default: null },
    patientIdentityId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'PatientIdentity', index: true, default: null },
    channel: { type: String, enum: appointmentNotificationChannels, required: true, default: 'whatsapp' },
    type: { type: String, enum: appointmentNotificationTypes, required: true, index: true },
    status: { type: String, enum: appointmentNotificationStatuses, required: true, default: 'pending', index: true },
    scheduledFor: { type: Date, required: true, index: true },
    sentAt: { type: Date, required: false, default: null },
    recipientPhone: { type: String, required: true, trim: true },
    normalizedRecipientPhone: { type: String, required: true, trim: true },
    senderDisplayPhone: { type: String, required: false, trim: true, default: null },
    provider: { type: String, enum: ['manual', 'noop', 'meta_cloud_api'], required: false, default: null },
    templateName: { type: String, required: false, trim: true, default: null },
    templateParams: { type: mongoose.Schema.Types.Mixed, required: false, default: null },
    payloadPreview: { type: mongoose.Schema.Types.Mixed, required: false, default: null },
    providerMessageId: { type: String, required: false, trim: true, default: null },
    error: { type: String, required: false, trim: true, default: null },
    attempts: { type: Number, required: true, default: 0 },
    lastAttemptAt: { type: Date, required: false, default: null }
  },
  { timestamps: true }
);

appointmentNotificationSchema.index({ status: 1, scheduledFor: 1 });
appointmentNotificationSchema.index({ appointmentId: 1, type: 1 });
appointmentNotificationSchema.index({ organizationId: 1, createdAt: -1 });
appointmentNotificationSchema.index(
  { appointmentId: 1, type: 1, channel: 1 },
  { unique: true, partialFilterExpression: { status: { $ne: 'cancelled' } } }
);

export type AppointmentNotificationDocument = InferSchemaType<typeof appointmentNotificationSchema> & { _id: mongoose.Types.ObjectId };
export const AppointmentNotificationModel: Model<AppointmentNotificationDocument> = mongoose.model<AppointmentNotificationDocument>('AppointmentNotification', appointmentNotificationSchema);
