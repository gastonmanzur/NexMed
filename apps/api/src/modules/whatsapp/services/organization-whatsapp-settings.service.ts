import { env } from '../../../config/env.js';
import { GlobalWhatsAppSettingsRepository } from '../repositories/global-whatsapp-settings.repository.js';
import type { GlobalWhatsAppSettingsDocument } from '../models/global-whatsapp-settings.model.js';

export interface OrganizationWhatsAppSettingsDto {
  organizationId: string; enabled: boolean; inheritedFromGlobal: boolean; suspendedForOrganization: boolean; provider: 'meta_cloud_api'; senderDisplayName: string; senderDisplayPhone: string | null; displayPhoneNumber: string | null;
  globalProviderConfigured: boolean; providerConfigured: boolean; headerImageConfigured: boolean;
  meta: { hasAccessToken: boolean; apiVersion: string | null; phoneNumberId: string | null; businessAccountId: string | null };
  templates: { confirmation: string; test: string | null; reminder: string; cancellation: string; rescheduled: string; notice: string; appointmentConfirmation: string; appointmentReminder: string; appointmentCancellation: string; appointmentRescheduled: string };
  templateLanguage: 'es_AR'; sendConfirmation: boolean; sendReminder: boolean; sendMidpointReminder: boolean; sendSecondReminder: boolean;
  reminderHoursBefore: number; secondReminderHoursBefore: number | null; createdAt: string; updatedAt: string;
}

export type GlobalWhatsAppSettingsDto = Omit<OrganizationWhatsAppSettingsDto, 'organizationId' | 'inheritedFromGlobal' | 'suspendedForOrganization'> & { key: 'global'; suspendedOrganizationIds: string[] };

export class OrganizationWhatsAppSettingsService {
  constructor(private readonly repo = new GlobalWhatsAppSettingsRepository()) {}
  async get(organizationId: string): Promise<OrganizationWhatsAppSettingsDto> { return this.toOrganizationDto(await this.resolve(organizationId), organizationId); }
  async resolve(_organizationId: string): Promise<GlobalWhatsAppSettingsDocument> { return this.repo.resolve(); }
  async getGlobal(): Promise<GlobalWhatsAppSettingsDto> { return this.toGlobalDto(await this.repo.resolve()); }
  async upsertGlobal(input: Partial<GlobalWhatsAppSettingsDto>, updatedByUserId?: string): Promise<GlobalWhatsAppSettingsDto> {
    const update: any = { updatedByUserId: updatedByUserId ?? null };
    for (const key of ['enabled','senderDisplayName','senderDisplayPhone','templateLanguage','sendConfirmation','sendReminder','sendMidpointReminder','sendSecondReminder','reminderHoursBefore','secondReminderHoursBefore'] as const) if (input[key] !== undefined) update[key] = input[key];
    if (input.templates) update.templates = this.normalizeTemplates(input.templates);
    return this.toGlobalDto(await this.repo.update(update));
  }
  async setOrganizationSuspended(organizationId: string, suspended: boolean, updatedByUserId?: string): Promise<OrganizationWhatsAppSettingsDto> { return this.toOrganizationDto(await this.repo.setOrganizationSuspended(organizationId, suspended, updatedByUserId), organizationId); }
  async upsert(organizationId: string, _input: Partial<OrganizationWhatsAppSettingsDto>): Promise<OrganizationWhatsAppSettingsDto> { return this.get(organizationId); }
  isOrganizationSuspended(row: GlobalWhatsAppSettingsDocument, organizationId: string): boolean { return (row.suspendedOrganizationIds ?? []).some((id) => id.toString() === organizationId); }
  isEnabledForOrganization(row: GlobalWhatsAppSettingsDocument, organizationId: string): boolean { return Boolean(row.enabled) && !this.isOrganizationSuspended(row, organizationId); }
  private normalizeTemplates(t: any) { return { confirmation: t.confirmation ?? t.appointmentConfirmation ?? 'appointment_confirmation', test: t.test ?? null, reminder: t.reminder ?? t.appointmentReminder ?? 'appointment_reminder', cancellation: t.cancellation ?? t.appointmentCancellation ?? 'appointment_cancellation', rescheduled: t.rescheduled ?? t.appointmentRescheduled ?? 'appointment_rescheduled', notice: t.notice ?? 'appointment_notice' }; }
  private base(row: GlobalWhatsAppSettingsDocument) {
    const templates = this.normalizeTemplates(row.templates ?? {});
    return { enabled: row.enabled, provider: 'meta_cloud_api' as const, senderDisplayName: row.senderDisplayName ?? env.META_WHATSAPP_SENDER_DISPLAY_NAME, senderDisplayPhone: row.senderDisplayPhone ?? null, displayPhoneNumber: row.senderDisplayPhone ?? null, globalProviderConfigured: Boolean(env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID), providerConfigured: Boolean(env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID), headerImageConfigured: Boolean(env.META_WHATSAPP_HEADER_IMAGE_URL), meta: { hasAccessToken: Boolean(env.WHATSAPP_ACCESS_TOKEN), apiVersion: env.WHATSAPP_META_API_VERSION, phoneNumberId: null, businessAccountId: null }, templates: { ...templates, appointmentConfirmation: templates.confirmation, appointmentReminder: templates.reminder, appointmentCancellation: templates.cancellation, appointmentRescheduled: templates.rescheduled }, templateLanguage: 'es_AR' as const, sendConfirmation: row.sendConfirmation ?? true, sendReminder: row.sendReminder ?? true, sendMidpointReminder: row.sendMidpointReminder ?? true, sendSecondReminder: row.sendSecondReminder ?? false, reminderHoursBefore: row.reminderHoursBefore ?? 24, secondReminderHoursBefore: row.secondReminderHoursBefore ?? 2, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
  }
  private toOrganizationDto(row: GlobalWhatsAppSettingsDocument, organizationId: string): OrganizationWhatsAppSettingsDto { const suspended = this.isOrganizationSuspended(row, organizationId); return { organizationId, ...this.base(row), enabled: Boolean(row.enabled) && !suspended, inheritedFromGlobal: true, suspendedForOrganization: suspended }; }
  private toGlobalDto(row: GlobalWhatsAppSettingsDocument): GlobalWhatsAppSettingsDto { return { key: 'global', ...this.base(row), suspendedOrganizationIds: (row.suspendedOrganizationIds ?? []).map((id) => id.toString()) }; }
}
