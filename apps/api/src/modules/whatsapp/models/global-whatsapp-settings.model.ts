import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import { whatsappProviders } from './organization-whatsapp-settings.model.js';

const whatsappTemplatesSchema = new mongoose.Schema(
  {
    confirmation: { type: String, required: true, trim: true, default: 'appointment_confirmation' },
    reminder: { type: String, required: true, trim: true, default: 'appointment_reminder' },
    cancellation: { type: String, required: true, trim: true, default: 'appointment_cancellation' },
    rescheduled: { type: String, required: true, trim: true, default: 'appointment_rescheduled' },
    notice: { type: String, required: true, trim: true, default: 'appointment_notice' },
    test: { type: String, required: false, trim: true, default: null }
  },
  { _id: false }
);

const globalWhatsAppSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'global', enum: ['global'] },
    enabled: { type: Boolean, required: true, default: false, index: true },
    provider: { type: String, enum: whatsappProviders, required: true, default: 'meta_cloud_api' },
    senderDisplayName: { type: String, required: true, trim: true, default: 'NexMed' },
    senderDisplayPhone: { type: String, required: false, trim: true, default: null },
    templates: { type: whatsappTemplatesSchema, required: true, default: () => ({}) },
    templateLanguage: { type: String, enum: ['es_AR'], required: true, default: 'es_AR' },
    sendConfirmation: { type: Boolean, required: true, default: true },
    sendReminder: { type: Boolean, required: true, default: true },
    sendMidpointReminder: { type: Boolean, required: true, default: true },
    sendSecondReminder: { type: Boolean, required: true, default: false },
    reminderHoursBefore: { type: Number, required: true, default: 24, min: 1, max: 720 },
    secondReminderHoursBefore: { type: Number, required: false, default: 2, min: 1, max: 720 },
    suspendedOrganizationIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: [] }],
    updatedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, default: null }
  },
  { timestamps: true }
);

export type GlobalWhatsAppSettingsDocument = InferSchemaType<typeof globalWhatsAppSettingsSchema> & { _id: mongoose.Types.ObjectId };
export const GlobalWhatsAppSettingsModel: Model<GlobalWhatsAppSettingsDocument> = mongoose.model<GlobalWhatsAppSettingsDocument>('GlobalWhatsAppSettings', globalWhatsAppSettingsSchema);
