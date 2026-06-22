import { env } from '../../../config/env.js';
import { OrganizationWhatsAppSettingsModel, type OrganizationWhatsAppSettingsDocument } from '../models/organization-whatsapp-settings.model.js';

export interface UpsertOrganizationWhatsAppSettingsInput {
  organizationId: string;
  enabled: boolean;
  senderDisplayName?: string | null;
  senderDisplayPhone?: string | null;
  templates?: Partial<{ confirmation: string; test: string | null; reminder: string; cancellation: string; rescheduled: string; notice: string }>;
  templateLanguage?: 'es_AR';
  sendConfirmation?: boolean; sendReminder?: boolean; sendMidpointReminder?: boolean; sendSecondReminder?: boolean;
  reminderHoursBefore?: number; secondReminderHoursBefore?: number | null;
}

export class OrganizationWhatsAppSettingsRepository {
  async findByOrganizationId(organizationId: string): Promise<OrganizationWhatsAppSettingsDocument | null> {
    return OrganizationWhatsAppSettingsModel.findOne({ organizationId }).exec();
  }

  async upsertByOrganizationId(input: UpsertOrganizationWhatsAppSettingsInput): Promise<OrganizationWhatsAppSettingsDocument> {
    const $set: Record<string, unknown> = { provider: 'meta_cloud_api' };
    if (input.enabled !== undefined) $set.enabled = input.enabled;
    if (input.senderDisplayName !== undefined) $set.senderDisplayName = input.senderDisplayName ?? env.META_WHATSAPP_SENDER_DISPLAY_NAME;
    if (input.senderDisplayPhone !== undefined) {
      $set.senderDisplayPhone = input.senderDisplayPhone;
      $set.displayPhoneNumber = input.senderDisplayPhone;
    }
    if (input.templates) {
      for (const [key, value] of Object.entries(input.templates)) {
        if (value !== undefined) $set[`templates.${key}`] = value;
      }
    }
    if (input.templateLanguage !== undefined) $set.templateLanguage = input.templateLanguage;
    for (const key of ['sendConfirmation','sendReminder','sendMidpointReminder','sendSecondReminder','reminderHoursBefore','secondReminderHoursBefore'] as const) {
      if (input[key] !== undefined) $set[key] = input[key];
    }

    return OrganizationWhatsAppSettingsModel.findOneAndUpdate(
      { organizationId: input.organizationId },
      {
        $set,
        $setOnInsert: { organizationId: input.organizationId }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).exec() as Promise<OrganizationWhatsAppSettingsDocument>;
  }
}
