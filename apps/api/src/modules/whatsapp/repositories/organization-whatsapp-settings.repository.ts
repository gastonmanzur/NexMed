import { env } from '../../../config/env.js';
import { OrganizationWhatsAppSettingsModel, type OrganizationWhatsAppSettingsDocument } from '../models/organization-whatsapp-settings.model.js';

export interface UpsertOrganizationWhatsAppSettingsInput {
  organizationId: string;
  enabled: boolean;
  senderDisplayName?: string | null;
  senderDisplayPhone?: string | null;
  templates?: Partial<{ confirmation: string; reminder: string; cancellation: string; rescheduled: string; notice: string }>;
  templateLanguage?: 'es' | 'es_AR';
  sendConfirmation?: boolean; sendReminder?: boolean; sendMidpointReminder?: boolean; sendSecondReminder?: boolean;
  reminderHoursBefore?: number; secondReminderHoursBefore?: number | null;
}

export class OrganizationWhatsAppSettingsRepository {
  async findByOrganizationId(organizationId: string): Promise<OrganizationWhatsAppSettingsDocument | null> {
    return OrganizationWhatsAppSettingsModel.findOne({ organizationId }).exec();
  }

  async upsertByOrganizationId(input: UpsertOrganizationWhatsAppSettingsInput): Promise<OrganizationWhatsAppSettingsDocument> {
    return OrganizationWhatsAppSettingsModel.findOneAndUpdate(
      { organizationId: input.organizationId },
      { $set: {
        enabled: input.enabled,
        provider: 'meta_cloud_api',
        senderDisplayName: input.senderDisplayName ?? env.META_WHATSAPP_SENDER_DISPLAY_NAME,
        senderDisplayPhone: input.senderDisplayPhone ?? null,
        displayPhoneNumber: input.senderDisplayPhone ?? null,
        meta: { phoneNumberId: null, businessAccountId: null, accessTokenEncrypted: null, apiVersion: null },
        templates: {
          confirmation: input.templates?.confirmation ?? 'appointment_confirmation',
          reminder: input.templates?.reminder ?? 'appointment_reminder',
          cancellation: input.templates?.cancellation ?? 'appointment_cancellation',
          rescheduled: input.templates?.rescheduled ?? 'appointment_rescheduled',
          notice: input.templates?.notice ?? 'appointment_notice'
        },
        templateLanguage: input.templateLanguage ?? 'es_AR',
        sendConfirmation: input.sendConfirmation ?? true,
        sendReminder: input.sendReminder ?? true,
        sendMidpointReminder: input.sendMidpointReminder ?? true,
        sendSecondReminder: input.sendSecondReminder ?? false,
        reminderHoursBefore: input.reminderHoursBefore ?? 24,
        secondReminderHoursBefore: input.secondReminderHoursBefore ?? 2
      } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).exec() as Promise<OrganizationWhatsAppSettingsDocument>;
  }
}
