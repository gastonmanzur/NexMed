import { AppError } from '../../../core/errors.js';
import { OrganizationWhatsAppSettingsRepository } from '../repositories/organization-whatsapp-settings.repository.js';
import type { OrganizationWhatsAppSettingsDocument } from '../models/organization-whatsapp-settings.model.js';

export interface OrganizationWhatsAppSettingsDto {
  organizationId: string;
  enabled: boolean;
  provider: 'manual' | 'noop' | 'meta_cloud_api';
  displayPhoneNumber: string | null;
  meta: { phoneNumberId: string | null; businessAccountId: string | null; apiVersion: string | null; hasAccessToken: boolean };
  templates: { appointmentConfirmation: string; appointmentReminder: string; appointmentCancellation: string; appointmentRescheduled: string };
  reminderHoursBefore: number;
  secondReminderHoursBefore: number | null;
  createdAt: string;
  updatedAt: string;
}

export class OrganizationWhatsAppSettingsService {
  constructor(private readonly repo = new OrganizationWhatsAppSettingsRepository()) {}

  async get(organizationId: string): Promise<OrganizationWhatsAppSettingsDto | null> {
    const row = await this.repo.findByOrganizationId(organizationId);
    return row ? this.toDto(row) : null;
  }

  async upsert(organizationId: string, input: {
    enabled: boolean;
    provider: 'manual' | 'noop' | 'meta_cloud_api';
    displayPhoneNumber?: string | null | undefined;
    meta?: { phoneNumberId?: string | null | undefined; businessAccountId?: string | null | undefined; apiVersion?: string | null | undefined; accessToken?: string | null | undefined };
    templates: { appointmentConfirmation?: string | null | undefined; appointmentReminder?: string | null | undefined; appointmentCancellation?: string | null | undefined; appointmentRescheduled?: string | null | undefined };
    reminderHoursBefore: number;
    secondReminderHoursBefore?: number | null | undefined;
  }): Promise<OrganizationWhatsAppSettingsDto> {
    if (input.provider === 'meta_cloud_api' && input.enabled && !input.meta?.phoneNumberId) {
      throw new AppError('WHATSAPP_PHONE_NUMBER_ID_REQUIRED', 400, 'Phone Number ID is required for Meta Cloud API');
    }
    const existing = await this.repo.findByOrganizationId(organizationId);
    const row = await this.repo.upsertByOrganizationId({
      organizationId,
      enabled: input.enabled,
      provider: input.provider,
      displayPhoneNumber: input.displayPhoneNumber ?? null,
      meta: {
        phoneNumberId: input.meta?.phoneNumberId ?? null,
        businessAccountId: input.meta?.businessAccountId ?? null,
        apiVersion: input.meta?.apiVersion ?? null,
        accessTokenEncrypted: input.meta?.accessToken ? input.meta.accessToken : existing?.meta?.accessTokenEncrypted ?? null
      },
      templates: input.templates,
      reminderHoursBefore: input.reminderHoursBefore,
      secondReminderHoursBefore: input.secondReminderHoursBefore ?? null
    });
    return this.toDto(row);
  }

  private toDto(row: OrganizationWhatsAppSettingsDocument): OrganizationWhatsAppSettingsDto {
    return {
      organizationId: row.organizationId.toString(),
      enabled: row.enabled,
      provider: row.provider,
      displayPhoneNumber: row.displayPhoneNumber ?? null,
      meta: {
        phoneNumberId: row.meta?.phoneNumberId ?? null,
        businessAccountId: row.meta?.businessAccountId ?? null,
        apiVersion: row.meta?.apiVersion ?? null,
        hasAccessToken: Boolean(row.meta?.accessTokenEncrypted)
      },
      templates: {
        appointmentConfirmation: row.templates?.appointmentConfirmation ?? 'appointment_confirmation',
        appointmentReminder: row.templates?.appointmentReminder ?? 'appointment_reminder',
        appointmentCancellation: row.templates?.appointmentCancellation ?? 'appointment_cancellation',
        appointmentRescheduled: row.templates?.appointmentRescheduled ?? 'appointment_rescheduled'
      },
      reminderHoursBefore: row.reminderHoursBefore,
      secondReminderHoursBefore: row.secondReminderHoursBefore ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    };
  }
}
