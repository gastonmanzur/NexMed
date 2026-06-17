import mongoose from 'mongoose';
import type { AppointmentBeneficiaryType, AppointmentDto, AppointmentDurationMultiplier, AppointmentStatus, AppointmentSource } from '@starter/shared-types';
import { AppError } from '../../../core/errors.js';
import { InternalMessageModel } from '../../clinical/models/internal-message.model.js';
import {
  formatAppointmentDateTimeArgentina,
  getArgentinaDateKey,
  parseAppointmentInstant
} from '../../../core/argentina-date-time.js';
import { AvailabilityService } from '../../availability/services/availability.service.js';
import { ProfessionalRepository } from '../../professionals/repositories/professional.repository.js';
import { SpecialtyRepository } from '../../professionals/repositories/specialty.repository.js';
import { ProfessionalSpecialtyRepository } from '../../professionals/repositories/professional-specialty.repository.js';
import { AppointmentRepository } from '../repositories/appointment.repository.js';
import { AuditLogRepository } from '../repositories/audit-log.repository.js';
import { NotificationService } from '../../notifications/services/notification.service.js';
import { WaitlistService } from '../../waitlist/services/waitlist.service.js';
import { ReminderService } from '../../reminders/services/reminder.service.js';
import { WhatsAppNotificationService } from '../../whatsapp/services/whatsapp-notification.service.js';
import { logger } from '../../../config/logger.js';
import { PatientOrganizationLinkRepository } from '../../patient/repositories/patient-organization-link.repository.js';
import type { AppointmentDocument } from '../models/appointment.model.js';

interface ListAppointmentsInput {
  professionalId?: string;
  status?: AppointmentStatus;
  from?: string;
  to?: string;
}

interface ListPatientAppointmentsInput {
  status?: AppointmentStatus;
  organizationId?: string;
}

interface CreateAppointmentInput {
  professionalId: string;
  specialtyId?: string | undefined;
  patientProfileId?: string | undefined;
  patientName: string;
  patientEmail?: string | undefined;
  patientPhone?: string | undefined;
  startAt: string;
  endAt?: string | undefined;
  durationMultiplier?: AppointmentDurationMultiplier | undefined;
  notes?: string | undefined;
  source: AppointmentSource;
  beneficiaryType?: AppointmentBeneficiaryType | undefined;
  familyMemberId?: string | undefined;
  beneficiaryDisplayName?: string | undefined;
  beneficiaryRelationship?: string | undefined;
  paymentCoverageType?: 'private' | 'health_insurance' | undefined;
  healthInsuranceId?: string | null | undefined;
  healthInsuranceName?: string | null | undefined;
  insuranceMemberNumber?: string | null | undefined;
  insurancePlan?: string | null | undefined;
}

interface CancelAppointmentInput {
  reason?: string | undefined;
}

interface UpdateAppointmentStatusInput {
  status: AppointmentStatus;
  note?: string | undefined;
}

interface RescheduleAppointmentInput {
  newProfessionalId?: string | undefined;
  newSpecialtyId?: string | undefined;
  newStartAt: string;
  newEndAt?: string | undefined;
  durationMultiplier?: AppointmentDurationMultiplier | undefined;
  reason?: string | undefined;
}

const ACTIVE_BOOKING_STATUSES: AppointmentStatus[] = ['booked', 'confirmed_by_patient', 'arrived', 'in_progress'];
const PENDING_OPERATIONAL_STATUSES: AppointmentStatus[] = ['booked', 'confirmed_by_patient', 'arrived', 'in_progress'];
const TERMINAL_STATUSES: AppointmentStatus[] = ['completed', 'no_show', 'canceled_by_patient', 'canceled_by_staff', 'rescheduled'];
const CENTER_STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  booked: ['arrived', 'completed', 'no_show', 'canceled_by_staff'],
  confirmed_by_patient: ['arrived', 'completed', 'no_show', 'canceled_by_staff'],
  arrived: ['in_progress', 'completed', 'no_show', 'canceled_by_staff'],
  in_progress: ['completed'],
  completed: [],
  no_show: [],
  canceled_by_patient: [],
  canceled_by_staff: [],
  rescheduled: []
};

const isValidObjectId = (value: string): boolean => mongoose.isValidObjectId(value);

const normalizeOptionalString = (value?: string): string | undefined => {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
};

const normalizeOptionalEmail = (value?: string): string | undefined => normalizeOptionalString(value)?.toLowerCase();

const normalizeOptionalPhone = (value?: string): string | undefined => {
  const normalized = normalizeOptionalString(value);
  if (!normalized) return undefined;
  return normalized.replace(/[^\d+()\-\s]/g, '').replace(/\s+/g, ' ');
};

const parseIsoDate = (value: string, fieldName: string): Date => {
  const parsed = parseAppointmentInstant(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError('INVALID_DATE', 400, `${fieldName} must be a valid ISO datetime`);
  }

  return parsed;
};

const extractDate = (date: Date): string => getArgentinaDateKey(date);

const assertStartsInFuture = (startAt: Date): void => {
  if (startAt.getTime() <= Date.now()) {
    throw new AppError('APPOINTMENT_START_IN_PAST', 400, 'No se puede reservar un turno en un horario que ya pasó.');
  }
};

export class AppointmentsService {
  constructor(
    private readonly appointments = new AppointmentRepository(),
    private readonly professionals = new ProfessionalRepository(),
    private readonly specialties = new SpecialtyRepository(),
    private readonly professionalSpecialties = new ProfessionalSpecialtyRepository(),
    private readonly availabilityService = new AvailabilityService(),
    private readonly auditLogs = new AuditLogRepository(),
    private readonly notifications = new NotificationService(),
    private readonly waitlist = new WaitlistService(),
    private readonly reminders = new ReminderService(),
    private readonly patientOrganizationLinks = new PatientOrganizationLinkRepository(),
    private readonly whatsappNotifications = new WhatsAppNotificationService()
  ) {}

  async listAppointments(organizationId: string, input: ListAppointmentsInput): Promise<AppointmentDto[]> {
    const from = input.from ? parseIsoDate(input.from, 'from') : undefined;
    const to = input.to ? parseIsoDate(input.to, 'to') : undefined;

    if (from && to && from > to) {
      throw new AppError('INVALID_DATE_RANGE', 400, 'from must be before or equal to to');
    }

    if (input.professionalId && !isValidObjectId(input.professionalId)) {
      throw new AppError('INVALID_PROFESSIONAL_ID', 400, 'professionalId is invalid');
    }

    const rows = await this.appointments.listByOrganization(organizationId, {
      ...(input.professionalId ? { professionalId: input.professionalId } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {})
    });

    return rows.map((item) => this.toDto(item));
  }

  async getAppointment(organizationId: string, appointmentId: string): Promise<AppointmentDto> {
    if (!isValidObjectId(appointmentId)) {
      throw new AppError('INVALID_APPOINTMENT_ID', 400, 'appointmentId is invalid');
    }

    const appointment = await this.appointments.findByIdInOrganization(organizationId, appointmentId);
    if (!appointment) {
      throw new AppError('APPOINTMENT_NOT_FOUND', 404, 'Appointment not found');
    }

    return this.toDto(appointment);
  }

  async createAppointment(
    organizationId: string,
    actorUserId: string,
    actorRole: 'owner' | 'admin' | 'staff' | 'patient',
    input: Omit<CreateAppointmentInput, 'source'>
  ): Promise<AppointmentDto> {
    const source: AppointmentSource =
      actorRole === 'owner' || actorRole === 'admin'
        ? 'admin_manual'
        : actorRole === 'patient'
          ? 'patient_self_service'
          : 'staff_manual';

    const normalized = await this.validateCreateInput(organizationId, {
      ...input,
      source
    });

    await this.assertSlotAvailable(
      organizationId,
      normalized.professionalId,
      normalized.startAt,
      normalized.endAt,
      normalized.durationMultiplier
    );

    try {
      const created = await this.appointments.create({
        organizationId,
        professionalId: normalized.professionalId,
        ...(normalized.specialtyId ? { specialtyId: normalized.specialtyId } : {}),
        ...(normalized.patientProfileId ? { patientProfileId: normalized.patientProfileId } : {}),
        patientName: normalized.patientName,
        ...(normalized.patientEmail ? { patientEmail: normalized.patientEmail } : {}),
        ...(normalized.patientPhone ? { patientPhone: normalized.patientPhone } : {}),
        startAt: normalized.startAt,
        endAt: normalized.endAt,
        durationMultiplier: normalized.durationMultiplier,
        status: 'booked',
        source,
        ...(normalized.notes ? { notes: normalized.notes } : {}),
        createdByUserId: actorUserId,
        bookedByUserId: actorUserId,
        beneficiaryType: normalized.beneficiaryType,
        ...(normalized.familyMemberId ? { familyMemberId: normalized.familyMemberId } : {}),
        beneficiaryDisplayName: normalized.beneficiaryDisplayName,
        ...(normalized.beneficiaryRelationship ? { beneficiaryRelationship: normalized.beneficiaryRelationship } : {})
      });

      await this.auditLogs.create({
        organizationId,
        actorUserId,
        action: 'appointment_created',
        entityType: 'appointment',
        entityId: created._id.toString(),
        payload: {
          professionalId: created.professionalId.toString(),
          startAt: created.startAt.toISOString(),
          endAt: created.endAt.toISOString(),
          durationMultiplier: created.durationMultiplier ?? 1,
          source: created.source
        }
      });

      const createdDto = this.toDto(created);
      if (createdDto.patientProfileId) {
        await this.patientOrganizationLinks.upsertActive({
          patientProfileId: createdDto.patientProfileId,
          organizationId,
          status: 'active',
          source: source === 'patient_self_service' ? 'appointment_patient_booking' : 'appointment_staff_booking'
        });
      }
      await this.notifications.notifyPatientFromAppointment(
        createdDto,
        'appointment_booked',
        'Turno reservado',
        `Turno reservado para el ${formatAppointmentDateTimeArgentina(createdDto.startAt)}.`
      );

      await this.reminders.scheduleForAppointment(created);
      await this.scheduleWhatsAppForCreatedAppointment(created._id.toString());

      return createdDto;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
        throw new AppError('APPOINTMENT_SLOT_TAKEN', 409, 'El horario acaba de ocuparse. Elegí otro slot.');
      }

      throw error;
    }
  }


  async createExpressAppointment(
    organizationId: string,
    input: Omit<CreateAppointmentInput, 'source'>
  ): Promise<AppointmentDto> {
    const normalized = await this.validateCreateInput(organizationId, {
      ...input,
      source: 'express_booking'
    });

    await this.assertSlotAvailable(
      organizationId,
      normalized.professionalId,
      normalized.startAt,
      normalized.endAt,
      normalized.durationMultiplier
    );

    try {
      const created = await this.appointments.create({
        organizationId,
        professionalId: normalized.professionalId,
        ...(normalized.specialtyId ? { specialtyId: normalized.specialtyId } : {}),
        ...(normalized.patientProfileId ? { patientProfileId: normalized.patientProfileId } : {}),
        patientName: normalized.patientName,
        ...(normalized.patientEmail ? { patientEmail: normalized.patientEmail } : {}),
        ...(normalized.patientPhone ? { patientPhone: normalized.patientPhone } : {}),
        startAt: normalized.startAt,
        endAt: normalized.endAt,
        durationMultiplier: normalized.durationMultiplier,
        status: 'booked',
        source: 'express_booking',
        ...(normalized.notes ? { notes: normalized.notes } : {}),
        createdByUserId: null,
        bookedByUserId: null,
        beneficiaryType: normalized.beneficiaryType,
        beneficiaryDisplayName: normalized.beneficiaryDisplayName,
        paymentCoverageType: input.paymentCoverageType ?? 'private',
        healthInsuranceId: input.healthInsuranceId ?? null,
        healthInsuranceName: input.healthInsuranceName ?? 'Particular',
        insuranceMemberNumber: input.insuranceMemberNumber ?? null,
        insurancePlan: input.insurancePlan ?? null
      });

      await this.reminders.scheduleForAppointment(created);
      await this.scheduleWhatsAppForCreatedAppointment(created._id.toString());
      return this.toDto(created);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
        throw new AppError('APPOINTMENT_SLOT_TAKEN', 409, 'El horario acaba de ocuparse. Elegí otro slot.');
      }
      throw error;
    }
  }

  async cancelAppointment(
    organizationId: string,
    appointmentId: string,
    actorUserId: string,
    actorRole: 'owner' | 'admin' | 'staff' | 'patient',
    input: CancelAppointmentInput
  ): Promise<AppointmentDto> {
    const appointment = await this.getBookableAppointment(organizationId, appointmentId);

    const updated = await this.appointments.updateByIdInOrganization(organizationId, appointmentId, {
      status: 'canceled_by_staff',
      canceledByUserId: actorUserId,
      canceledAt: new Date(),
      cancelReason: normalizeOptionalString(input.reason) ?? null,
      statusUpdatedAt: new Date(),
      statusUpdatedByUserId: actorUserId,
      statusUpdatedByRole: actorRole
    }, this.buildStatusHistoryEntry('canceled_by_staff', actorUserId, actorRole, input.reason));

    if (!updated) {
      throw new AppError('APPOINTMENT_NOT_FOUND', 404, 'Appointment not found');
    }
    await this.auditLogs.create({
      organizationId,
      actorUserId,
      action: 'appointment_canceled',
      entityType: 'appointment',
      entityId: updated._id.toString(),
      payload: {
        previousStatus: appointment.status,
        cancelReason: normalizeOptionalString(input.reason) ?? null
      }
    });

    const updatedDto = this.toDto(updated);
    await this.notifications.notifyPatientFromAppointment(
      updatedDto,
      'appointment_canceled',
      'Turno cancelado',
      'Tu turno fue cancelado.'
    );
    await this.reminders.scheduleForAppointment(updated);
    await this.scheduleWhatsAppForCancelledAppointment(updated._id.toString());
    await this.waitlist.handleSlotFreed({
      organizationId: updatedDto.organizationId,
      professionalId: updatedDto.professionalId,
      specialtyId: updatedDto.specialtyId,
      startAt: new Date(appointment.startAt),
      endAt: new Date(appointment.endAt)
    });

    return updatedDto;
  }


  async updateAppointmentStatus(
    organizationId: string,
    appointmentId: string,
    actorUserId: string,
    actorRole: 'owner' | 'admin' | 'staff' | 'patient',
    input: UpdateAppointmentStatusInput
  ): Promise<AppointmentDto> {
    if (!isValidObjectId(appointmentId)) {
      throw new AppError('INVALID_APPOINTMENT_ID', 400, 'appointmentId is invalid');
    }

    const appointment = await this.getAppointment(organizationId, appointmentId);
    this.assertStatusTransitionAllowed(appointment.status, input.status, actorRole);

    const now = new Date();
    const note = normalizeOptionalString(input.note);
    const update: Record<string, unknown> = {
      status: input.status,
      statusUpdatedAt: now,
      statusUpdatedByUserId: actorUserId,
      statusUpdatedByRole: actorRole
    };

    if (input.status === 'arrived') {
      update.arrivedAt = appointment.arrivedAt ? new Date(appointment.arrivedAt) : now;
    }

    if (input.status === 'canceled_by_staff') {
      update.canceledByUserId = actorUserId;
      update.canceledAt = now;
      update.cancelReason = note ?? null;
    }

    const updated = await this.appointments.updateByIdInOrganization(
      organizationId,
      appointmentId,
      update,
      this.buildStatusHistoryEntry(input.status, actorUserId, actorRole, note)
    );

    if (!updated) {
      throw new AppError('APPOINTMENT_NOT_FOUND', 404, 'Appointment not found');
    }



    if (input.status === 'arrived') {
      await InternalMessageModel.create({
        organizationId,
        appointmentId,
        patientProfileId: updated.patientProfileId ?? null,
        fromUserId: actorUserId,
        toRole: 'professional',
        type: 'patient_ready',
        message: `Paciente ${updated.patientName} llegó y está listo para atención.`
      }).catch(() => undefined);
    }

    await this.auditLogs.create({
      organizationId,
      actorUserId,
      action: 'appointment_status_updated',
      entityType: 'appointment',
      entityId: updated._id.toString(),
      payload: { previousStatus: appointment.status, status: input.status, note: note ?? null, actorRole }
    });

    const updatedDto = this.toDto(updated);
    if (input.status === 'canceled_by_staff') {
      await this.notifications.notifyPatientFromAppointment(updatedDto, 'appointment_canceled', 'Turno cancelado', 'Tu turno fue cancelado.');
      await this.reminders.scheduleForAppointment(updated);
      await this.scheduleWhatsAppForCancelledAppointment(updated._id.toString());
      await this.waitlist.handleSlotFreed({
        organizationId: updatedDto.organizationId,
        professionalId: updatedDto.professionalId,
        specialtyId: updatedDto.specialtyId,
        startAt: new Date(appointment.startAt),
        endAt: new Date(appointment.endAt)
      });
    }

    return updatedDto;
  }

  async listPatientAppointments(patientProfileId: string, input: ListPatientAppointmentsInput): Promise<AppointmentDto[]> {
    if (!isValidObjectId(patientProfileId)) {
      throw new AppError('INVALID_PATIENT_PROFILE_ID', 400, 'patientProfileId is invalid');
    }

    if (input.organizationId && !isValidObjectId(input.organizationId)) {
      throw new AppError('INVALID_ORGANIZATION_ID', 400, 'organizationId is invalid');
    }

    const rows = await this.appointments.listByPatientProfile({
      patientProfileId,
      ...(input.status ? { status: input.status } : {}),
      ...(input.organizationId ? { organizationId: input.organizationId } : {})
    });

    return rows.map((item) => this.toDto(item));
  }

  async listPatientAppointmentsForProfiles(patientProfileIds: string[], input: ListPatientAppointmentsInput): Promise<AppointmentDto[]> {
    if (patientProfileIds.length === 0 || patientProfileIds.some((id) => !isValidObjectId(id))) {
      throw new AppError('INVALID_PATIENT_PROFILE_ID', 400, 'patientProfileId is invalid');
    }
    if (input.organizationId && !isValidObjectId(input.organizationId)) {
      throw new AppError('INVALID_ORGANIZATION_ID', 400, 'organizationId is invalid');
    }
    const rows = await this.appointments.listByPatientProfiles(patientProfileIds, input);
    return rows.map((item) => this.toDto(item));
  }

  async getAppointmentForPatientProfiles(patientProfileIds: string[], appointmentId: string): Promise<AppointmentDto> {
    if (patientProfileIds.length === 0 || patientProfileIds.some((id) => !isValidObjectId(id))) {
      throw new AppError('INVALID_PATIENT_PROFILE_ID', 400, 'patientProfileId is invalid');
    }
    if (!isValidObjectId(appointmentId)) {
      throw new AppError('INVALID_APPOINTMENT_ID', 400, 'appointmentId is invalid');
    }
    const appointment = await this.appointments.findByIdForPatientProfiles(appointmentId, patientProfileIds);
    if (!appointment) throw new AppError('APPOINTMENT_NOT_FOUND', 404, 'Appointment not found');
    return this.toDto(appointment);
  }

  async getAppointmentForPatient(patientProfileId: string, appointmentId: string): Promise<AppointmentDto> {
    if (!isValidObjectId(patientProfileId)) {
      throw new AppError('INVALID_PATIENT_PROFILE_ID', 400, 'patientProfileId is invalid');
    }

    if (!isValidObjectId(appointmentId)) {
      throw new AppError('INVALID_APPOINTMENT_ID', 400, 'appointmentId is invalid');
    }

    const appointment = await this.appointments.findByIdForPatient(appointmentId, patientProfileId);
    if (!appointment) {
      throw new AppError('APPOINTMENT_NOT_FOUND', 404, 'Appointment not found');
    }

    return this.toDto(appointment);
  }

  async cancelAppointmentAsPatient(
    patientProfileId: string,
    appointmentId: string,
    actorUserId: string,
    reason?: string
  ): Promise<AppointmentDto> {
    const appointment = await this.getAppointmentForPatient(patientProfileId, appointmentId);

    this.assertStatusTransitionAllowed(appointment.status, 'canceled_by_patient', 'patient');

    const updated = await this.appointments.updateByIdInOrganization(appointment.organizationId, appointment.id, {
      status: 'canceled_by_patient',
      canceledByUserId: actorUserId,
      canceledAt: new Date(),
      cancelReason: normalizeOptionalString(reason) ?? null,
      statusUpdatedAt: new Date(),
      statusUpdatedByUserId: actorUserId,
      statusUpdatedByRole: 'patient'
    }, this.buildStatusHistoryEntry('canceled_by_patient', actorUserId, 'patient', reason));

    if (!updated) {
      throw new AppError('APPOINTMENT_NOT_FOUND', 404, 'Appointment not found');
    }

    await this.auditLogs.create({
      organizationId: appointment.organizationId,
      actorUserId,
      action: 'appointment_canceled',
      entityType: 'appointment',
      entityId: appointment.id,
      payload: {
        previousStatus: appointment.status,
        cancelReason: normalizeOptionalString(reason) ?? null
      }
    });

    const updatedDto = this.toDto(updated);
    await this.notifications.notifyPatientFromAppointment(updatedDto, 'appointment_canceled', 'Turno cancelado', 'Tu turno fue cancelado.');
    await this.reminders.scheduleForAppointment(updated);
    await this.scheduleWhatsAppForCancelledAppointment(updated._id.toString());
    await this.waitlist.handleSlotFreed({
      organizationId: appointment.organizationId,
      professionalId: appointment.professionalId,
      specialtyId: appointment.specialtyId,
      startAt: new Date(appointment.startAt),
      endAt: new Date(appointment.endAt)
    });

    return updatedDto;
  }

  async rescheduleAppointment(
    organizationId: string,
    appointmentId: string,
    actorUserId: string,
    actorRole: 'owner' | 'admin' | 'staff' | 'patient',
    input: RescheduleAppointmentInput
  ): Promise<{ original: AppointmentDto; replacement: AppointmentDto }> {
    const original = await this.getBookableAppointment(organizationId, appointmentId);

    if (original.rescheduledToAppointmentId) {
      throw new AppError('APPOINTMENT_ALREADY_RESCHEDULED', 409, 'Appointment already rescheduled');
    }

    const source: AppointmentSource =
      actorRole === 'owner' || actorRole === 'admin'
        ? 'admin_manual'
        : actorRole === 'patient'
          ? 'patient_self_service'
          : 'staff_manual';

    const normalized = await this.validateCreateInput(organizationId, {
      professionalId: normalizeOptionalString(input.newProfessionalId) ?? original.professionalId,
      specialtyId: input.newSpecialtyId ?? (original.specialtyId ?? undefined),
      patientProfileId: original.patientProfileId ?? undefined,
      patientName: original.patientName,
      patientEmail: original.patientEmail ?? undefined,
      patientPhone: original.patientPhone ?? undefined,
      startAt: input.newStartAt,
      endAt: input.newEndAt,
      durationMultiplier: input.durationMultiplier ?? original.durationMultiplier,
      notes: original.notes ?? undefined,
      source,
      beneficiaryType: original.beneficiaryType,
      familyMemberId: original.familyMemberId ?? undefined,
      beneficiaryDisplayName: original.beneficiaryDisplayName ?? original.patientName,
      beneficiaryRelationship: original.beneficiaryRelationship ?? undefined
    });

    await this.assertSlotAvailable(organizationId, normalized.professionalId, normalized.startAt, normalized.endAt, normalized.durationMultiplier);

    let replacement: AppointmentDocument;
    try {
      replacement = await this.appointments.create({
        organizationId,
        professionalId: normalized.professionalId,
        ...(normalized.specialtyId ? { specialtyId: normalized.specialtyId } : {}),
        ...(normalized.patientProfileId ? { patientProfileId: normalized.patientProfileId } : {}),
        patientName: normalized.patientName,
        ...(normalized.patientEmail ? { patientEmail: normalized.patientEmail } : {}),
        ...(normalized.patientPhone ? { patientPhone: normalized.patientPhone } : {}),
        startAt: normalized.startAt,
        endAt: normalized.endAt,
        durationMultiplier: normalized.durationMultiplier,
        status: 'booked',
        source,
        ...(normalized.notes ? { notes: normalized.notes } : {}),
        createdByUserId: actorUserId,
        bookedByUserId: original.bookedByUserId,
        beneficiaryType: normalized.beneficiaryType,
        ...(normalized.familyMemberId ? { familyMemberId: normalized.familyMemberId } : {}),
        beneficiaryDisplayName: normalized.beneficiaryDisplayName,
        ...(normalized.beneficiaryRelationship ? { beneficiaryRelationship: normalized.beneficiaryRelationship } : {}),
        rescheduledFromAppointmentId: original.id
      });
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
        throw new AppError('APPOINTMENT_SLOT_TAKEN', 409, 'El horario acaba de ocuparse. Elegí otro slot.');
      }

      throw error;
    }

    const reason = normalizeOptionalString(input.reason);

    const updatedOriginal = await this.appointments.updateByIdInOrganization(organizationId, appointmentId, {
      status: 'rescheduled',
      canceledByUserId: actorUserId,
      canceledAt: new Date(),
      cancelReason: reason ?? null,
      rescheduledToAppointmentId: replacement._id,
      statusUpdatedAt: new Date(),
      statusUpdatedByUserId: actorUserId,
      statusUpdatedByRole: actorRole
    }, this.buildStatusHistoryEntry('rescheduled', actorUserId, actorRole, input.reason));

    if (!updatedOriginal) {
      throw new AppError('APPOINTMENT_NOT_FOUND', 404, 'Appointment not found');
    }

    await this.auditLogs.create({
      organizationId,
      actorUserId,
      action: 'appointment_rescheduled',
      entityType: 'appointment',
      entityId: updatedOriginal._id.toString(),
      payload: {
        replacementAppointmentId: replacement._id.toString(),
        reason: reason ?? null
      }
    });

    const originalDto = this.toDto(updatedOriginal);
    const replacementDto = this.toDto(replacement);
    await this.notifications.notifyPatientFromAppointment(
      replacementDto,
      'appointment_rescheduled',
      'Turno reprogramado',
      `Tu turno fue reprogramado para el ${formatAppointmentDateTimeArgentina(replacementDto.startAt)}.`
    );
    await this.reminders.scheduleForAppointment(updatedOriginal);
    await this.reminders.scheduleForAppointment(replacement);
    await this.scheduleWhatsAppForRescheduledAppointment(original.id, replacement._id.toString());
    await this.waitlist.handleSlotFreed({
      organizationId: originalDto.organizationId,
      professionalId: originalDto.professionalId,
      specialtyId: originalDto.specialtyId,
      startAt: new Date(original.startAt),
      endAt: new Date(original.endAt)
    });

    return {
      original: originalDto,
      replacement: replacementDto
    };
  }

  async findBookedSlotsInRange(
    organizationId: string,
    professionalId: string,
    startDate: string,
    endDate: string
  ): Promise<Array<{ startsAtIso: string; endsAtIso: string }>> {
    const from = parseAppointmentInstant(`${startDate}T00:00:00`);
    const to = parseAppointmentInstant(`${endDate}T23:59:59.999`);

    const rows = await this.appointments.findBookedByProfessionalAndRange(organizationId, professionalId, from, to);

    return rows.map((item) => ({
      startsAtIso: item.startAt.toISOString(),
      endsAtIso: item.endAt.toISOString()
    }));
  }


  private async scheduleWhatsAppForCreatedAppointment(appointmentId: string): Promise<void> {
    try {
      await this.whatsappNotifications.scheduleAppointmentConfirmation(appointmentId);
      await this.whatsappNotifications.scheduleAppointmentReminder(appointmentId);
    } catch (error) {
      logger.warn({ error, appointmentId }, 'whatsapp scheduling failed after appointment creation');
    }
  }

  private async scheduleWhatsAppForCancelledAppointment(appointmentId: string): Promise<void> {
    try {
      await this.whatsappNotifications.cancelPendingNotifications(appointmentId, ['appointment_reminder'], 'appointment_cancelled');
      await this.whatsappNotifications.scheduleAppointmentCancellation(appointmentId);
    } catch (error) {
      logger.warn({ error, appointmentId }, 'whatsapp scheduling failed after appointment cancellation');
    }
  }

  private async scheduleWhatsAppForRescheduledAppointment(originalAppointmentId: string, replacementAppointmentId: string): Promise<void> {
    try {
      await this.whatsappNotifications.cancelPendingNotifications(originalAppointmentId, ['appointment_reminder'], 'appointment_rescheduled');
      await this.whatsappNotifications.scheduleAppointmentRescheduled(replacementAppointmentId);
      await this.whatsappNotifications.scheduleAppointmentReminder(replacementAppointmentId);
    } catch (error) {
      logger.warn({ error, originalAppointmentId, replacementAppointmentId }, 'whatsapp scheduling failed after appointment reschedule');
    }
  }

  private async getBookableAppointment(organizationId: string, appointmentId: string): Promise<AppointmentDto> {
    const appointment = await this.getAppointment(organizationId, appointmentId);
    if (!ACTIVE_BOOKING_STATUSES.includes(appointment.status)) {
      throw new AppError('INVALID_APPOINTMENT_STATE', 409, `Appointment is not active (current status: ${appointment.status})`);
    }

    return appointment;
  }

  private async validateCreateInput(organizationId: string, input: CreateAppointmentInput): Promise<{
    professionalId: string;
    specialtyId?: string | undefined;
    patientProfileId?: string | undefined;
    patientName: string;
    patientEmail?: string | undefined;
    patientPhone?: string | undefined;
    startAt: Date;
    endAt: Date;
    durationMultiplier: AppointmentDurationMultiplier;
    notes?: string | undefined;
    source: AppointmentSource;
    beneficiaryType: AppointmentBeneficiaryType;
    familyMemberId?: string | undefined;
    beneficiaryDisplayName: string;
    beneficiaryRelationship?: string | undefined;
  }> {
    if (!isValidObjectId(input.professionalId)) {
      throw new AppError('INVALID_PROFESSIONAL_ID', 400, 'professionalId is invalid');
    }

    const professional = await this.professionals.findByIdInOrganization(organizationId, input.professionalId);
    if (!professional) {
      throw new AppError('PROFESSIONAL_NOT_FOUND', 404, 'Professional not found');
    }

    const patientName = normalizeOptionalString(input.patientName);
    if (!patientName) {
      throw new AppError('INVALID_PATIENT_NAME', 400, 'patientName is required');
    }

    const startAt = parseIsoDate(input.startAt, 'startAt');
    assertStartsInFuture(startAt);

    const durationMultiplier = input.durationMultiplier ?? 1;
    if (durationMultiplier !== 1 && durationMultiplier !== 2) {
      throw new AppError('INVALID_DURATION_MULTIPLIER', 400, 'durationMultiplier must be 1 or 2');
    }

    const endAt = input.endAt
      ? parseIsoDate(input.endAt, 'endAt')
      : await this.inferEndAt(organizationId, input.professionalId, startAt, durationMultiplier);

    if (startAt >= endAt) {
      throw new AppError('INVALID_DATE_RANGE', 400, 'startAt must be before endAt');
    }

    const specialtyId = normalizeOptionalString(input.specialtyId);

    if (specialtyId) {
      if (!isValidObjectId(specialtyId)) {
        throw new AppError('INVALID_SPECIALTY_ID', 400, 'specialtyId is invalid');
      }

      const specialty = await this.specialties.findByIdInOrganization(organizationId, specialtyId);
      if (!specialty) {
        throw new AppError('SPECIALTY_NOT_FOUND', 404, 'Specialty not found');
      }

      const professionalSpecialties = await this.professionalSpecialties.findByProfessionalId(organizationId, input.professionalId);
      const hasSpecialty = professionalSpecialties.some((item) => item.specialtyId.toString() === specialtyId);

      if (!hasSpecialty) {
        throw new AppError('INVALID_SPECIALTY_ASSOCIATION', 400, 'El profesional seleccionado no atiende la especialidad elegida.');
      }
    }

    const patientProfileId = normalizeOptionalString(input.patientProfileId);
    if (patientProfileId && !isValidObjectId(patientProfileId)) {
      throw new AppError('INVALID_PATIENT_PROFILE_ID', 400, 'patientProfileId is invalid');
    }

    const patientEmail = normalizeOptionalEmail(input.patientEmail);
    const patientPhone = normalizeOptionalPhone(input.patientPhone);
    const notes = normalizeOptionalString(input.notes);
    const beneficiaryType = input.beneficiaryType ?? 'self';
    const familyMemberId = normalizeOptionalString(input.familyMemberId);
    const beneficiaryDisplayName = normalizeOptionalString(input.beneficiaryDisplayName) ?? patientName;
    const beneficiaryRelationship = normalizeOptionalString(input.beneficiaryRelationship);

    if (beneficiaryType !== 'self' && beneficiaryType !== 'family_member') {
      throw new AppError('INVALID_BENEFICIARY_TYPE', 400, 'beneficiaryType is invalid');
    }

    if (beneficiaryType === 'family_member') {
      if (!familyMemberId || !isValidObjectId(familyMemberId)) {
        throw new AppError('INVALID_FAMILY_MEMBER_ID', 400, 'familyMemberId is invalid');
      }
    }

    return {
      professionalId: input.professionalId,
      ...(specialtyId ? { specialtyId } : {}),
      ...(patientProfileId ? { patientProfileId } : {}),
      patientName,
      ...(patientEmail ? { patientEmail } : {}),
      ...(patientPhone ? { patientPhone } : {}),
      startAt,
      endAt,
      durationMultiplier,
      ...(notes ? { notes } : {}),
      source: input.source,
      beneficiaryType,
      ...(familyMemberId ? { familyMemberId } : {}),
      beneficiaryDisplayName,
      ...(beneficiaryRelationship ? { beneficiaryRelationship } : {})
    };
  }

  private async inferEndAt(
    organizationId: string,
    professionalId: string,
    startAt: Date,
    durationMultiplier: AppointmentDurationMultiplier
  ): Promise<Date> {
    const { endAt } = await this.resolveAvailabilityRange(organizationId, professionalId, startAt, durationMultiplier);
    return endAt;
  }

  private async assertSlotAvailable(
    organizationId: string,
    professionalId: string,
    startAt: Date,
    endAt: Date,
    durationMultiplier: AppointmentDurationMultiplier,
    ignoreAppointmentId?: string
  ): Promise<void> {
    const resolved = await this.resolveAvailabilityRange(organizationId, professionalId, startAt, durationMultiplier);

    if (resolved.endAt.getTime() !== endAt.getTime()) {
      const message = durationMultiplier === 2
        ? 'Este horario no permite turno doble porque no hay disponibilidad suficiente.'
        : 'Requested slot is not available';
      throw new AppError('SLOT_NOT_AVAILABLE', 409, message);
    }

    const overlaps = await this.appointments.findBookedOverlappingRange(organizationId, professionalId, startAt, endAt, ignoreAppointmentId);
    if (overlaps.length > 0) {
      throw new AppError('APPOINTMENT_OVERLAP', 409, 'Requested slot overlaps with another active appointment');
    }
  }

  private async resolveAvailabilityRange(
    organizationId: string,
    professionalId: string,
    startAt: Date,
    durationMultiplier: AppointmentDurationMultiplier
  ): Promise<{ endAt: Date }> {
    const date = extractDate(startAt);
    const availability = await this.availabilityService.getCalculatedAvailability(organizationId, professionalId, {
      startDate: date,
      endDate: date
    });

    const slots = availability.days.flatMap((day) => day.slots);
    const firstSlot = slots.find((slot) => parseIsoDate(slot.startsAtIso, 'slot.startsAtIso').getTime() === startAt.getTime());

    if (!firstSlot) {
      throw new AppError('SLOT_NOT_AVAILABLE', 409, 'Requested slot is not available');
    }

    if (firstSlot.available === false && firstSlot.blockedReason === 'progressive_release') {
      throw new AppError(
        'SLOT_BLOCKED_BY_PROGRESSIVE_RELEASE',
        409,
        'Este horario todavía no está habilitado. Deben completarse los turnos anteriores del día.'
      );
    }

    if (firstSlot.available === false) {
      throw new AppError('SLOT_NOT_AVAILABLE', 409, 'Requested slot is not available');
    }

    if (durationMultiplier === 1) {
      return { endAt: parseIsoDate(firstSlot.endsAtIso, 'endAt') };
    }

    const firstSlotEndAt = parseIsoDate(firstSlot.endsAtIso, 'slot.endsAtIso');
    const secondSlot = slots.find((slot) => parseIsoDate(slot.startsAtIso, 'slot.startsAtIso').getTime() === firstSlotEndAt.getTime());
    if (!secondSlot || secondSlot.available === false) {
      throw new AppError('SLOT_NOT_AVAILABLE', 409, 'Este horario no permite turno doble porque no hay disponibilidad suficiente.');
    }

    return { endAt: parseIsoDate(secondSlot.endsAtIso, 'endAt') };
  }


  private assertStatusTransitionAllowed(currentStatus: AppointmentStatus, nextStatus: AppointmentStatus, actorRole: 'owner' | 'admin' | 'staff' | 'patient'): void {
    if (currentStatus === nextStatus) {
      throw new AppError('INVALID_APPOINTMENT_STATE', 409, `Appointment already has status ${nextStatus}`);
    }

    if (actorRole === 'patient') {
      if (currentStatus === 'booked' && nextStatus === 'confirmed_by_patient') return;
      if ((currentStatus === 'booked' || currentStatus === 'confirmed_by_patient') && nextStatus === 'canceled_by_patient') return;
      throw new AppError('APPOINTMENT_STATUS_FORBIDDEN', 403, 'Patients cannot apply this appointment status');
    }

    const allowed = CENTER_STATUS_TRANSITIONS[currentStatus] ?? [];
    if (allowed.includes(nextStatus)) return;

    if ((actorRole === 'owner' || actorRole === 'admin') && TERMINAL_STATUSES.includes(currentStatus) && PENDING_OPERATIONAL_STATUSES.includes(nextStatus)) {
      return;
    }

    throw new AppError('INVALID_APPOINTMENT_STATUS_TRANSITION', 409, `Cannot change appointment from ${currentStatus} to ${nextStatus}`);
  }

  private buildStatusHistoryEntry(status: AppointmentStatus, actorUserId: string, actorRole: string, note?: string): Record<string, unknown> {
    return {
      status,
      changedAt: new Date(),
      changedByUserId: actorUserId,
      changedByRole: actorRole,
      note: normalizeOptionalString(note) ?? null
    };
  }

  private toDto(document: AppointmentDocument): AppointmentDto {
    return {
      id: document._id.toString(),
      organizationId: document.organizationId.toString(),
      professionalId: document.professionalId.toString(),
      specialtyId: document.specialtyId ? document.specialtyId.toString() : null,
      patientProfileId: document.patientProfileId ? document.patientProfileId.toString() : null,
      patientName: document.patientName,
      patientEmail: document.patientEmail ?? null,
      patientPhone: document.patientPhone ?? null,
      startAt: document.startAt.toISOString(),
      endAt: document.endAt.toISOString(),
      durationMultiplier: document.durationMultiplier === 2 ? 2 : 1,
      status: document.status,
      source: document.source,
      notes: document.notes ?? null,
      createdByUserId: document.createdByUserId ? document.createdByUserId.toString() : null,
      bookedByUserId: document.bookedByUserId ? document.bookedByUserId.toString() : (document.createdByUserId ? document.createdByUserId.toString() : null),
      beneficiaryType: document.beneficiaryType ?? 'self',
      familyMemberId: document.familyMemberId ? document.familyMemberId.toString() : null,
      beneficiaryDisplayName: document.beneficiaryDisplayName ?? document.patientName,
      beneficiaryRelationship: document.beneficiaryRelationship ?? null,
      paymentCoverageType: document.paymentCoverageType ?? 'private',
      healthInsuranceId: document.healthInsuranceId ? document.healthInsuranceId.toString() : null,
      healthInsuranceName: document.healthInsuranceName ?? 'Particular',
      insuranceMemberNumber: document.insuranceMemberNumber ?? null,
      insurancePlan: document.insurancePlan ?? null,
      canceledByUserId: document.canceledByUserId ? document.canceledByUserId.toString() : null,
      canceledAt: document.canceledAt ? document.canceledAt.toISOString() : null,
      cancelReason: document.cancelReason ?? null,
      statusUpdatedAt: document.statusUpdatedAt ? document.statusUpdatedAt.toISOString() : null,
      statusUpdatedByUserId: document.statusUpdatedByUserId ? document.statusUpdatedByUserId.toString() : null,
      statusUpdatedByRole: document.statusUpdatedByRole ?? null,
      arrivedAt: document.arrivedAt ? document.arrivedAt.toISOString() : null,
      statusHistory: (document.statusHistory ?? []).map((entry) => ({
        status: entry.status,
        changedAt: entry.changedAt.toISOString(),
        changedByUserId: entry.changedByUserId.toString(),
        changedByRole: entry.changedByRole,
        note: entry.note ?? null
      })),
      rescheduledFromAppointmentId: document.rescheduledFromAppointmentId ? document.rescheduledFromAppointmentId.toString() : null,
      rescheduledToAppointmentId: document.rescheduledToAppointmentId ? document.rescheduledToAppointmentId.toString() : null,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString()
    };
  }
}
