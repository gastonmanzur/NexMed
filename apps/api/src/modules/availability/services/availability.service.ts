import type {
  AvailabilityExceptionDto,
  AvailabilityExceptionStatus,
  AvailabilityExceptionType,
  AvailabilityRuleDto,
  AvailabilityRuleStatus,
  CalculatedAvailabilityDto,
  AvailabilitySlotDto
} from '@starter/shared-types';
import { AppError } from '../../../core/errors.js';
import { logger } from '../../../config/logger.js';
import {
  ARGENTINA_TIME_ZONE,
  argentinaLocalDateTimeToUtcDate,
  getArgentinaDayRange,
  parseAppointmentInstant
} from '../../../core/argentina-date-time.js';
import { ProfessionalRepository } from '../../professionals/repositories/professional.repository.js';
import { SpecialtyRepository } from '../../professionals/repositories/specialty.repository.js';
import { ProfessionalSpecialtyRepository } from '../../professionals/repositories/professional-specialty.repository.js';
import { OrganizationSettingsRepository } from '../../organizations/repositories/organization-settings.repository.js';
import { AvailabilityRuleRepository } from '../repositories/availability-rule.repository.js';
import { AvailabilityExceptionRepository } from '../repositories/availability-exception.repository.js';
import type { AvailabilityRuleDocument } from '../models/availability-rule.model.js';
import type { AvailabilityExceptionDocument } from '../models/availability-exception.model.js';
import { AppointmentRepository } from '../../appointments/repositories/appointment.repository.js';

interface CreateAvailabilityRuleInput {
  weekday: number;
  startTime: string;
  endTime: string;
  appointmentDurationMinutes: number;
  bufferMinutes?: number | undefined;
}

interface UpdateAvailabilityRuleInput {
  weekday?: number | undefined;
  startTime?: string | undefined;
  endTime?: string | undefined;
  appointmentDurationMinutes?: number | undefined;
  bufferMinutes?: number | undefined;
  status?: AvailabilityRuleStatus | undefined;
}

interface CreateAvailabilityExceptionInput {
  date: string;
  type: AvailabilityExceptionType;
  startTime?: string | undefined;
  endTime?: string | undefined;
  reason?: string | undefined;
}

interface UpdateAvailabilityExceptionInput {
  date?: string | undefined;
  type?: AvailabilityExceptionType | undefined;
  startTime?: string | undefined;
  endTime?: string | undefined;
  reason?: string | undefined;
  status?: AvailabilityExceptionStatus | undefined;
}

type AvailabilitySlotCandidate = { date: string; startTime: string; endTime: string; startsAtIso: string; endsAtIso: string; occupied: boolean };

const MAX_AVAILABILITY_RANGE_DAYS = 62;

const HH_MM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const parseTimeToMinutes = (value: string): number => {
  const match = HH_MM_REGEX.exec(value);
  if (!match) {
    throw new AppError('INVALID_TIME_FORMAT', 400, `Invalid time format: ${value}. Expected HH:mm`);
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return (hours * 60) + minutes;
};

const formatMinutesToTime = (minutes: number): string => {
  const safe = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

const minutesOverlap = (aStart: number, aEnd: number, bStart: number, bEnd: number): boolean => aStart < bEnd && bStart < aEnd;

const isValidDateYyyyMmDd = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

const dateAtUtcNoon = (date: string): Date => new Date(`${date}T12:00:00Z`);

const getWeekdayInTimezone = (date: string, timezone: string): number => {
  const short = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' }).format(dateAtUtcNoon(date));
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6
  };
  const value = map[short];
  if (value === undefined) {
    throw new AppError('INVALID_TIMEZONE', 400, `Unable to resolve weekday with timezone ${timezone}`);
  }

  return value;
};

const iterateDateRange = (startDate: string, endDate: string): string[] => {
  const days: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00Z`);
  const last = new Date(`${endDate}T00:00:00Z`);

  while (cursor <= last) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
};

const compareDateStrings = (left: string, right: string): number => {
  if (left === right) return 0;
  return left < right ? -1 : 1;
};

const parseSlotInstant = (value: string): Date => parseAppointmentInstant(value);

export class AvailabilityService {
  constructor(
    private readonly rules = new AvailabilityRuleRepository(),
    private readonly exceptions = new AvailabilityExceptionRepository(),
    private readonly professionals = new ProfessionalRepository(),
    private readonly organizationSettings = new OrganizationSettingsRepository(),
    private readonly appointments = new AppointmentRepository(),
    private readonly specialties = new SpecialtyRepository(),
    private readonly professionalSpecialties = new ProfessionalSpecialtyRepository()
  ) {}

  async listRules(organizationId: string, professionalId: string): Promise<AvailabilityRuleDto[]> {
    await this.assertProfessionalBelongsToOrganization(organizationId, professionalId);
    const rules = await this.rules.findByProfessional(organizationId, professionalId);
    return rules.map((rule) => this.toRuleDto(rule));
  }

  async getRule(organizationId: string, professionalId: string, ruleId: string): Promise<AvailabilityRuleDto> {
    await this.assertProfessionalBelongsToOrganization(organizationId, professionalId);
    const rule = await this.rules.findByIdInProfessional(organizationId, professionalId, ruleId);
    if (!rule) {
      throw new AppError('AVAILABILITY_RULE_NOT_FOUND', 404, 'Availability rule not found');
    }

    return this.toRuleDto(rule);
  }

  async createRule(organizationId: string, professionalId: string, input: CreateAvailabilityRuleInput): Promise<AvailabilityRuleDto> {
    await this.assertProfessionalBelongsToOrganization(organizationId, professionalId);
    const normalized = this.normalizeRuleInput(input);

    await this.assertNoActiveOverlap(organizationId, professionalId, normalized.weekday, normalized.startTime, normalized.endTime);

    const created = await this.rules.create({
      organizationId,
      professionalId,
      ...normalized,
      status: 'active'
    });

    return this.toRuleDto(created);
  }

  async updateRule(
    organizationId: string,
    professionalId: string,
    ruleId: string,
    input: UpdateAvailabilityRuleInput
  ): Promise<AvailabilityRuleDto> {
    await this.assertProfessionalBelongsToOrganization(organizationId, professionalId);
    const existing = await this.rules.findByIdInProfessional(organizationId, professionalId, ruleId);
    if (!existing) {
      throw new AppError('AVAILABILITY_RULE_NOT_FOUND', 404, 'Availability rule not found');
    }

    const normalized = this.normalizeRulePatchInput(existing, input);

    if ((normalized.status ?? existing.status) === 'active') {
      await this.assertNoActiveOverlap(organizationId, professionalId, normalized.weekday, normalized.startTime, normalized.endTime, ruleId);
    }

    const updated = await this.rules.updateByIdInProfessional(organizationId, professionalId, ruleId, normalized);
    if (!updated) {
      throw new AppError('AVAILABILITY_RULE_NOT_FOUND', 404, 'Availability rule not found');
    }

    return this.toRuleDto(updated);
  }

  async updateRuleStatus(
    organizationId: string,
    professionalId: string,
    ruleId: string,
    status: AvailabilityRuleStatus
  ): Promise<AvailabilityRuleDto> {
    return this.updateRule(organizationId, professionalId, ruleId, { status });
  }

  async listExceptions(organizationId: string, professionalId: string): Promise<AvailabilityExceptionDto[]> {
    await this.assertProfessionalBelongsToOrganization(organizationId, professionalId);
    const exceptions = await this.exceptions.findByProfessional(organizationId, professionalId);
    return exceptions.map((exception) => this.toExceptionDto(exception));
  }

  async createException(
    organizationId: string,
    professionalId: string,
    input: CreateAvailabilityExceptionInput
  ): Promise<AvailabilityExceptionDto> {
    await this.assertProfessionalBelongsToOrganization(organizationId, professionalId);
    const normalized = this.normalizeExceptionInput(input);

    const created = await this.exceptions.create({
      organizationId,
      professionalId,
      ...normalized,
      status: 'active'
    });

    return this.toExceptionDto(created);
  }

  async updateException(
    organizationId: string,
    professionalId: string,
    exceptionId: string,
    input: UpdateAvailabilityExceptionInput
  ): Promise<AvailabilityExceptionDto> {
    await this.assertProfessionalBelongsToOrganization(organizationId, professionalId);
    const existing = await this.exceptions.findByIdInProfessional(organizationId, professionalId, exceptionId);
    if (!existing) {
      throw new AppError('AVAILABILITY_EXCEPTION_NOT_FOUND', 404, 'Availability exception not found');
    }

    const normalized = this.normalizeExceptionPatchInput(existing, input);

    const updated = await this.exceptions.updateByIdInProfessional(organizationId, professionalId, exceptionId, normalized);
    if (!updated) {
      throw new AppError('AVAILABILITY_EXCEPTION_NOT_FOUND', 404, 'Availability exception not found');
    }

    return this.toExceptionDto(updated);
  }

  async updateExceptionStatus(
    organizationId: string,
    professionalId: string,
    exceptionId: string,
    status: AvailabilityExceptionStatus
  ): Promise<AvailabilityExceptionDto> {
    return this.updateException(organizationId, professionalId, exceptionId, { status });
  }

  async getCalculatedAvailability(
    organizationId: string,
    professionalId: string,
    input: { startDate: string; endDate: string; specialtyId?: string | undefined }
  ): Promise<CalculatedAvailabilityDto> {
    const professional = await this.assertProfessionalBelongsToOrganization(organizationId, professionalId);
    await this.assertSpecialtyCanBeAttendedByProfessional(organizationId, professionalId, input.specialtyId);
    const validatedRange = this.validateDateRange(input.startDate, input.endDate);

    const timezone = await this.resolveOrganizationTimezone(organizationId);

    const activeRules = professional.status === 'active'
      ? await this.rules.findActiveByProfessional(organizationId, professionalId)
      : [];

    const activeExceptions = await this.exceptions.findActiveByProfessionalAndDateRange(
      organizationId,
      professionalId,
      validatedRange.startDate,
      validatedRange.endDate
    );

    const bookedAppointments = await this.appointments.findBookedByProfessionalAndRange(
      organizationId,
      professionalId,
      getArgentinaDayRange(validatedRange.startDate).from,
      getArgentinaDayRange(validatedRange.endDate).to
    );

    const now = new Date();

    const exceptionsByDate = new Map<string, AvailabilityExceptionDocument[]>();
    for (const exception of activeExceptions) {
      const current = exceptionsByDate.get(exception.date) ?? [];
      current.push(exception);
      exceptionsByDate.set(exception.date, current);
    }

    const days = iterateDateRange(validatedRange.startDate, validatedRange.endDate).map((date) => {
      const weekday = getWeekdayInTimezone(date, timezone);
      const rulesForDay = activeRules.filter((rule) => rule.weekday === weekday);
      const dayExceptions = exceptionsByDate.get(date) ?? [];

      const hasFullDayBlock = dayExceptions.some((exception) => exception.type === 'full_day_block');
      if (hasFullDayBlock || professional.status !== 'active') {
        return { date, slots: [] };
      }

      const slots = rulesForDay.flatMap((rule) => this.generateRuleSlotsForDate(date, rule));
      const candidateSlots = slots.filter((slot) => {
        const slotStart = parseTimeToMinutes(slot.startTime);
        const slotEnd = parseTimeToMinutes(slot.endTime);

        const blockedByException = dayExceptions.some((exception) => {
          if (exception.type !== 'partial_block' || !exception.startTime || !exception.endTime) {
            return false;
          }

          const blockStart = parseTimeToMinutes(exception.startTime);
          const blockEnd = parseTimeToMinutes(exception.endTime);
          return minutesOverlap(slotStart, slotEnd, blockStart, blockEnd);
        });

        if (blockedByException) {
          return false;
        }

        const slotStartAt = parseSlotInstant(slot.startsAtIso);
        if (slotStartAt.getTime() <= now.getTime()) {
          return false;
        }

        return true;
      });

      const candidateSlotsWithOccupation = candidateSlots.map((slot): AvailabilitySlotCandidate => {
        const slotStartAt = parseSlotInstant(slot.startsAtIso);
        const slotEndAt = parseSlotInstant(slot.endsAtIso);
        const occupied = bookedAppointments.some((appointment) =>
          minutesOverlap(
            slotStartAt.getTime(),
            slotEndAt.getTime(),
            appointment.startAt.getTime(),
            appointment.endAt.getTime()
          )
        );

        return { ...slot, occupied };
      });

      candidateSlotsWithOccupation.sort((a, b) => compareDateStrings(a.startsAtIso, b.startsAtIso));

      return {
        date,
        slots: this.applyAvailabilityReleaseForDay(organizationId, professionalId, date, professional, candidateSlotsWithOccupation)
      };
    });

    return {
      professionalId,
      organizationId,
      timezone,
      range: validatedRange,
      professionalStatus: professional.status,
      availabilityReleaseMode: professional.availabilityReleaseMode ?? 'free',
      availabilityReleaseLimit: professional.availabilityReleaseMode === 'progressive' ? professional.availabilityReleaseLimit ?? null : null,
      isBookableInCurrentStage: true,
      note: 'Disponibilidad operativa: se aplican reglas, excepciones y turnos booked.',
      days,
      consideredRules: activeRules.map((rule) => ({
        id: rule._id.toString(),
        weekday: rule.weekday,
        startTime: rule.startTime,
        endTime: rule.endTime,
        status: rule.status
      })),
      appliedExceptions: activeExceptions.map((exception) => ({
        id: exception._id.toString(),
        date: exception.date,
        type: exception.type,
        startTime: exception.startTime ?? null,
        endTime: exception.endTime ?? null,
        status: exception.status
      }))
    };
  }

  private async assertProfessionalBelongsToOrganization(organizationId: string, professionalId: string) {
    const professional = await this.professionals.findByIdInOrganization(organizationId, professionalId);
    if (!professional) {
      throw new AppError('PROFESSIONAL_NOT_FOUND', 404, 'Professional not found');
    }

    return professional;
  }


  private async assertSpecialtyCanBeAttendedByProfessional(
    organizationId: string,
    professionalId: string,
    specialtyId?: string
  ): Promise<void> {
    if (!specialtyId) {
      return;
    }

    const specialty = await this.specialties.findByIdInOrganization(organizationId, specialtyId);
    if (!specialty || specialty.status !== 'active') {
      throw new AppError('SPECIALTY_NOT_FOUND', 404, 'Specialty not found');
    }

    const isValidCombination = await this.professionalSpecialties.existsForProfessionalAndSpecialty(
      organizationId,
      professionalId,
      specialtyId
    );

    if (!isValidCombination) {
      throw new AppError(
        'INVALID_SPECIALTY_ASSOCIATION',
        400,
        'El profesional seleccionado no atiende la especialidad elegida.'
      );
    }
  }

  private async resolveOrganizationTimezone(organizationId: string): Promise<string> {
    const settings = await this.organizationSettings.findByOrganizationId(organizationId);
    if (!settings?.timezone) {
      return ARGENTINA_TIME_ZONE;
    }

    return settings.timezone;
  }

  private validateDateRange(startDate: string, endDate: string): { startDate: string; endDate: string } {
    if (!isValidDateYyyyMmDd(startDate) || !isValidDateYyyyMmDd(endDate)) {
      throw new AppError('INVALID_DATE_RANGE', 400, 'startDate and endDate must be valid YYYY-MM-DD values');
    }

    if (startDate > endDate) {
      throw new AppError('INVALID_DATE_RANGE', 400, 'startDate must be before or equal to endDate');
    }

    const diffMs = new Date(`${endDate}T00:00:00Z`).getTime() - new Date(`${startDate}T00:00:00Z`).getTime();
    const diffDays = Math.floor(diffMs / 86_400_000) + 1;

    if (diffDays > MAX_AVAILABILITY_RANGE_DAYS) {
      throw new AppError('DATE_RANGE_TOO_LARGE', 400, `Date range cannot exceed ${MAX_AVAILABILITY_RANGE_DAYS} days`);
    }

    return { startDate, endDate };
  }

  private normalizeRuleInput(input: CreateAvailabilityRuleInput) {
    if (!Number.isInteger(input.weekday) || input.weekday < 0 || input.weekday > 6) {
      throw new AppError('INVALID_RULE_WEEKDAY', 400, 'weekday must be an integer between 0 and 6');
    }

    const startMinutes = parseTimeToMinutes(input.startTime);
    const endMinutes = parseTimeToMinutes(input.endTime);

    if (startMinutes >= endMinutes) {
      throw new AppError('INVALID_RULE_RANGE', 400, 'startTime must be before endTime');
    }

    const duration = Math.floor(input.appointmentDurationMinutes);
    const buffer = Math.floor(input.bufferMinutes ?? 0);

    if (duration <= 0) {
      throw new AppError('INVALID_RULE_DURATION', 400, 'appointmentDurationMinutes must be greater than 0');
    }

    if (buffer < 0) {
      throw new AppError('INVALID_RULE_BUFFER', 400, 'bufferMinutes must be greater or equal to 0');
    }

    if (duration > (endMinutes - startMinutes)) {
      throw new AppError('INVALID_RULE_DURATION', 400, 'appointmentDurationMinutes does not fit in the defined time range');
    }

    return {
      weekday: input.weekday,
      startTime: formatMinutesToTime(startMinutes),
      endTime: formatMinutesToTime(endMinutes),
      appointmentDurationMinutes: duration,
      bufferMinutes: buffer
    };
  }

  private normalizeRulePatchInput(existing: AvailabilityRuleDocument, input: UpdateAvailabilityRuleInput) {
    const next = {
      weekday: input.weekday ?? existing.weekday,
      startTime: input.startTime ?? existing.startTime,
      endTime: input.endTime ?? existing.endTime,
      appointmentDurationMinutes: input.appointmentDurationMinutes ?? existing.appointmentDurationMinutes,
      bufferMinutes: input.bufferMinutes ?? existing.bufferMinutes
    };

    const normalizedBase = this.normalizeRuleInput(next);
    return {
      ...normalizedBase,
      status: input.status ?? existing.status
    };
  }

  private async assertNoActiveOverlap(
    organizationId: string,
    professionalId: string,
    weekday: number,
    startTime: string,
    endTime: string,
    ignoreRuleId?: string
  ): Promise<void> {
    const startMinutes = parseTimeToMinutes(startTime);
    const endMinutes = parseTimeToMinutes(endTime);

    const existing = await this.rules.findActiveByProfessional(organizationId, professionalId);
    const overlaps = existing.some((rule) => {
      if (rule.weekday !== weekday) {
        return false;
      }

      if (ignoreRuleId && rule._id.toString() === ignoreRuleId) {
        return false;
      }

      return minutesOverlap(startMinutes, endMinutes, parseTimeToMinutes(rule.startTime), parseTimeToMinutes(rule.endTime));
    });

    if (overlaps) {
      throw new AppError('OVERLAPPING_AVAILABILITY_RULE', 400, 'The rule overlaps with another active rule for this professional');
    }
  }

  private normalizeExceptionInput(input: CreateAvailabilityExceptionInput) {
    if (!isValidDateYyyyMmDd(input.date)) {
      throw new AppError('INVALID_EXCEPTION_DATE', 400, 'date must be a valid YYYY-MM-DD value');
    }

    const date = input.date;
    const reason = input.reason?.trim() ? input.reason.trim() : undefined;

    if (input.type === 'full_day_block') {
      return {
        date,
        type: input.type,
        startTime: undefined,
        endTime: undefined,
        reason
      };
    }

    if (!input.startTime || !input.endTime) {
      throw new AppError('INVALID_EXCEPTION_RANGE', 400, 'partial_block requires startTime and endTime');
    }

    const startMinutes = parseTimeToMinutes(input.startTime);
    const endMinutes = parseTimeToMinutes(input.endTime);
    if (startMinutes >= endMinutes) {
      throw new AppError('INVALID_EXCEPTION_RANGE', 400, 'startTime must be before endTime for partial_block');
    }

    return {
      date,
      type: input.type,
      startTime: formatMinutesToTime(startMinutes),
      endTime: formatMinutesToTime(endMinutes),
      reason
    };
  }

  private normalizeExceptionPatchInput(existing: AvailabilityExceptionDocument, input: UpdateAvailabilityExceptionInput) {
    const merged = {
      date: input.date ?? existing.date,
      type: input.type ?? existing.type,
      startTime: input.startTime ?? existing.startTime ?? undefined,
      endTime: input.endTime ?? existing.endTime ?? undefined,
      reason: input.reason ?? existing.reason ?? undefined
    };

    const normalized = this.normalizeExceptionInput(merged);
    return {
      ...normalized,
      status: input.status ?? existing.status
    };
  }

  private generateRuleSlotsForDate(date: string, rule: AvailabilityRuleDocument) {
    const startMinutes = parseTimeToMinutes(rule.startTime);
    const endMinutes = parseTimeToMinutes(rule.endTime);
    const step = rule.appointmentDurationMinutes + (rule.bufferMinutes ?? 0);

    if (step <= 0) {
      return [];
    }

    const slots: Array<{ date: string; startTime: string; endTime: string; startsAtIso: string; endsAtIso: string }> = [];
    let cursor = startMinutes;

    while ((cursor + rule.appointmentDurationMinutes) <= endMinutes) {
      const slotStart = cursor;
      const slotEnd = cursor + rule.appointmentDurationMinutes;

      const startTime = formatMinutesToTime(slotStart);
      const endTime = formatMinutesToTime(slotEnd);

      slots.push({
        date,
        startTime,
        endTime,
        startsAtIso: argentinaLocalDateTimeToUtcDate(date, startTime).toISOString(),
        endsAtIso: argentinaLocalDateTimeToUtcDate(date, endTime).toISOString()
      });

      cursor += step;
    }

    return slots;
  }


  private applyAvailabilityReleaseForDay(
    organizationId: string,
    professionalId: string,
    date: string,
    professional: { availabilityReleaseMode?: 'free' | 'progressive' | null; availabilityReleaseLimit?: number | null },
    candidateSlots: AvailabilitySlotCandidate[]
  ): AvailabilitySlotDto[] {
    const mode = professional.availabilityReleaseMode ?? 'free';
    if (mode !== 'progressive') {
      return candidateSlots.filter((slot) => !slot.occupied).map((slot) => this.toAvailabilitySlot(slot, true));
    }

    const limit = professional.availabilityReleaseLimit;
    if (!Number.isInteger(limit) || (limit as number) < 1) {
      return candidateSlots.filter((slot) => !slot.occupied).map((slot) => this.toAvailabilitySlot(slot, true));
    }

    const releaseLimit = limit as number;
    const batches = this.chunkSlots(candidateSlots, releaseLimit);
    const activeBatchIndex = batches.findIndex((batch) => !batch.every((slot) => slot.occupied));
    const effectiveActiveBatchIndex = activeBatchIndex === -1 ? batches.length : activeBatchIndex;

    const slots = batches.flatMap((batch, batchIndex) =>
      batch.map((slot) => {
        if (slot.occupied) {
          return this.toAvailabilitySlot(slot, false);
        }

        if (batchIndex === effectiveActiveBatchIndex) {
          return this.toAvailabilitySlot(slot, true);
        }

        return this.toAvailabilitySlot(slot, false, 'progressive_release', 'Se habilita al completar turnos anteriores');
      })
    );

    this.logProgressiveReleaseDiagnostics(organizationId, professionalId, date, mode, releaseLimit, candidateSlots, batches, activeBatchIndex, slots);

    return slots;
  }

  private chunkSlots(slots: AvailabilitySlotCandidate[], size: number): AvailabilitySlotCandidate[][] {
    const batches: AvailabilitySlotCandidate[][] = [];
    for (let index = 0; index < slots.length; index += size) {
      batches.push(slots.slice(index, index + size));
    }

    return batches;
  }

  private toAvailabilitySlot(
    slot: AvailabilitySlotCandidate,
    availableWhenFree: boolean,
    blockedReason?: AvailabilitySlotDto['blockedReason'],
    displayLabel?: string
  ): AvailabilitySlotDto {
    const { occupied, ...slotDto } = slot;
    if (occupied) {
      return {
        ...slotDto,
        available: false,
        blockedReason: 'occupied',
        displayLabel: 'Ocupado'
      };
    }

    return {
      ...slotDto,
      available: availableWhenFree,
      ...(blockedReason ? { blockedReason } : {}),
      ...(displayLabel ? { displayLabel } : {})
    };
  }

  private logProgressiveReleaseDiagnostics(
    organizationId: string,
    professionalId: string,
    date: string,
    releaseMode: 'progressive',
    releaseLimit: number,
    candidateSlots: AvailabilitySlotCandidate[],
    batches: AvailabilitySlotCandidate[][],
    activeBatchIndex: number,
    resultSlots: AvailabilitySlotDto[]
  ): void {
    if (process.env.AVAILABILITY_DEBUG_PROGRESSIVE_RELEASE !== 'true') {
      return;
    }

    logger.debug(
      {
        organizationId,
        professionalId,
        date,
        releaseMode,
        releaseLimit,
        candidateSlots: candidateSlots.map((slot) => slot.startTime),
        batches: batches.map((batch) => batch.map((slot) => slot.startTime)),
        activeBatchIndex,
        enabledSlots: resultSlots.filter((slot) => slot.available).map((slot) => slot.startTime),
        blockedSlots: resultSlots.filter((slot) => slot.blockedReason === 'progressive_release').map((slot) => slot.startTime),
        occupiedSlots: resultSlots.filter((slot) => slot.blockedReason === 'occupied').map((slot) => slot.startTime)
      },
      'Progressive availability release diagnostic'
    );
  }

  private toRuleDto(document: AvailabilityRuleDocument): AvailabilityRuleDto {
    return {
      id: document._id.toString(),
      organizationId: document.organizationId.toString(),
      professionalId: document.professionalId.toString(),
      weekday: document.weekday,
      startTime: document.startTime,
      endTime: document.endTime,
      appointmentDurationMinutes: document.appointmentDurationMinutes,
      bufferMinutes: document.bufferMinutes ?? 0,
      status: document.status,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString()
    };
  }

  private toExceptionDto(document: AvailabilityExceptionDocument): AvailabilityExceptionDto {
    return {
      id: document._id.toString(),
      organizationId: document.organizationId.toString(),
      professionalId: document.professionalId.toString(),
      date: document.date,
      type: document.type,
      startTime: document.startTime ?? null,
      endTime: document.endTime ?? null,
      reason: document.reason ?? null,
      status: document.status,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString()
    };
  }
}
