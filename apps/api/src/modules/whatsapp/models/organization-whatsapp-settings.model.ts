import mongoose, { type InferSchemaType, type Model } from 'mongoose';

export const whatsappProviders = ['manual', 'noop', 'meta_cloud_api'] as const;

const whatsappTemplatesSchema = new mongoose.Schema(
  {
    appointmentConfirmation: { type: String, required: false, trim: true, default: 'appointment_confirmation' },
    appointmentReminder: { type: String, required: false, trim: true, default: 'appointment_reminder' },
    appointmentCancellation: { type: String, required: false, trim: true, default: 'appointment_cancellation' },
    appointmentRescheduled: { type: String, required: false, trim: true, default: 'appointment_rescheduled' }
  },
  { _id: false }
);

const whatsappMetaSchema = new mongoose.Schema(
  {
    phoneNumberId: { type: String, required: false, trim: true, default: null },
    businessAccountId: { type: String, required: false, trim: true, default: null },
    accessTokenEncrypted: { type: String, required: false, trim: true, default: null },
    apiVersion: { type: String, required: false, trim: true, default: null }
  },
  { _id: false }
);

const organizationWhatsAppSettingsSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Organization', unique: true, index: true },
    enabled: { type: Boolean, required: true, default: false, index: true },
    provider: { type: String, enum: whatsappProviders, required: true, default: 'noop' },
    displayPhoneNumber: { type: String, required: false, trim: true, default: null },
    meta: { type: whatsappMetaSchema, required: false, default: () => ({}) },
    templates: { type: whatsappTemplatesSchema, required: true, default: () => ({}) },
    reminderHoursBefore: { type: Number, required: true, default: 24, min: 1, max: 720 },
    secondReminderHoursBefore: { type: Number, required: false, default: null, min: 1, max: 720 }
  },
  { timestamps: true }
);

export type OrganizationWhatsAppSettingsDocument = InferSchemaType<typeof organizationWhatsAppSettingsSchema> & { _id: mongoose.Types.ObjectId };
export const OrganizationWhatsAppSettingsModel: Model<OrganizationWhatsAppSettingsDocument> = mongoose.model<OrganizationWhatsAppSettingsDocument>('OrganizationWhatsAppSettings', organizationWhatsAppSettingsSchema);
