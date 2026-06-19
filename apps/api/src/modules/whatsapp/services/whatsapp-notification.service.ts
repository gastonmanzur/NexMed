import mongoose from 'mongoose';
import { env } from '../../../config/env.js';
import { logger } from '../../../config/logger.js';
import { AppointmentRepository } from '../../appointments/repositories/appointment.repository.js';
import { OrganizationRepository } from '../../organizations/repositories/organization.repository.js';
import { ProfessionalRepository } from '../../professionals/repositories/professional.repository.js';
import { OrganizationPatientProfileModel } from '../../patient/models/organization-patient-profile.model.js';
import { AppointmentNotificationRepository } from '../repositories/appointment-notification.repository.js';
import { OrganizationWhatsAppSettingsService } from './organization-whatsapp-settings.service.js';
import { MetaCloudApiWhatsAppProvider } from '../providers/meta-cloud-api-whatsapp.provider.js';
import { normalizeArgentinaWhatsAppPhone } from './phone-normalizer.js';
import type { AppointmentDocument } from '../../appointments/models/appointment.model.js';
import type { AppointmentNotificationDocument } from '../models/appointment-notification.model.js';

type NotificationType = AppointmentNotificationDocument['type'];
const reminderTypes: NotificationType[] = ['midpoint_reminder', 'reminder', 'second_reminder'];

export class WhatsAppNotificationService {
  constructor(private readonly notifications = new AppointmentNotificationRepository(), private readonly settings = new OrganizationWhatsAppSettingsService(), private readonly appointments = new AppointmentRepository(), private readonly organizations = new OrganizationRepository(), private readonly professionals = new ProfessionalRepository()) {}

  async scheduleAppointmentConfirmation(appointmentId: string): Promise<void> { const appt = await this.findAppointment(appointmentId); if (appt) await this.scheduleAllForAppointment(appt, true); }
  async scheduleAppointmentReminder(appointmentId: string): Promise<void> { const appt = await this.findAppointment(appointmentId); if (appt) await this.scheduleAllForAppointment(appt, false); }
  async scheduleAppointmentCancellation(appointmentId: string): Promise<void> { await this.schedule(appointmentId, 'cancellation', new Date()); }
  async scheduleAppointmentRescheduled(appointmentId: string): Promise<void> { await this.schedule(appointmentId, 'rescheduled', new Date()); }
  async cancelPendingNotifications(appointmentId: string, types?: NotificationType[], reason = 'appointment_changed'): Promise<number> { return this.notifications.cancelPendingByAppointment(appointmentId, types, reason); }

  private async scheduleAllForAppointment(appointment: AppointmentDocument, includeConfirmation: boolean): Promise<void> {
    const settings = await this.settings.resolve(appointment.organizationId.toString());
    const now = new Date();
    if (includeConfirmation && settings.sendConfirmation) await this.schedule(appointment._id.toString(), 'confirmation', now, appointment);
    if (!settings.sendReminder) return;
    const finalAt = new Date(appointment.startAt.getTime() - (settings.reminderHoursBefore ?? 24) * 60 * 60_000);
    if (finalAt > now) await this.schedule(appointment._id.toString(), 'reminder', finalAt, appointment);
    if (settings.sendMidpointReminder) {
      const midpoint = new Date(appointment.createdAt.getTime() + (appointment.startAt.getTime() - appointment.createdAt.getTime()) / 2);
      if (midpoint.getTime() > now.getTime() + 3 * 60 * 60_000 && midpoint < appointment.startAt && midpoint.getTime() < finalAt.getTime() - 3 * 60 * 60_000) await this.schedule(appointment._id.toString(), 'midpoint_reminder', midpoint, appointment);
    }
    if (settings.sendSecondReminder) { const secondAt = new Date(appointment.startAt.getTime() - (settings.secondReminderHoursBefore ?? 2) * 60 * 60_000); if (secondAt > now) await this.schedule(appointment._id.toString(), 'second_reminder', secondAt, appointment); }
  }

  async scheduleTestNotification(organizationId: string, phone: string, patientName = 'Paciente de prueba'): Promise<{ id: string; status: string }> {
    const settings = await this.settings.resolve(organizationId);
    const normalized = normalizeArgentinaWhatsAppPhone(phone);
    const row = await this.notifications.create({ organizationId: new mongoose.Types.ObjectId(organizationId), appointmentId: new mongoose.Types.ObjectId(), channel: 'whatsapp', type: 'notice', status: normalized.ok && settings.enabled ? 'pending' : 'skipped', scheduledFor: new Date(), recipientPhone: phone, normalizedRecipientPhone: normalized.ok ? normalized.normalized : '', senderDisplayName: settings.senderDisplayName ?? env.META_WHATSAPP_SENDER_DISPLAY_NAME, provider: 'meta_cloud_api', templateName: settings.templates?.notice ?? 'appointment_notice', templateLanguage: settings.templateLanguage ?? 'es', templateParams: [patientName, 'NexMed', new Date().toLocaleDateString('es-AR'), new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }), 'Prueba'], errorMessage: normalized.ok ? null : normalized.error, skippedAt: normalized.ok ? null : new Date() });
    return { id: row._id.toString(), status: row.status };
  }

  async processDueNotifications(now = new Date()): Promise<{ scanned: number; sent: number; failed: number }> { const due = await this.notifications.findPendingDue(now, 20); let sent=0, failed=0; for (const item of due) { const r = await this.sendNotification(item._id.toString()).catch((error) => { logger.warn({ error }, 'whatsapp send failed'); return null; }); if (r?.status === 'sent') sent++; if (r?.status === 'failed') failed++; } return { scanned: due.length, sent, failed }; }

  async sendNotification(notificationId: string): Promise<AppointmentNotificationDocument | null> {
    const notification = await this.notifications.markProcessing(notificationId); if (!notification) return null;
    const skip = async (msg: string) => this.notifications.markFinished(notificationId, { status: 'skipped', skippedAt: new Date(), errorMessage: msg, error: msg });
    const settings = await this.settings.resolve(notification.organizationId.toString());
    if (!settings.enabled) return skip('whatsapp_disabled_for_organization');
    if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) return skip('meta_whatsapp_global_provider_not_configured');
    if (!notification.normalizedRecipientPhone) return skip('invalid_recipient_phone');
    try { const provider = new MetaCloudApiWhatsAppProvider(); const result = await provider.sendTemplateMessage({ organizationId: notification.organizationId.toString(), phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID, to: notification.normalizedRecipientPhone, templateName: notification.templateName ?? 'appointment_notice', languageCode: notification.templateLanguage ?? settings.templateLanguage ?? 'es', params: notification.templateParams ?? [], accessToken: env.WHATSAPP_ACCESS_TOKEN, apiVersion: env.WHATSAPP_META_API_VERSION }); return this.notifications.markFinished(notificationId, { status: 'sent', sentAt: new Date(), providerMessageId: result.providerMessageId ?? null, providerResponse: result.raw ?? null, error: null, errorMessage: null }); }
    catch (error) { const message = error instanceof Error ? error.message : 'unknown_whatsapp_error'; const attempts = notification.attempts; const failed = attempts >= (notification.maxAttempts ?? 3); return this.notifications.markFinished(notificationId, { status: failed ? 'failed' : 'pending', ...(failed ? { failedAt: new Date() } : { scheduledFor: new Date(Date.now() + ([5,15,60][Math.max(0, Math.min(2, attempts-1))] ?? 60) * 60_000) }), errorMessage: message, error: message }); }
  }

  private async schedule(appointmentId: string, type: NotificationType, scheduledFor: Date, prefetched?: AppointmentDocument): Promise<void> {
    const appointment = prefetched ?? await this.findAppointment(appointmentId); if (!appointment) return;
    const settings = await this.settings.resolve(appointment.organizationId.toString()); if (!settings.enabled) return;
    const orgPatientProfile = await OrganizationPatientProfileModel.findOne({ organizationId: appointment.organizationId, patientProfileId: appointment.patientProfileId }).exec();
    if (!orgPatientProfile?.whatsappOptIn) return;
    const normalized = normalizeArgentinaWhatsAppPhone(appointment.patientPhone); const common = await this.commonPayload(appointment, type);
    await this.createIgnoringDuplicate({ ...common, status: normalized.ok ? 'pending' : 'skipped', scheduledFor, normalizedRecipientPhone: normalized.ok ? normalized.normalized : '', errorMessage: normalized.ok ? null : normalized.error, skippedAt: normalized.ok ? null : new Date() });
  }
  private async commonPayload(appointment: AppointmentDocument, type: NotificationType): Promise<Partial<AppointmentNotificationDocument>> { const [settings, organization, professional] = await Promise.all([this.settings.resolve(appointment.organizationId.toString()), this.organizations.findById(appointment.organizationId.toString()), this.professionals.findByIdInOrganization(appointment.organizationId.toString(), appointment.professionalId.toString())]); const patientName = appointment.beneficiaryDisplayName ?? appointment.patientName; const organizationName = organization?.displayName ?? organization?.name ?? 'el centro'; const date = appointment.startAt.toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }); const time = appointment.startAt.toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit' }); const professionalName = professional?.displayName ?? (`${professional?.firstName ?? ''} ${professional?.lastName ?? ''}`.trim() || 'el profesional'); const params = type === 'cancellation' ? [patientName, organizationName, date, time] : [patientName, organizationName, date, time, professionalName]; const key = type === 'midpoint_reminder' || type === 'second_reminder' ? 'reminder' : type; return { organizationId: appointment.organizationId, appointmentId: appointment._id, patientProfileId: appointment.patientProfileId ?? null, channel: 'whatsapp', type, recipientPhone: appointment.patientPhone ?? '', senderDisplayName: settings.senderDisplayName ?? env.META_WHATSAPP_SENDER_DISPLAY_NAME, senderDisplayPhone: settings.senderDisplayPhone ?? null, provider: 'meta_cloud_api', templateName: settings.templates?.[key as keyof typeof settings.templates] ?? `appointment_${key}`, templateLanguage: settings.templateLanguage ?? 'es', templateParams: params, attempts: 0, maxAttempts: 3 }; }
  private async createIgnoringDuplicate(input: Partial<AppointmentNotificationDocument>): Promise<void> { try { await this.notifications.create(input); } catch (error) { if (error && typeof error === 'object' && 'code' in error && (error as any).code === 11000) return; throw error; } }
  private async findAppointment(appointmentId: string): Promise<AppointmentDocument | null> { if (!mongoose.isValidObjectId(appointmentId)) return null; return this.appointments.findById(appointmentId); }
}
