import mongoose from 'mongoose';
import { AppError } from '../../../core/errors.js';
import { AppointmentRepository } from '../../appointments/repositories/appointment.repository.js';
import { NotificationService } from '../../notifications/services/notification.service.js';
import { ReminderRuleRepository } from '../repositories/reminder-rule.repository.js';
import { ReminderDispatchRepository } from '../repositories/reminder-dispatch.repository.js';
import { logger } from '../../../config/logger.js';
import type { AppointmentDocument } from '../../appointments/models/appointment.model.js';

export class ReminderService {
  constructor(
    private readonly rules = new ReminderRuleRepository(),
    private readonly appointments = new AppointmentRepository(),
    private readonly notifications = new NotificationService(),
    private readonly dispatches = new ReminderDispatchRepository()
  ) {}

  async listRules(organizationId: string) {
    const rows = await this.rules.listByOrganization(organizationId);
    return rows.map((row) => this.toDto(row));
  }

  async createRule(organizationId: string, input: { offsetValue: number; offsetUnit: 'minutes' | 'hours' | 'days'; channel: 'in_app' }) {
    if (!Number.isInteger(input.offsetValue) || input.offsetValue < 1 || input.offsetValue > (input.offsetUnit === 'minutes' ? 10080 : 3650)) {
      throw new AppError('INVALID_REMINDER_OFFSET', 400, 'offsetValue is out of allowed range for offsetUnit');
    }

    try {
      const row = await this.rules.create({ organizationId, ...input, status: 'active' });
      return this.toDto(row);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
        throw new AppError('DUPLICATE_REMINDER_RULE', 409, 'A reminder rule with same hours/channel already exists');
      }
      throw error;
    }
  }

  async updateRule(
    organizationId: string,
    ruleId: string,
    input: { offsetValue?: number | undefined; offsetUnit?: 'minutes' | 'hours' | 'days' | undefined; channel?: 'in_app' | undefined }
  ) {
    if (!mongoose.isValidObjectId(ruleId)) {
      throw new AppError('INVALID_REMINDER_RULE_ID', 400, 'ruleId is invalid');
    }

    if (input.offsetValue !== undefined || input.offsetUnit !== undefined) {
      const unit = input.offsetUnit ?? 'days';
      const value = input.offsetValue ?? 0;
      if (!Number.isInteger(value) || value < 1 || value > (unit === 'minutes' ? 10080 : 3650)) {
        throw new AppError('INVALID_REMINDER_OFFSET', 400, 'offsetValue is out of allowed range for offsetUnit');
      }
    }

    try {
      const row = await this.rules.updateByIdInOrganization(organizationId, ruleId, input);
      if (!row) throw new AppError('REMINDER_RULE_NOT_FOUND', 404, 'Reminder rule not found');
      return this.toDto(row);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
        throw new AppError('DUPLICATE_REMINDER_RULE', 409, 'A reminder rule with same hours/channel already exists');
      }
      throw error;
    }
  }

  async updateRuleStatus(organizationId: string, ruleId: string, status: 'active' | 'inactive') {
    if (!mongoose.isValidObjectId(ruleId)) {
      throw new AppError('INVALID_REMINDER_RULE_ID', 400, 'ruleId is invalid');
    }

    const row = await this.rules.updateByIdInOrganization(organizationId, ruleId, { status });
    if (!row) throw new AppError('REMINDER_RULE_NOT_FOUND', 404, 'Reminder rule not found');
    return this.toDto(row);
  }


  async scheduleForAppointment(appointment: { _id: { toString(): string }; organizationId: { toString(): string }; startAt: Date; status: string }): Promise<void> {
    const appointmentId = appointment._id.toString();
    if (appointment.status !== 'booked') {
      await this.dispatches.cancelPendingByAppointment(appointmentId, `appointment_status_${appointment.status}`);
      return;
    }
    const rules = await this.rules.listActiveByOrganization(appointment.organizationId.toString());
    for (const rule of rules) {
      if (rule.offsetUnit === 'minutes' && !process.env.ALLOW_MINUTE_BASED_REMINDERS && !String(process.env.ALLOW_MINUTE_BASED_REMINDERS).includes('true')) {
        continue;
      }
      const triggerMs = this.offsetToMs(rule.offsetValue, rule.offsetUnit);
      await this.dispatches.upsertPending({
        appointmentId,
        organizationId: appointment.organizationId.toString(),
        ruleId: rule._id.toString(),
        scheduledFor: new Date(appointment.startAt.getTime() - triggerMs),
        channel: 'in_app'
      });
    }
  }

  async runDueReminders(now = new Date()): Promise<{ generated: number; scanned: number }> {
    const catchupMinutes = 15;
    const due = await this.dispatches.findPendingDue(new Date(now.getTime() - catchupMinutes * 60_000), now);
    let generated = 0;
    for (const dispatch of due) {
      const appointment = await this.appointments.findByIdInOrganization(dispatch.organizationId.toString(), dispatch.appointmentId.toString());
      if (!appointment || appointment.status !== 'booked') {
        await this.dispatches.cancelPendingByAppointment(dispatch.appointmentId.toString(), 'appointment_not_booked_anymore');
        continue;
      }
      try {
        await this.notifications.notifyPatientFromAppointment(this.toAppointmentDto(appointment), 'appointment_reminder', 'Recordatorio de turno', 'Tenés un turno próximo.', `${appointment._id.toString()}:reminder:${dispatch.ruleId.toString()}`);
        await this.dispatches.markSent(dispatch._id.toString());
        generated += 1;
      } catch (error) {
        logger.warn({ error, dispatchId: dispatch._id.toString() }, 'reminder dispatch failed');
        await this.dispatches.markFailed(dispatch._id.toString());
      }
    }
    return { generated, scanned: due.length };
  }

  private offsetToMs(value: number, unit: 'minutes' | 'hours' | 'days'): number {
    if (unit === 'minutes') return value * 60_000;
    if (unit === 'hours') return value * 3_600_000;
    return value * 24 * 3_600_000;
  }

  private toAppointmentDto(appointment: AppointmentDocument) {
    return {
      id: appointment._id.toString(), organizationId: appointment.organizationId.toString(), professionalId: appointment.professionalId.toString(), specialtyId: appointment.specialtyId ? appointment.specialtyId.toString() : null, patientProfileId: appointment.patientProfileId ? appointment.patientProfileId.toString() : null, patientName: appointment.patientName, patientEmail: appointment.patientEmail ?? null, patientPhone: appointment.patientPhone ?? null, startAt: appointment.startAt.toISOString(), endAt: appointment.endAt.toISOString(), status: appointment.status, source: appointment.source, notes: appointment.notes ?? null, createdByUserId: appointment.createdByUserId.toString(), bookedByUserId: (appointment.bookedByUserId ?? appointment.createdByUserId).toString(), beneficiaryType: appointment.beneficiaryType ?? 'self', familyMemberId: appointment.familyMemberId ? appointment.familyMemberId.toString() : null, beneficiaryDisplayName: appointment.beneficiaryDisplayName ?? appointment.patientName, beneficiaryRelationship: appointment.beneficiaryRelationship ?? null, canceledByUserId: appointment.canceledByUserId ? appointment.canceledByUserId.toString() : null, canceledAt: appointment.canceledAt ? appointment.canceledAt.toISOString() : null, cancelReason: appointment.cancelReason ?? null, rescheduledFromAppointmentId: appointment.rescheduledFromAppointmentId ? appointment.rescheduledFromAppointmentId.toString() : null, rescheduledToAppointmentId: appointment.rescheduledToAppointmentId ? appointment.rescheduledToAppointmentId.toString() : null, createdAt: appointment.createdAt.toISOString(), updatedAt: appointment.updatedAt.toISOString()
    };
  }

  private toDto(row: { _id: { toString(): string }; organizationId: { toString(): string }; offsetValue: number; offsetUnit: 'minutes' | 'hours' | 'days'; channel: 'in_app' | 'email' | 'push'; status: 'active' | 'inactive'; createdAt: Date; updatedAt: Date }) {
    return {
      id: row._id.toString(),
      organizationId: row.organizationId.toString(),
      offsetValue: row.offsetValue,
      offsetUnit: row.offsetUnit,
      channel: row.channel,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    };
  }
}
