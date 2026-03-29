import mongoose from 'mongoose';
import { AppError } from '../../../core/errors.js';
import { PatientProfileRepository } from '../../patient/repositories/patient-profile.repository.js';
import { PatientOrganizationLinkRepository } from '../../patient/repositories/patient-organization-link.repository.js';
import { ProfessionalRepository } from '../../professionals/repositories/professional.repository.js';
import { SpecialtyRepository } from '../../professionals/repositories/specialty.repository.js';
import { NotificationService } from '../../notifications/services/notification.service.js';
import { WaitlistRepository } from '../repositories/waitlist.repository.js';

const HH_MM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const isDateOnly = (v: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(v);

export class WaitlistService {
  constructor(
    private readonly waitlist = new WaitlistRepository(),
    private readonly patientProfiles = new PatientProfileRepository(),
    private readonly links = new PatientOrganizationLinkRepository(),
    private readonly professionals = new ProfessionalRepository(),
    private readonly specialties = new SpecialtyRepository(),
    private readonly notifications = new NotificationService()
  ) {}

  async listForUser(userId: string) {
    const profile = await this.ensureProfile(userId);
    const rows = await this.waitlist.listByPatient(profile._id.toString());
    return rows.map((row) => this.toDto(row));
  }

  async createForUser(userId: string, input: {
    organizationId: string;
    specialtyId?: string | undefined;
    professionalId?: string | undefined;
    startDate: string;
    endDate: string;
    timeWindowStart?: string | undefined;
    timeWindowEnd?: string | undefined;
  }) {
    if (!mongoose.isValidObjectId(input.organizationId)) {
      throw new AppError('INVALID_ORGANIZATION_ID', 400, 'organizationId is invalid');
    }

    if (!isDateOnly(input.startDate) || !isDateOnly(input.endDate) || input.startDate > input.endDate) {
      throw new AppError('INVALID_DATE_RANGE', 400, 'startDate/endDate must be YYYY-MM-DD and startDate <= endDate');
    }

    const days = Math.floor((new Date(`${input.endDate}T00:00:00Z`).getTime() - new Date(`${input.startDate}T00:00:00Z`).getTime()) / 86400000) + 1;
    if (days > 120) {
      throw new AppError('INVALID_DATE_RANGE', 400, 'Date range too large (max 120 days)');
    }

    if ((input.timeWindowStart && !HH_MM_REGEX.test(input.timeWindowStart)) || (input.timeWindowEnd && !HH_MM_REGEX.test(input.timeWindowEnd))) {
      throw new AppError('INVALID_TIME_WINDOW', 400, 'timeWindowStart/timeWindowEnd must be HH:mm');
    }

    if (input.timeWindowStart && input.timeWindowEnd && input.timeWindowStart >= input.timeWindowEnd) {
      throw new AppError('INVALID_TIME_WINDOW', 400, 'timeWindowStart must be before timeWindowEnd');
    }

    const profile = await this.ensureProfile(userId);
    const link = await this.links.findByPatientAndOrganization(profile._id.toString(), input.organizationId);
    if (!link || link.status !== 'active') {
      throw new AppError('FORBIDDEN', 403, 'No tenés vínculo activo con este centro');
    }

    if (input.specialtyId) {
      if (!mongoose.isValidObjectId(input.specialtyId)) throw new AppError('INVALID_SPECIALTY_ID', 400, 'specialtyId is invalid');
      const specialty = await this.specialties.findByIdInOrganization(input.organizationId, input.specialtyId);
      if (!specialty || specialty.status !== 'active') throw new AppError('SPECIALTY_NOT_FOUND', 404, 'Specialty not found');
    }

    if (input.professionalId) {
      if (!mongoose.isValidObjectId(input.professionalId)) throw new AppError('INVALID_PROFESSIONAL_ID', 400, 'professionalId is invalid');
      const professional = await this.professionals.findByIdInOrganization(input.organizationId, input.professionalId);
      if (!professional || professional.status !== 'active') throw new AppError('PROFESSIONAL_NOT_FOUND', 404, 'Professional not found');
    }

    const row = await this.waitlist.create({
      organizationId: input.organizationId,
      patientProfileId: profile._id.toString(),
      ...(input.specialtyId ? { specialtyId: input.specialtyId } : {}),
      ...(input.professionalId ? { professionalId: input.professionalId } : {}),
      startDate: input.startDate,
      endDate: input.endDate,
      ...(input.timeWindowStart ? { timeWindowStart: input.timeWindowStart } : {}),
      ...(input.timeWindowEnd ? { timeWindowEnd: input.timeWindowEnd } : {}),
      status: 'active'
    });

    return this.toDto(row);
  }

  async cancelForUser(userId: string, waitlistId: string) {
    if (!mongoose.isValidObjectId(waitlistId)) throw new AppError('INVALID_WAITLIST_ID', 400, 'waitlistId is invalid');
    const profile = await this.ensureProfile(userId);
    const row = await this.waitlist.findByIdForPatient(waitlistId, profile._id.toString());
    if (!row) throw new AppError('WAITLIST_NOT_FOUND', 404, 'Waitlist request not found');

    const updated = await this.waitlist.updateById(waitlistId, { status: 'canceled' });
    if (!updated) throw new AppError('WAITLIST_NOT_FOUND', 404, 'Waitlist request not found');
    return this.toDto(updated);
  }

  async handleSlotFreed(input: { organizationId: string; professionalId: string; specialtyId?: string | null; startAt: Date; endAt: Date }) {
    const date = input.startAt.toISOString().slice(0, 10);
    const slotStart = input.startAt.toISOString().slice(11, 16);
    const slotEnd = input.endAt.toISOString().slice(11, 16);

    const candidates = await this.waitlist.listPotentialMatches({ organizationId: input.organizationId, date });

    for (const item of candidates) {
      if (item.professionalId && item.professionalId.toString() !== input.professionalId) continue;
      if (item.specialtyId && (input.specialtyId ?? null) !== item.specialtyId.toString()) continue;
      if (item.timeWindowStart && slotStart < item.timeWindowStart) continue;
      if (item.timeWindowEnd && slotEnd > item.timeWindowEnd) continue;

      const patientProfile = await this.patientProfiles.findById(item.patientProfileId.toString());
      if (!patientProfile) continue;

      await this.notifications.create({
        userId: patientProfile.userId.toString(),
        organizationId: item.organizationId.toString(),
        patientProfileId: item.patientProfileId.toString(),
        type: 'availability_alert',
        title: 'Se liberó un turno',
        message: `Hay disponibilidad el ${date} de ${slotStart} a ${slotEnd}.`,
        relatedEntityType: 'waitlist_request',
        relatedEntityId: `${item._id.toString()}:${input.startAt.toISOString()}`,
        channel: 'in_app',
        status: 'delivered'
      });

      await this.waitlist.updateById(item._id.toString(), { lastNotifiedAt: new Date(), matchedAt: new Date(), status: 'matched' });
    }
  }

  private async ensureProfile(userId: string) {
    const profile = await this.patientProfiles.findByUserId(userId);
    if (!profile) throw new AppError('PATIENT_PROFILE_NOT_FOUND', 404, 'Patient profile not found');
    return profile;
  }

  private toDto(row: {
    _id: { toString(): string };
    organizationId: { toString(): string };
    patientProfileId: { toString(): string };
    specialtyId?: { toString(): string } | null;
    professionalId?: { toString(): string } | null;
    startDate: string;
    endDate: string;
    timeWindowStart?: string | null;
    timeWindowEnd?: string | null;
    status: 'active' | 'matched' | 'inactive' | 'expired' | 'canceled';
    matchedAt?: Date | null;
    lastNotifiedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row._id.toString(),
      organizationId: row.organizationId.toString(),
      patientProfileId: row.patientProfileId.toString(),
      specialtyId: row.specialtyId ? row.specialtyId.toString() : null,
      professionalId: row.professionalId ? row.professionalId.toString() : null,
      startDate: row.startDate,
      endDate: row.endDate,
      timeWindowStart: row.timeWindowStart ?? null,
      timeWindowEnd: row.timeWindowEnd ?? null,
      status: row.status,
      matchedAt: row.matchedAt ? row.matchedAt.toISOString() : null,
      lastNotifiedAt: row.lastNotifiedAt ? row.lastNotifiedAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    };
  }
}
