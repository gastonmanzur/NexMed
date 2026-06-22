import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

export const appointmentNotificationChannels = ['whatsapp'] as const;
export const appointmentNotificationTypes = ['appointment_confirmation', 'confirmation', 'midpoint_reminder', 'reminder', 'second_reminder', 'cancellation', 'rescheduled', 'notice'] as const;
export const appointmentNotificationStatuses = ['pending', 'processing', 'sent', 'delivered', 'read', 'failed', 'skipped', 'cancelled'] as const;


const templateHeaderSchema = new Schema(
  {
    type: { type: String, enum: ['image'], required: true },
    link: { type: String, required: false, trim: true, default: null },
    mediaId: { type: String, required: false, trim: true, default: null }
  },
  { _id: false }
);

const templateNamedParameterSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    value: { type: String, required: true }
  },
  { _id: false }
);

const appointmentNotificationSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Organization', index: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'Appointment', index: true, default: null },
    isTest: { type: Boolean, required: true, default: false, index: true },
    patientProfileId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'PatientProfile', index: true, default: null },
    patientIdentityId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'PatientIdentity', index: true, default: null },
    channel: { type: String, enum: appointmentNotificationChannels, required: true, default: 'whatsapp' },
    type: { type: String, enum: appointmentNotificationTypes, required: true, index: true },
    status: { type: String, enum: appointmentNotificationStatuses, required: true, default: 'pending', index: true },
    scheduledFor: { type: Date, required: true, index: true },
    sentAt: { type: Date, required: false, default: null },
    recipientPhone: { type: String, required: true, trim: true },
    normalizedRecipientPhone: { type: String, required: true, trim: true },
    senderDisplayName: { type: String, required: true, trim: true, default: 'NexMed' },
    senderDisplayPhone: { type: String, required: false, trim: true, default: null },
    provider: { type: String, enum: ['meta_cloud_api'], required: true, default: 'meta_cloud_api' },
    templateName: { type: String, required: false, trim: true, default: null },
    templateLanguage: { type: String, required: true, trim: true, default: 'es_AR' },
    templateParams: { type: [String], required: true, default: [] },
    templateParameters: {
      type: [{ name: { type: String, required: true, trim: true }, value: { type: String, required: true, trim: true } }],
      required: true,
      default: []
    },
    templateNamedParams: {
      type: [templateNamedParameterSchema],
      required: false,
      default: []
    },
    templateHeader: {
      type: templateHeaderSchema,
      required: false,
      default: null
    },
    payloadPreview: { type: mongoose.Schema.Types.Mixed, required: false, default: null },
    providerMessageId: { type: String, required: false, trim: true, default: null },
    maxAttempts: { type: Number, required: true, default: 3 },
    lockedAt: { type: Date, required: false, default: null },
    deliveredAt: { type: Date, required: false, default: null },
    readAt: { type: Date, required: false, default: null },
    failedAt: { type: Date, required: false, default: null },
    skippedAt: { type: Date, required: false, default: null },
    cancelledAt: { type: Date, required: false, default: null },
    errorCode: { type: String, required: false, trim: true, default: null },
    errorMessage: { type: String, required: false, trim: true, default: null },
    providerResponse: { type: mongoose.Schema.Types.Mixed, required: false, default: null },
    error: { type: String, required: false, trim: true, default: null },
    attempts: { type: Number, required: true, default: 0 },
    lastAttemptAt: { type: Date, required: false, default: null }
  },
  { timestamps: true }
);

appointmentNotificationSchema.index({ status: 1, scheduledFor: 1 });
appointmentNotificationSchema.index({ organizationId: 1, appointmentId: 1, channel: 1, type: 1 });
appointmentNotificationSchema.index({ providerMessageId: 1 });
appointmentNotificationSchema.index({ organizationId: 1, createdAt: -1 });
appointmentNotificationSchema.index(
  { appointmentId: 1, type: 1, channel: 1 },
  { unique: true, partialFilterExpression: { status: { $ne: 'cancelled' }, appointmentId: { $type: 'objectId' } } }
);

export type AppointmentNotificationDocument = InferSchemaType<typeof appointmentNotificationSchema> & { _id: mongoose.Types.ObjectId };
export const AppointmentNotificationModel: Model<AppointmentNotificationDocument> = mongoose.model<AppointmentNotificationDocument>('AppointmentNotification', appointmentNotificationSchema);
