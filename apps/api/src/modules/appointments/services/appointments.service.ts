import mongoose from 'mongoose';
import type { AppointmentBeneficiaryType, AppointmentDto, AppointmentStatus, AppointmentSource } from '@starter/shared-types';
import { AppError } from '../../../core/errors.js';
import { AvailabilityService } from '../../availability/services/availability.service.js';
import { ProfessionalRepository } from '../../professionals/repositories/professional.repository.js';
import { SpecialtyRepository } from '../../professionals/repositories/specialty.repository.js';
import { ProfessionalSpecialtyRepository } from '../../professionals/repositories/professional-specialty.repository.js';
import { AppointmentRepository } from '../repositories/appointment.repository.js';
import { AuditLogRepository } from '../repositories/audit-log.repository.js';
import { NotificationService } from '../../notifications/services/notification.service.js';
import { WaitlistService } from '../../waitlist/services/waitlist.service.js';
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
  notes?: string | undefined;
  source: AppointmentSource;
  beneficiaryType?: AppointmentBeneficiaryType | undefined;
  familyMemberId?: string | undefined;
  beneficiaryDisplayName?: string | undefined;
  beneficiaryRelationship?: string | undefined;
}

interface CancelAppointmentInput {
  reason?: string | undefined;
}

interface RescheduleAppointmentInput {
  newProfessionalId?: string | undefined;
  newSpecialtyId?: string | undefined;
  newStartAt: string;
  newEndAt?: string | undefined;
  reason?: string | undefined;
}

const ACTIVE_BOOKING_STATUSES: AppointmentStatus[] = ['booked'];

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
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError('INVALID_DATE', 400, `${fieldName} must be a valid ISO datetime`);
  }

  return parsed;
};

const extractDate = (date: Date): string => date.toISOString().slice(0, 10);
const extractTime = (date: Date): string => date.toISOString().slice(11, 16);

export class AppointmentsService {
  constructor(
    private readonly appointments = new AppointmentRepository(),
    private readonly professionals = new ProfessionalRepository(),
    private readonly specialties = new SpecialtyRepository(),
    private readonly professionalSpecialties = new ProfessionalSpecialtyRepository(),
    private readonly availabilityService = new AvailabilityService(),
    private readonly auditLogs = new AuditLogRepository(),
    private readonly notifications = new NotificationService(),
    private readonly waitlist = new WaitlistService()
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
      normalized.endAt
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
          source: created.source
        }
      });

      const createdDto = this.toDto(created);
      await this.notifications.notifyPatientFromAppointment(
        createdDto,
        'appointment_booked',
        'Turno reservado',
        `Tu turno para ${new Date(createdDto.startAt).toLocaleString('es-AR', { hour12: false })} fue reservado.`
      );

      return createdDto;
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
    input: CancelAppointmentInput
  ): Promise<AppointmentDto> {
    const appointment = await this.getBookableAppointment(organizationId, appointmentId);

    const updated = await this.appointments.updateByIdInOrganization(organizationId, appointmentId, {
      status: 'canceled_by_staff',
      canceledByUserId: actorUserId,
      canceledAt: new Date(),
      cancelReason: normalizeOptionalString(input.reason) ?? null
    });

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
    await this.waitlist.handleSlotFreed({
      organizationId: updatedDto.organizationId,
      professionalId: updatedDto.professionalId,
      specialtyId: updatedDto.specialtyId,
      startAt: new Date(appointment.startAt),
      endAt: new Date(appointment.endAt)
    });

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

    if (!ACTIVE_BOOKING_STATUSES.includes(appointment.status)) {
      throw new AppError('INVALID_APPOINTMENT_STATE', 409, `Appointment is not active (current status: ${appointment.status})`);
    }

    const updated = await this.appointments.updateByIdInOrganization(appointment.organizationId, appointment.id, {
      status: 'canceled_by_patient',
      canceledByUserId: actorUserId,
      canceledAt: new Date(),
      cancelReason: normalizeOptionalString(reason) ?? null
    });

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
      notes: original.notes ?? undefined,
      source,
      beneficiaryType: original.beneficiaryType,
      familyMemberId: original.familyMemberId ?? undefined,
      beneficiaryDisplayName: original.beneficiaryDisplayName ?? original.patientName,
      beneficiaryRelationship: original.beneficiaryRelationship ?? undefined
    });

    await this.assertSlotAvailable(organizationId, normalized.professionalId, normalized.startAt, normalized.endAt);

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
      rescheduledToAppointmentId: replacement._id
    });

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
      `Tu turno fue reprogramado para ${new Date(replacementDto.startAt).toLocaleString('es-AR', { hour12: false })}.`
    );
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
    const from = new Date(`${startDate}T00:00:00.000Z`);
    const to = new Date(`${endDate}T23:59:59.999Z`);

    const rows = await this.appointments.findBookedByProfessionalAndRange(organizationId, professionalId, from, to);

    return rows.map((item) => ({
      startsAtIso: item.startAt.toISOString(),
      endsAtIso: item.endAt.toISOString()
    }));
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
    const endAt = input.endAt ? parseIsoDate(input.endAt, 'endAt') : await this.inferEndAt(organizationId, input.professionalId, startAt);

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
        throw new AppError('INVALID_SPECIALTY_ASSOCIATION', 400, 'Specialty is not associated to the professional');
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
      ...(notes ? { notes } : {}),
      source: input.source,
      beneficiaryType,
      ...(familyMemberId ? { familyMemberId } : {}),
      beneficiaryDisplayName,
      ...(beneficiaryRelationship ? { beneficiaryRelationship } : {})
    };
  }

  private async inferEndAt(organizationId: string, professionalId: string, startAt: Date): Promise<Date> {
    const date = extractDate(startAt);
    const availability = await this.availabilityService.getCalculatedAvailability(organizationId, professionalId, {
      startDate: date,
      endDate: date
    });

    const isoStart = `${date}T${extractTime(startAt)}:00`;
    const matched = availability.days.flatMap((day) => day.slots).find((slot) => slot.startsAtIso === isoStart);

    if (!matched) {
      throw new AppError('SLOT_NOT_AVAILABLE', 409, 'Requested slot is not available');
    }

    return parseIsoDate(matched.endsAtIso, 'endAt');
  }

  private async assertSlotAvailable(
    organizationId: string,
    professionalId: string,
    startAt: Date,
    endAt: Date,
    ignoreAppointmentId?: string
  ): Promise<void> {
    const date = extractDate(startAt);
    const availability = await this.availabilityService.getCalculatedAvailability(organizationId, professionalId, {
      startDate: date,
      endDate: date
    });

    const isoStart = `${date}T${extractTime(startAt)}:00`;
    const isoEnd = `${date}T${extractTime(endAt)}:00`;

    const slotFound = availability.days
      .flatMap((day) => day.slots)
      .some((slot) => slot.startsAtIso === isoStart && slot.endsAtIso === isoEnd);

    if (!slotFound) {
      throw new AppError('SLOT_NOT_AVAILABLE', 409, 'Requested slot is not available');
    }

    const overlaps = await this.appointments.findBookedOverlappingRange(organizationId, professionalId, startAt, endAt, ignoreAppointmentId);
    if (overlaps.length > 0) {
      throw new AppError('APPOINTMENT_OVERLAP', 409, 'Requested slot overlaps with another active appointment');
    }
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
      status: document.status,
      source: document.source,
      notes: document.notes ?? null,
      createdByUserId: document.createdByUserId.toString(),
      bookedByUserId: (document.bookedByUserId ?? document.createdByUserId).toString(),
      beneficiaryType: document.beneficiaryType ?? 'self',
      familyMemberId: document.familyMemberId ? document.familyMemberId.toString() : null,
      beneficiaryDisplayName: document.beneficiaryDisplayName ?? document.patientName,
      beneficiaryRelationship: document.beneficiaryRelationship ?? null,
      canceledByUserId: document.canceledByUserId ? document.canceledByUserId.toString() : null,
      canceledAt: document.canceledAt ? document.canceledAt.toISOString() : null,
      cancelReason: document.cancelReason ?? null,
      rescheduledFromAppointmentId: document.rescheduledFromAppointmentId ? document.rescheduledFromAppointmentId.toString() : null,
      rescheduledToAppointmentId: document.rescheduledToAppointmentId ? document.rescheduledToAppointmentId.toString() : null,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString()
    };
  }
}
