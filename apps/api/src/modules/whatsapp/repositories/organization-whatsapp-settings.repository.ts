import { OrganizationWhatsAppSettingsModel, type OrganizationWhatsAppSettingsDocument } from '../models/organization-whatsapp-settings.model.js';

type Provider = OrganizationWhatsAppSettingsDocument['provider'];

export interface UpsertOrganizationWhatsAppSettingsInput {
  organizationId: string;
  enabled: boolean;
  provider: Provider;
  displayPhoneNumber?: string | null | undefined;
  meta?: {
    phoneNumberId?: string | null | undefined;
    businessAccountId?: string | null | undefined;
    accessTokenEncrypted?: string | null | undefined;
    apiVersion?: string | null | undefined;
  };
  templates: {
    appointmentConfirmation?: string | null | undefined;
    appointmentReminder?: string | null | undefined;
    appointmentCancellation?: string | null | undefined;
    appointmentRescheduled?: string | null | undefined;
  };
  reminderHoursBefore: number;
  secondReminderHoursBefore?: number | null | undefined;
}

export class OrganizationWhatsAppSettingsRepository {
  async findByOrganizationId(organizationId: string): Promise<OrganizationWhatsAppSettingsDocument | null> {
    return OrganizationWhatsAppSettingsModel.findOne({ organizationId }).exec();
  }

  async upsertByOrganizationId(input: UpsertOrganizationWhatsAppSettingsInput): Promise<OrganizationWhatsAppSettingsDocument> {
    return OrganizationWhatsAppSettingsModel.findOneAndUpdate(
      { organizationId: input.organizationId },
      {
        $set: {
          enabled: input.enabled,
          provider: input.provider,
          displayPhoneNumber: input.displayPhoneNumber ?? null,
          meta: {
            phoneNumberId: input.meta?.phoneNumberId ?? null,
            businessAccountId: input.meta?.businessAccountId ?? null,
            accessTokenEncrypted: input.meta?.accessTokenEncrypted ?? null,
            apiVersion: input.meta?.apiVersion ?? null
          },
          templates: {
            appointmentConfirmation: input.templates.appointmentConfirmation ?? 'appointment_confirmation',
            appointmentReminder: input.templates.appointmentReminder ?? 'appointment_reminder',
            appointmentCancellation: input.templates.appointmentCancellation ?? 'appointment_cancellation',
            appointmentRescheduled: input.templates.appointmentRescheduled ?? 'appointment_rescheduled'
          },
          reminderHoursBefore: input.reminderHoursBefore,
          secondReminderHoursBefore: input.secondReminderHoursBefore ?? null
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).exec() as Promise<OrganizationWhatsAppSettingsDocument>;
  }
}
