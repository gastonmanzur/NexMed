import { env } from '../../../config/env.js';
import { OrganizationWhatsAppSettingsRepository } from '../repositories/organization-whatsapp-settings.repository.js';
import type { OrganizationWhatsAppSettingsDocument } from '../models/organization-whatsapp-settings.model.js';

export interface OrganizationWhatsAppSettingsDto {
  organizationId: string; enabled: boolean; provider: 'meta_cloud_api'; senderDisplayName: string; senderDisplayPhone: string | null; displayPhoneNumber: string | null;
  globalProviderConfigured: boolean;
  meta: { hasAccessToken: boolean; apiVersion: string | null; phoneNumberId: string | null; businessAccountId: string | null };
  templates: { confirmation: string; test: string | null; reminder: string; cancellation: string; rescheduled: string; notice: string; appointmentConfirmation: string; appointmentReminder: string; appointmentCancellation: string; appointmentRescheduled: string };
  templateLanguage: 'es_AR'; sendConfirmation: boolean; sendReminder: boolean; sendMidpointReminder: boolean; sendSecondReminder: boolean;
  reminderHoursBefore: number; secondReminderHoursBefore: number | null; createdAt: string; updatedAt: string;
}

export class OrganizationWhatsAppSettingsService {
  constructor(private readonly repo = new OrganizationWhatsAppSettingsRepository()) {}
  async get(organizationId: string): Promise<OrganizationWhatsAppSettingsDto> { return this.toDto(await this.resolve(organizationId)); }
  async resolve(organizationId: string): Promise<OrganizationWhatsAppSettingsDocument> {
    return (await this.repo.findByOrganizationId(organizationId)) ?? this.repo.upsertByOrganizationId({ organizationId, enabled: false });
  }
  async upsert(organizationId: string, input: Partial<OrganizationWhatsAppSettingsDto>): Promise<OrganizationWhatsAppSettingsDto> {
    const update: any = { organizationId };
    if (input.enabled !== undefined) update.enabled = input.enabled;
    if (input.senderDisplayName !== undefined) update.senderDisplayName = input.senderDisplayName;
    if (input.templates) update.templates = input.templates;
    if (input.templateLanguage) update.templateLanguage = input.templateLanguage;
    for (const key of ['sendConfirmation','sendReminder','sendMidpointReminder','sendSecondReminder','reminderHoursBefore','secondReminderHoursBefore'] as const) if (input[key] !== undefined) update[key] = input[key];
    const row = await this.repo.upsertByOrganizationId(update);
    return this.toDto(row);
  }
  private toDto(row: OrganizationWhatsAppSettingsDocument): OrganizationWhatsAppSettingsDto {
    const t = row.templates ?? {};
    const confirmation = t.confirmation ?? (t as any).appointmentConfirmation ?? 'appointment_confirmation';
    const test = t.test ?? null;
    const reminder = t.reminder ?? (t as any).appointmentReminder ?? 'appointment_reminder';
    const cancellation = t.cancellation ?? (t as any).appointmentCancellation ?? 'appointment_cancellation';
    const rescheduled = t.rescheduled ?? (t as any).appointmentRescheduled ?? 'appointment_rescheduled';
    const notice = t.notice ?? 'appointment_notice';
    return { organizationId: row.organizationId.toString(), enabled: row.enabled, provider: 'meta_cloud_api', senderDisplayName: row.senderDisplayName ?? env.META_WHATSAPP_SENDER_DISPLAY_NAME, senderDisplayPhone: row.senderDisplayPhone ?? null, displayPhoneNumber: row.senderDisplayPhone ?? row.displayPhoneNumber ?? null, globalProviderConfigured: Boolean(env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID), meta: { hasAccessToken: Boolean(env.WHATSAPP_ACCESS_TOKEN), apiVersion: env.WHATSAPP_META_API_VERSION, phoneNumberId: null, businessAccountId: null }, templates: { confirmation, test, reminder, cancellation, rescheduled, notice, appointmentConfirmation: confirmation, appointmentReminder: reminder, appointmentCancellation: cancellation, appointmentRescheduled: rescheduled }, templateLanguage: 'es_AR', sendConfirmation: row.sendConfirmation ?? true, sendReminder: row.sendReminder ?? true, sendMidpointReminder: row.sendMidpointReminder ?? true, sendSecondReminder: row.sendSecondReminder ?? false, reminderHoursBefore: row.reminderHoursBefore ?? 24, secondReminderHoursBefore: row.secondReminderHoursBefore ?? 2, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
  }
}
