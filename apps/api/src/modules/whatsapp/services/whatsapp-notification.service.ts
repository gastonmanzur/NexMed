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
import { appointmentNotificationTypes } from '../models/appointment-notification.model.js';
import type { AppointmentNotificationDocument } from '../models/appointment-notification.model.js';

type NotificationType = AppointmentNotificationDocument['type'];
type ProcessStatus = 'sent' | 'failed' | 'skipped' | 'retried' | 'ignored';
export interface WhatsAppProcessResult { status: ProcessStatus; notification: AppointmentNotificationDocument | null; reason?: string }
export interface WhatsAppWorkerTickResult { scanned: number; claimed: number; sent: number; failed: number; skipped: number; retried: number; ignored: number }
const reminderTypes: NotificationType[] = ['midpoint_reminder', 'reminder', 'second_reminder'];
const supportedTypes = new Set<string>(appointmentNotificationTypes);
const supportedProviders = new Set<string>(['meta_cloud_api']);

const maskPhone = (phone?: string | null): string | null => phone ? `${phone.slice(0, 3)}****${phone.slice(-2)}` : null;
const meta = (notification: AppointmentNotificationDocument) => ({ notificationId: notification._id.toString(), type: notification.type, isTest: !notification.appointmentId, provider: notification.provider, status: notification.status, templateName: notification.templateName, templateLanguage: notification.templateLanguage, normalizedRecipientPhone: maskPhone(notification.normalizedRecipientPhone) });
const sanitizeProviderResponse = (value: unknown): unknown => {
  if (!value || typeof value !== 'object') return value;
  return JSON.parse(JSON.stringify(value, (key, val) => /token|authorization|access_token/i.test(key) ? '[redacted]' : val));
};
const errorDetails = (error: unknown): { code: string; message: string; response: unknown } => {
  const message = error instanceof Error ? error.message : 'unknown_whatsapp_error';
  const match = message.match(/meta_cloud_api_error_(\d+):\s*(.*)$/);
  if (!match) return { code: message.toUpperCase(), message, response: null };
  const parsed = (() => { try { return JSON.parse(match[2] ?? '{}'); } catch { return match[2]; } })();
  const providerError = typeof parsed === 'object' && parsed && 'error' in parsed ? (parsed as any).error : null;
  return { code: providerError?.code ? `META_${providerError.code}` : `META_HTTP_${match[1]}`, message: providerError?.message ?? message, response: sanitizeProviderResponse(parsed) };
};

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
    if (!settings.enabled) throw Object.assign(new Error('WhatsApp está desactivado para esta organización'), { code: 'WHATSAPP_DISABLED_FOR_ORGANIZATION' });
    const normalized = normalizeArgentinaWhatsAppPhone(phone);
    const row = await this.notifications.create({ organizationId: new mongoose.Types.ObjectId(organizationId), appointmentId: null, isTest: true, channel: 'whatsapp', type: 'notice', status: normalized.ok ? 'pending' : 'failed', scheduledFor: new Date(), recipientPhone: phone, normalizedRecipientPhone: normalized.ok ? normalized.normalized : '', senderDisplayName: settings.senderDisplayName ?? env.META_WHATSAPP_SENDER_DISPLAY_NAME, provider: 'meta_cloud_api', templateName: settings.templates?.notice ?? 'appointment_notice', templateLanguage: settings.templateLanguage ?? 'es', templateParams: [patientName, 'NexMed', new Date().toLocaleDateString('es-AR'), new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }), 'Prueba'], errorCode: normalized.ok ? null : 'INVALID_RECIPIENT_PHONE', errorMessage: normalized.ok ? null : normalized.error, failedAt: normalized.ok ? null : new Date() });
    return { id: row._id.toString(), status: row.status };
  }

  async processDueNotifications(now = new Date()): Promise<WhatsAppWorkerTickResult> {
    const due = await this.notifications.findPendingDue(now, 20); const result: WhatsAppWorkerTickResult = { scanned: due.length, claimed: 0, sent: 0, failed: 0, skipped: 0, retried: 0, ignored: 0 };
    for (const item of due) {
      logger.info({ ...meta(item) }, '[WhatsAppWorker] scanned notification');
      const r = await this.processWhatsAppNotification(item._id.toString()).catch(async (error) => {
        logger.error({ error, notificationId: item._id.toString() }, '[WhatsAppWorker] failed');
        const failed = await this.markNotificationFailed(item._id.toString(), 'UNHANDLED_WORKER_ERROR', error instanceof Error ? error.message : 'unknown_whatsapp_error');
        return { status: 'failed' as const, notification: failed, reason: 'UNHANDLED_WORKER_ERROR' };
      });
      if (r.status !== 'ignored') result.claimed++;
      result[r.status]++;
    }
    return result;
  }

  async processWhatsAppNotification(notificationId: string): Promise<WhatsAppProcessResult> { return this.sendNotification(notificationId); }

  async sendNotification(notificationId: string): Promise<WhatsAppProcessResult> {
    const notification = await this.notifications.markProcessing(notificationId); if (!notification) { logger.info({ notificationId, reason: 'NOT_CLAIMED' }, '[WhatsAppWorker] notification ignored'); return { status: 'ignored', notification: null, reason: 'NOT_CLAIMED' }; }
    logger.info({ ...meta(notification) }, '[WhatsAppWorker] claimed notification');
    logger.info({ ...meta(notification) }, '[WhatsAppWorker] processing notification');
    if (!supportedTypes.has(notification.type)) return { status: 'failed', notification: await this.markNotificationFailed(notificationId, 'UNSUPPORTED_NOTIFICATION_TYPE', 'Tipo de notificación WhatsApp no soportado'), reason: 'UNSUPPORTED_NOTIFICATION_TYPE' };
    if (!supportedProviders.has(notification.provider)) return { status: 'failed', notification: await this.markNotificationFailed(notificationId, 'UNSUPPORTED_PROVIDER', 'Proveedor WhatsApp no soportado o mal configurado'), reason: 'UNSUPPORTED_PROVIDER' };
    const settings = await this.settings.resolve(notification.organizationId.toString());
    if (!settings.enabled) return { status: 'failed', notification: await this.markNotificationFailed(notificationId, 'WHATSAPP_DISABLED_FOR_ORGANIZATION', 'WhatsApp está desactivado para esta organización'), reason: 'WHATSAPP_DISABLED_FOR_ORGANIZATION' };
    if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) return { status: 'failed', notification: await this.markNotificationFailed(notificationId, 'META_WHATSAPP_GLOBAL_PROVIDER_NOT_CONFIGURED', 'Proveedor WhatsApp no soportado o mal configurado'), reason: 'META_WHATSAPP_GLOBAL_PROVIDER_NOT_CONFIGURED' };
    if (!notification.normalizedRecipientPhone) return { status: 'failed', notification: await this.markNotificationFailed(notificationId, 'INVALID_RECIPIENT_PHONE', 'Número destino inválido'), reason: 'INVALID_RECIPIENT_PHONE' };
    if (notification.appointmentId && notification.patientProfileId) { const optIn = await OrganizationPatientProfileModel.findOne({ organizationId: notification.organizationId, patientProfileId: notification.patientProfileId }).exec(); if (!optIn?.whatsappOptIn) return { status: 'skipped', notification: await this.markNotificationSkipped(notificationId, 'MISSING_OPT_IN', 'El paciente no aceptó recibir WhatsApp'), reason: 'MISSING_OPT_IN' }; }
    try { logger.info({ ...meta(notification) }, '[WhatsAppWorker] sending to Meta'); const provider = new MetaCloudApiWhatsAppProvider(); const result = await provider.sendTemplateMessage({ organizationId: notification.organizationId.toString(), phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID, to: notification.normalizedRecipientPhone, templateName: notification.templateName ?? 'appointment_notice', languageCode: notification.templateLanguage ?? settings.templateLanguage ?? 'es', params: notification.templateParams ?? [], accessToken: env.WHATSAPP_ACCESS_TOKEN, apiVersion: env.WHATSAPP_META_API_VERSION }); const sent = await this.notifications.markFinished(notificationId, { status: 'sent', sentAt: new Date(), lockedAt: null, providerMessageId: result.providerMessageId ?? null, providerResponse: sanitizeProviderResponse(result.raw) as any, error: null, errorCode: null, errorMessage: null }); logger.info({ ...meta(sent ?? notification), providerMessageId: result.providerMessageId }, '[WhatsAppWorker] sent'); return { status: 'sent', notification: sent, reason: 'SENT' }; }
    catch (error) { const details = errorDetails(error); const attempts = notification.attempts; const failed = attempts >= (notification.maxAttempts ?? 3); if (failed) { const row = await this.markNotificationFailed(notificationId, details.code, details.message, details.response); logger.warn({ ...meta(row ?? notification), errorCode: details.code }, '[WhatsAppWorker] failed'); return { status: 'failed', notification: row, reason: details.code }; } const row = await this.notifications.markFinished(notificationId, { status: 'pending', lockedAt: null, scheduledFor: new Date(Date.now() + ([5,15,60][Math.max(0, Math.min(2, attempts-1))] ?? 60) * 60_000), errorCode: details.code, errorMessage: details.message, error: details.message, providerResponse: details.response as any }); logger.warn({ ...meta(row ?? notification), errorCode: details.code }, '[WhatsAppWorker] retried'); return { status: 'retried', notification: row, reason: details.code }; }
  }

  private async markNotificationSkipped(notificationId: string, errorCode: string, errorMessage: string): Promise<AppointmentNotificationDocument | null> { const row = await this.notifications.markFinished(notificationId, { status: 'skipped', skippedAt: new Date(), lockedAt: null, errorCode, errorMessage, error: errorCode }); logger.info({ ...(row ? meta(row) : { notificationId }), reason: errorCode }, '[WhatsAppWorker] skipped'); return row; }
  private async markNotificationFailed(notificationId: string, errorCode: string, errorMessage: string, providerResponse: unknown = null): Promise<AppointmentNotificationDocument | null> { return this.notifications.markFinished(notificationId, { status: 'failed', failedAt: new Date(), lockedAt: null, errorCode, errorMessage, error: errorCode, providerResponse: sanitizeProviderResponse(providerResponse) as any }); }

  private async schedule(appointmentId: string, type: NotificationType, scheduledFor: Date, prefetched?: AppointmentDocument): Promise<void> {
    const appointment = prefetched ?? await this.findAppointment(appointmentId); if (!appointment) return;
    const settings = await this.settings.resolve(appointment.organizationId.toString()); if (!settings.enabled) return;
    const orgPatientProfile = await OrganizationPatientProfileModel.findOne({ organizationId: appointment.organizationId, patientProfileId: appointment.patientProfileId }).exec();
    if (!orgPatientProfile?.whatsappOptIn) return;
    const normalized = normalizeArgentinaWhatsAppPhone(appointment.patientPhone); const common = await this.commonPayload(appointment, type);
    await this.createIgnoringDuplicate({ ...common, status: normalized.ok ? 'pending' : 'skipped', scheduledFor, normalizedRecipientPhone: normalized.ok ? normalized.normalized : '', errorCode: normalized.ok ? null : 'INVALID_RECIPIENT_PHONE', errorMessage: normalized.ok ? null : normalized.error, skippedAt: normalized.ok ? null : new Date() });
  }
  private async commonPayload(appointment: AppointmentDocument, type: NotificationType): Promise<Partial<AppointmentNotificationDocument>> { const [settings, organization, professional] = await Promise.all([this.settings.resolve(appointment.organizationId.toString()), this.organizations.findById(appointment.organizationId.toString()), this.professionals.findByIdInOrganization(appointment.organizationId.toString(), appointment.professionalId.toString())]); const patientName = appointment.beneficiaryDisplayName ?? appointment.patientName; const organizationName = organization?.displayName ?? organization?.name ?? 'el centro'; const date = appointment.startAt.toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }); const time = appointment.startAt.toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit' }); const professionalName = professional?.displayName ?? (`${professional?.firstName ?? ''} ${professional?.lastName ?? ''}`.trim() || 'el profesional'); const params = type === 'cancellation' ? [patientName, organizationName, date, time] : [patientName, organizationName, date, time, professionalName]; const key = type === 'midpoint_reminder' || type === 'second_reminder' ? 'reminder' : type; return { organizationId: appointment.organizationId, appointmentId: appointment._id, patientProfileId: appointment.patientProfileId ?? null, channel: 'whatsapp', type, recipientPhone: appointment.patientPhone ?? '', senderDisplayName: settings.senderDisplayName ?? env.META_WHATSAPP_SENDER_DISPLAY_NAME, senderDisplayPhone: settings.senderDisplayPhone ?? null, provider: 'meta_cloud_api', templateName: settings.templates?.[key as keyof typeof settings.templates] ?? `appointment_${key}`, templateLanguage: settings.templateLanguage ?? 'es', templateParams: params, attempts: 0, maxAttempts: 3 }; }
  private async createIgnoringDuplicate(input: Partial<AppointmentNotificationDocument>): Promise<void> { try { await this.notifications.create(input); } catch (error) { if (error && typeof error === 'object' && 'code' in error && (error as any).code === 11000) return; throw error; } }
  private async findAppointment(appointmentId: string): Promise<AppointmentDocument | null> { if (!mongoose.isValidObjectId(appointmentId)) return null; return this.appointments.findById(appointmentId); }
}
