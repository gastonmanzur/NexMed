import mongoose, { type InferSchemaType, type Model } from 'mongoose';

export const whatsappProviders = ['meta_cloud_api'] as const;

const whatsappTemplatesSchema = new mongoose.Schema(
  {
    confirmation: { type: String, required: false, trim: true, default: 'appointment_confirmation' },
    reminder: { type: String, required: false, trim: true, default: 'appointment_reminder' },
    cancellation: { type: String, required: false, trim: true, default: 'appointment_cancellation' },
    rescheduled: { type: String, required: false, trim: true, default: 'appointment_rescheduled' },
    notice: { type: String, required: false, trim: true, default: 'appointment_notice' }
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
    provider: { type: String, enum: whatsappProviders, required: true, default: 'meta_cloud_api' },
    senderDisplayName: { type: String, required: true, trim: true, default: 'NexMed' },
    senderDisplayPhone: { type: String, required: false, trim: true, default: null },
    displayPhoneNumber: { type: String, required: false, trim: true, default: null },
    meta: { type: whatsappMetaSchema, required: false, default: () => ({}) },
    templates: { type: whatsappTemplatesSchema, required: true, default: () => ({}) },
    templateLanguage: { type: String, enum: ['es', 'es_AR'], required: true, default: 'es_AR' },
    sendConfirmation: { type: Boolean, required: true, default: true },
    sendReminder: { type: Boolean, required: true, default: true },
    sendMidpointReminder: { type: Boolean, required: true, default: true },
    sendSecondReminder: { type: Boolean, required: true, default: false },
    reminderHoursBefore: { type: Number, required: true, default: 24, min: 1, max: 720 },
    secondReminderHoursBefore: { type: Number, required: false, default: 2, min: 1, max: 720 }
  },
  { timestamps: true }
);

export type OrganizationWhatsAppSettingsDocument = InferSchemaType<typeof organizationWhatsAppSettingsSchema> & { _id: mongoose.Types.ObjectId };
export const OrganizationWhatsAppSettingsModel: Model<OrganizationWhatsAppSettingsDocument> = mongoose.model<OrganizationWhatsAppSettingsDocument>('OrganizationWhatsAppSettings', organizationWhatsAppSettingsSchema);
