import mongoose from 'mongoose';
import { AppError } from '../../../core/errors.js';
import { env } from '../../../config/env.js';
import { AppointmentRepository } from '../../appointments/repositories/appointment.repository.js';
import { NotificationService } from '../../notifications/services/notification.service.js';
import { ReminderRuleRepository } from '../repositories/reminder-rule.repository.js';
import { ReminderDispatchRepository } from '../repositories/reminder-dispatch.repository.js';
import { logger } from '../../../config/logger.js';
import type { AppointmentDocument } from '../../appointments/models/appointment.model.js';

type ReminderType = 'first_half' | 'second_half' | 'last_before_appointment';
type ReminderCandidate = { type: ReminderType; scheduledFor: Date; priority: number };

export class ReminderService {
  constructor(
    private readonly rules = new ReminderRuleRepository(),
    private readonly appointments = new AppointmentRepository(),
    private readonly notifications = new NotificationService(),
    private readonly dispatches = new ReminderDispatchRepository()
  ) {}
  async listRules(organizationId: string) { const rows = await this.rules.listByOrganization(organizationId); return rows.map((row) => this.toDto(row)); }
  async createRule(organizationId: string, input: { offsetValue: number; offsetUnit: 'minutes' | 'hours' | 'days'; channel: 'in_app' }) { if (!Number.isInteger(input.offsetValue) || input.offsetValue < 1 || input.offsetValue > (input.offsetUnit === 'minutes' ? 10080 : 3650)) throw new AppError('INVALID_REMINDER_OFFSET', 400, 'offsetValue is out of allowed range for offsetUnit'); try { const row = await this.rules.create({ organizationId, ...input, status: 'active' }); return this.toDto(row); } catch (error: unknown) { if (error && typeof error === 'object' && 'code' in error && error.code === 11000) throw new AppError('DUPLICATE_REMINDER_RULE', 409, 'A reminder rule with same hours/channel already exists'); throw error; } }
  async updateRule(organizationId: string, ruleId: string, input: { offsetValue?: number | undefined; offsetUnit?: 'minutes' | 'hours' | 'days' | undefined; channel?: 'in_app' | undefined }) { if (!mongoose.isValidObjectId(ruleId)) throw new AppError('INVALID_REMINDER_RULE_ID', 400, 'ruleId is invalid'); if (input.offsetValue !== undefined || input.offsetUnit !== undefined) { const unit = input.offsetUnit ?? 'days'; const value = input.offsetValue ?? 0; if (!Number.isInteger(value) || value < 1 || value > (unit === 'minutes' ? 10080 : 3650)) throw new AppError('INVALID_REMINDER_OFFSET', 400, 'offsetValue is out of allowed range for offsetUnit'); } try { const row = await this.rules.updateByIdInOrganization(organizationId, ruleId, input); if (!row) throw new AppError('REMINDER_RULE_NOT_FOUND', 404, 'Reminder rule not found'); return this.toDto(row); } catch (error: unknown) { if (error && typeof error === 'object' && 'code' in error && error.code === 11000) throw new AppError('DUPLICATE_REMINDER_RULE', 409, 'A reminder rule with same hours/channel already exists'); throw error; } }
  async updateRuleStatus(organizationId: string, ruleId: string, status: 'active' | 'inactive') { if (!mongoose.isValidObjectId(ruleId)) throw new AppError('INVALID_REMINDER_RULE_ID', 400, 'ruleId is invalid'); const row = await this.rules.updateByIdInOrganization(organizationId, ruleId, { status }); if (!row) throw new AppError('REMINDER_RULE_NOT_FOUND', 404, 'Reminder rule not found'); return this.toDto(row); }

  async scheduleForAppointment(appointment: { _id: { toString(): string }; organizationId: { toString(): string }; startAt: Date; createdAt?: Date; status: string }, now = new Date()): Promise<void> {
    const appointmentId = appointment._id.toString();
    if (appointment.status !== 'booked') {
      await this.dispatches.cancelPendingByAppointment(appointmentId, `appointment_status_${appointment.status}`);
      return;
    }

    await this.dispatches.cancelPendingByAppointment(appointmentId, 'rescheduled_recalculation');

    const candidates = this.buildCandidates(appointment.createdAt ?? now, appointment.startAt);
    const validCandidates = this.selectValidCandidates(candidates, now, appointment.startAt);

    for (const selected of validCandidates) {
      await this.dispatches.upsertPending({
        appointmentId,
        organizationId: appointment.organizationId.toString(),
        reminderType: selected.type,
        scheduledFor: selected.scheduledFor,
        channel: 'in_app'
      });
    }
  }

  private buildCandidates(createdAt: Date, startAt: Date): ReminderCandidate[] {
    const startMs = startAt.getTime();
    const createdMs = createdAt.getTime();
    const t1 = new Date(createdMs + Math.floor((startMs - createdMs) * 0.5));
    const t2 = new Date(t1.getTime() + Math.floor((startMs - t1.getTime()) * 0.5));
    const lastOffsetMs = env.ALLOW_MINUTE_BASED_REMINDERS ? 60_000 : 24 * 60 * 60_000;
    const t3 = new Date(startMs - lastOffsetMs);

    return [
      { type: 'first_half', scheduledFor: t1, priority: 3 },
      { type: 'second_half', scheduledFor: t2, priority: 2 },
      { type: 'last_before_appointment', scheduledFor: t3, priority: 1 }
    ];
  }

  private selectValidCandidates(candidates: ReminderCandidate[], now: Date, startAt: Date): ReminderCandidate[] {
    const nowMs = now.getTime();
    const startMs = startAt.getTime();
    const byInstant = new Map<number, ReminderCandidate>();

    for (const candidate of candidates) {
      const ms = candidate.scheduledFor.getTime();
      if (ms <= nowMs || ms >= startMs) continue;
      const existing = byInstant.get(ms);
      if (!existing || candidate.priority < existing.priority) {
        byInstant.set(ms, candidate);
      }
    }

    return [...byInstant.values()].sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
  }

  async runDueReminders(now = new Date()): Promise<{ generated: number; scanned: number }> {
    const due = await this.dispatches.findPendingDue(new Date(now.getTime() - env.REMINDER_WORKER_CATCHUP_MINUTES * 60_000), now);
    let generated = 0;
    for (const dispatch of due) {
      const appointment = await this.appointments.findByIdInOrganization(dispatch.organizationId.toString(), dispatch.appointmentId.toString());
      if (!appointment || !['booked', 'confirmed_by_patient', 'arrived'].includes(appointment.status)) { await this.dispatches.cancelPendingByAppointment(dispatch.appointmentId.toString(), 'appointment_not_booked_anymore'); continue; }
      try {
        await this.notifications.notifyPatientFromAppointment(this.toAppointmentDto(appointment), 'appointment_reminder', 'Recordatorio de turno', 'Tenés un turno próximo.', `${appointment._id.toString()}:reminder:${dispatch.reminderType}`);
        await this.dispatches.markSent(dispatch._id.toString());
        generated += 1;
      } catch (error) {
        logger.warn({ error, dispatchId: dispatch._id.toString() }, 'reminder dispatch failed');
        await this.dispatches.markFailed(dispatch._id.toString());
      }
    }
    return { generated, scanned: due.length };
  }

  private toAppointmentDto(appointment: AppointmentDocument) { return { id: appointment._id.toString(), organizationId: appointment.organizationId.toString(), professionalId: appointment.professionalId.toString(), specialtyId: appointment.specialtyId ? appointment.specialtyId.toString() : null, patientProfileId: appointment.patientProfileId ? appointment.patientProfileId.toString() : null, patientName: appointment.patientName, patientEmail: appointment.patientEmail ?? null, patientPhone: appointment.patientPhone ?? null, startAt: appointment.startAt.toISOString(), endAt: appointment.endAt.toISOString(), durationMultiplier: (appointment.durationMultiplier === 2 ? 2 : 1) as 1 | 2, status: appointment.status, source: appointment.source, notes: appointment.notes ?? null, createdByUserId: appointment.createdByUserId ? appointment.createdByUserId.toString() : null, bookedByUserId: appointment.bookedByUserId ? appointment.bookedByUserId.toString() : (appointment.createdByUserId ? appointment.createdByUserId.toString() : null), beneficiaryType: appointment.beneficiaryType ?? 'self', familyMemberId: appointment.familyMemberId ? appointment.familyMemberId.toString() : null, beneficiaryDisplayName: appointment.beneficiaryDisplayName ?? appointment.patientName, beneficiaryRelationship: appointment.beneficiaryRelationship ?? null, paymentCoverageType: appointment.paymentCoverageType ?? 'private', healthInsuranceId: appointment.healthInsuranceId ? appointment.healthInsuranceId.toString() : null, healthInsuranceName: appointment.healthInsuranceName ?? 'Particular', insuranceMemberNumber: appointment.insuranceMemberNumber ?? null, insurancePlan: appointment.insurancePlan ?? null, canceledByUserId: appointment.canceledByUserId ? appointment.canceledByUserId.toString() : null, canceledAt: appointment.canceledAt ? appointment.canceledAt.toISOString() : null, cancelReason: appointment.cancelReason ?? null, statusUpdatedAt: appointment.statusUpdatedAt ? appointment.statusUpdatedAt.toISOString() : null, statusUpdatedByUserId: appointment.statusUpdatedByUserId ? appointment.statusUpdatedByUserId.toString() : null, statusUpdatedByRole: appointment.statusUpdatedByRole ?? null, statusHistory: (appointment.statusHistory ?? []).map((entry) => ({ status: entry.status, changedAt: entry.changedAt.toISOString(), changedByUserId: entry.changedByUserId.toString(), changedByRole: entry.changedByRole, note: entry.note ?? null })), rescheduledFromAppointmentId: appointment.rescheduledFromAppointmentId ? appointment.rescheduledFromAppointmentId.toString() : null, rescheduledToAppointmentId: appointment.rescheduledToAppointmentId ? appointment.rescheduledToAppointmentId.toString() : null, createdAt: appointment.createdAt.toISOString(), updatedAt: appointment.updatedAt.toISOString() }; }
  private toDto(row: { _id: { toString(): string }; organizationId: { toString(): string }; offsetValue: number; offsetUnit: 'minutes' | 'hours' | 'days'; channel: 'in_app' | 'email' | 'push'; status: 'active' | 'inactive'; createdAt: Date; updatedAt: Date }) { return { id: row._id.toString(), organizationId: row.organizationId.toString(), offsetValue: row.offsetValue, offsetUnit: row.offsetUnit, channel: row.channel, status: row.status, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }; }
}
