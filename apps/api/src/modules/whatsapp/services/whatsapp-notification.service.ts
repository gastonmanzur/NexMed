import mongoose from 'mongoose';
import { env } from '../../../config/env.js';
import { logger } from '../../../config/logger.js';
import { AppointmentRepository } from '../../appointments/repositories/appointment.repository.js';
import { OrganizationRepository } from '../../organizations/repositories/organization.repository.js';
import { ProfessionalRepository } from '../../professionals/repositories/professional.repository.js';
import { OrganizationPatientProfileModel } from '../../patient/models/organization-patient-profile.model.js';
import { AppointmentNotificationRepository } from '../repositories/appointment-notification.repository.js';
import { OrganizationWhatsAppSettingsRepository } from '../repositories/organization-whatsapp-settings.repository.js';
import { NoopWhatsAppProvider } from '../providers/noop-whatsapp.provider.js';
import { ManualWhatsAppProvider } from '../providers/manual-whatsapp.provider.js';
import { MetaCloudApiWhatsAppProvider } from '../providers/meta-cloud-api-whatsapp.provider.js';
import type { WhatsAppProvider } from '../providers/whatsapp-provider.js';
import { normalizeArgentinaWhatsAppPhone } from './phone-normalizer.js';
import type { AppointmentDocument } from '../../appointments/models/appointment.model.js';
import type { AppointmentNotificationDocument } from '../models/appointment-notification.model.js';
import type { OrganizationWhatsAppSettingsDocument } from '../models/organization-whatsapp-settings.model.js';

type NotificationType = AppointmentNotificationDocument['type'];
type Provider = NonNullable<AppointmentNotificationDocument['provider']>;

const templateKeyByType: Record<NotificationType, keyof OrganizationWhatsAppSettingsDocument['templates']> = {
  appointment_confirmation: 'appointmentConfirmation',
  appointment_reminder: 'appointmentReminder',
  appointment_cancellation: 'appointmentCancellation',
  appointment_rescheduled: 'appointmentRescheduled'
};

export class WhatsAppNotificationService {
  constructor(
    private readonly notifications = new AppointmentNotificationRepository(),
    private readonly settingsRepo = new OrganizationWhatsAppSettingsRepository(),
    private readonly appointments = new AppointmentRepository(),
    private readonly organizations = new OrganizationRepository(),
    private readonly professionals = new ProfessionalRepository()
  ) {}

  async scheduleAppointmentConfirmation(appointmentId: string): Promise<void> {
    await this.schedule(appointmentId, 'appointment_confirmation', new Date());
  }

  async scheduleAppointmentReminder(appointmentId: string): Promise<void> {
    const appointment = await this.findAppointment(appointmentId);
    if (!appointment) return;
    const settings = await this.resolveSettings(appointment.organizationId.toString());
    const scheduledFor = new Date(appointment.startAt.getTime() - settings.reminderHoursBefore * 60 * 60_000);
    if (appointment.startAt.getTime() - Date.now() < 2 * 60 * 60_000) {
      logger.info({ appointmentId }, 'whatsapp reminder skipped because appointment is too close');
      return;
    }
    await this.schedule(appointmentId, 'appointment_reminder', scheduledFor, appointment, settings);
  }

  async scheduleAppointmentCancellation(appointmentId: string): Promise<void> {
    await this.schedule(appointmentId, 'appointment_cancellation', new Date());
  }

  async scheduleAppointmentRescheduled(appointmentId: string): Promise<void> {
    await this.schedule(appointmentId, 'appointment_rescheduled', new Date());
  }

  async cancelPendingNotifications(appointmentId: string, types?: NotificationType[], reason = 'appointment_changed'): Promise<number> {
    return this.notifications.cancelPendingByAppointment(appointmentId, types, reason);
  }

  async processDueNotifications(now = new Date()): Promise<{ scanned: number; sent: number; failed: number }> {
    const due = await this.notifications.findPendingDue(now);
    let sent = 0;
    let failed = 0;
    for (const item of due) {
      try {
        const result = await this.sendNotification(item._id.toString());
        if (['sent', 'manual_required', 'skipped'].includes(result?.status ?? '')) sent += 1;
        if (result?.status === 'failed') failed += 1;
      } catch (error) {
        failed += 1;
        logger.warn({ error, notificationId: item._id.toString() }, 'whatsapp notification processing failed');
      }
    }
    return { scanned: due.length, sent, failed };
  }

  async sendNotification(notificationId: string): Promise<AppointmentNotificationDocument | null> {
    const notification = await this.notifications.markProcessing(notificationId);
    if (!notification) return null;

    const settings = await this.resolveSettings(notification.organizationId.toString());
    if (!settings.enabled) {
      return this.notifications.markFinished(notificationId, { status: 'skipped', error: 'whatsapp_disabled' });
    }

    const providerName = (notification.provider ?? settings.provider ?? env.WHATSAPP_PROVIDER) as Provider;
    if (providerName === 'manual') {
      return this.notifications.markFinished(notificationId, {
        status: 'manual_required',
        sentAt: new Date(),
        payloadPreview: this.buildPayloadPreview(notification, settings),
        error: null
      });
    }

    try {
      const provider = this.providerFor(providerName);
      const result = await provider.sendTemplateMessage({
        organizationId: notification.organizationId.toString(),
        phoneNumberId: settings.meta?.phoneNumberId ?? env.WHATSAPP_PHONE_NUMBER_ID ?? '',
        to: notification.normalizedRecipientPhone,
        templateName: notification.templateName ?? this.templateName(settings, notification.type),
        languageCode: env.WHATSAPP_DEFAULT_LANGUAGE,
        params: this.paramsArray(notification),
        accessToken: settings.meta?.accessTokenEncrypted ?? env.WHATSAPP_ACCESS_TOKEN,
        apiVersion: settings.meta?.apiVersion ?? env.WHATSAPP_META_API_VERSION
      });
      return this.notifications.markFinished(notificationId, {
        status: 'sent',
        sentAt: new Date(),
        providerMessageId: result.providerMessageId ?? null,
        payloadPreview: result.payloadPreview ?? this.buildPayloadPreview(notification, settings),
        error: null
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown_whatsapp_error';
      return this.notifications.markFinished(notificationId, {
        status: notification.attempts >= 3 ? 'failed' : 'pending',
        error: message
      });
    }
  }

  private async schedule(appointmentId: string, type: NotificationType, scheduledFor: Date, prefetchedAppointment?: AppointmentDocument, prefetchedSettings?: OrganizationWhatsAppSettingsDocument): Promise<void> {
    const appointment = prefetchedAppointment ?? await this.findAppointment(appointmentId);
    if (!appointment) return;
    const settings = prefetchedSettings ?? await this.resolveSettings(appointment.organizationId.toString());
    if (!settings.enabled) return;

    const normalizedPhone = normalizeArgentinaWhatsAppPhone(appointment.patientPhone);
    const common = await this.commonPayload(appointment, type, settings);
    if (!normalizedPhone.ok) {
      await this.createIgnoringDuplicate({ ...common, status: 'skipped', normalizedRecipientPhone: '', error: normalizedPhone.error });
      return;
    }
    await this.createIgnoringDuplicate({ ...common, status: 'pending', normalizedRecipientPhone: normalizedPhone.normalized, error: null, scheduledFor });
  }

  private async commonPayload(appointment: AppointmentDocument, type: NotificationType, settings: OrganizationWhatsAppSettingsDocument): Promise<Partial<AppointmentNotificationDocument>> {
    const [organization, professional, orgPatientProfile] = await Promise.all([
      this.organizations.findById(appointment.organizationId.toString()),
      this.professionals.findByIdInOrganization(appointment.organizationId.toString(), appointment.professionalId.toString()),
      OrganizationPatientProfileModel.findOne({ organizationId: appointment.organizationId, patientProfileId: appointment.patientProfileId }).exec()
    ]);
    const params = {
      patientName: appointment.beneficiaryDisplayName ?? appointment.patientName,
      organizationName: organization?.displayName ?? organization?.name ?? 'el centro',
      date: appointment.startAt.toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }),
      time: appointment.startAt.toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit' }),
      professionalName: professional?.displayName ?? (`${professional?.firstName ?? ''} ${professional?.lastName ?? ''}`.trim() || 'el profesional'),
      address: organization?.locationLabel ?? organization?.address ?? 'consultar con el centro'
    };
    return {
      organizationId: appointment.organizationId,
      appointmentId: appointment._id,
      patientProfileId: appointment.patientProfileId ?? null,
      patientIdentityId: orgPatientProfile?.patientIdentityId ?? null,
      channel: 'whatsapp',
      type,
      scheduledFor: new Date(),
      recipientPhone: appointment.patientPhone ?? '',
      senderDisplayPhone: settings.displayPhoneNumber ?? null,
      provider: settings.provider,
      templateName: this.templateName(settings, type),
      templateParams: params,
      attempts: 0
    };
  }

  private async createIgnoringDuplicate(input: Partial<AppointmentNotificationDocument>): Promise<void> {
    try {
      await this.notifications.create(input);
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 11000) return;
      throw error;
    }
  }

  private async findAppointment(appointmentId: string): Promise<AppointmentDocument | null> {
    if (!mongoose.isValidObjectId(appointmentId)) return null;
    return this.appointments.findById(appointmentId);
  }

  private async resolveSettings(organizationId: string): Promise<OrganizationWhatsAppSettingsDocument> {
    const existing = await this.settingsRepo.findByOrganizationId(organizationId);
    if (existing) return existing;
    return this.settingsRepo.upsertByOrganizationId({
      organizationId,
      enabled: false,
      provider: env.WHATSAPP_PROVIDER,
      displayPhoneNumber: null,
      meta: { phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID ?? null, businessAccountId: env.WHATSAPP_BUSINESS_ACCOUNT_ID ?? null, apiVersion: env.WHATSAPP_META_API_VERSION },
      templates: {},
      reminderHoursBefore: 24,
      secondReminderHoursBefore: null
    });
  }

  private providerFor(provider: Provider): WhatsAppProvider {
    if (provider === 'manual') return new ManualWhatsAppProvider();
    if (provider === 'meta_cloud_api') return new MetaCloudApiWhatsAppProvider();
    return new NoopWhatsAppProvider();
  }

  private templateName(settings: OrganizationWhatsAppSettingsDocument, type: NotificationType): string {
    return settings.templates?.[templateKeyByType[type]] ?? type;
  }

  private paramsArray(notification: AppointmentNotificationDocument): string[] {
    const params = (notification.templateParams ?? {}) as Record<string, string>;
    if (notification.type === 'appointment_confirmation') return [params.patientName, params.organizationName, params.date, params.time, params.professionalName, params.address].map(String);
    if (notification.type === 'appointment_reminder') return [params.patientName, params.organizationName, params.date, params.time, params.professionalName].map(String);
    if (notification.type === 'appointment_cancellation') return [params.patientName, params.organizationName, params.date, params.time].map(String);
    return [params.patientName, params.organizationName, params.date, params.time, params.professionalName].map(String);
  }

  private buildPayloadPreview(notification: AppointmentNotificationDocument, settings: OrganizationWhatsAppSettingsDocument): Record<string, unknown> {
    return { to: notification.normalizedRecipientPhone, templateName: notification.templateName, params: notification.templateParams, provider: notification.provider ?? settings.provider };
  }
}
