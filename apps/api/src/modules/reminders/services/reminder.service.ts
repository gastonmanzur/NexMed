import mongoose from 'mongoose';
import { AppError } from '../../../core/errors.js';
import { AppointmentRepository } from '../../appointments/repositories/appointment.repository.js';
import { NotificationService } from '../../notifications/services/notification.service.js';
import { ReminderRuleRepository } from '../repositories/reminder-rule.repository.js';

export class ReminderService {
  constructor(
    private readonly rules = new ReminderRuleRepository(),
    private readonly appointments = new AppointmentRepository(),
    private readonly notifications = new NotificationService()
  ) {}

  async listRules(organizationId: string) {
    const rows = await this.rules.listByOrganization(organizationId);
    return rows.map((row) => this.toDto(row));
  }

  async createRule(organizationId: string, input: { offsetValue: number; offsetUnit: 'minutes' | 'days'; channel: 'in_app' | 'email' | 'push' }) {
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
    input: { offsetValue?: number | undefined; offsetUnit?: 'minutes' | 'days' | undefined; channel?: 'in_app' | 'email' | 'push' | undefined }
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

  async runDueReminders(now = new Date()): Promise<{ generated: number }> {
    const horizon = new Date(now.getTime() + (72 * 60 * 60 * 1000));
    const appointments = await this.appointments.findBookedStartingBetween(now, horizon);

    let generated = 0;
    for (const appointment of appointments) {
      const orgId = appointment.organizationId.toString();
      const rules = await this.rules.listActiveByOrganization(orgId);
      if (rules.length === 0) continue;

      const msToAppointment = appointment.startAt.getTime() - now.getTime();
      for (const rule of rules) {
        const triggerMs = rule.offsetUnit === 'minutes' ? rule.offsetValue * 60_000 : rule.offsetValue * 24 * 60 * 60_000;
        const diffMs = Math.abs(msToAppointment - triggerMs);
        if (diffMs > 60_000) continue;

        await this.notifications.notifyPatientFromAppointment(
          {
            id: appointment._id.toString(),
            organizationId: orgId,
            professionalId: appointment.professionalId.toString(),
            specialtyId: appointment.specialtyId ? appointment.specialtyId.toString() : null,
            patientProfileId: appointment.patientProfileId ? appointment.patientProfileId.toString() : null,
            patientName: appointment.patientName,
            patientEmail: appointment.patientEmail ?? null,
            patientPhone: appointment.patientPhone ?? null,
            startAt: appointment.startAt.toISOString(),
            endAt: appointment.endAt.toISOString(),
            status: appointment.status,
            source: appointment.source,
            notes: appointment.notes ?? null,
            createdByUserId: appointment.createdByUserId.toString(),
            bookedByUserId: (appointment.bookedByUserId ?? appointment.createdByUserId).toString(),
            beneficiaryType: appointment.beneficiaryType ?? 'self',
            familyMemberId: appointment.familyMemberId ? appointment.familyMemberId.toString() : null,
            beneficiaryDisplayName: appointment.beneficiaryDisplayName ?? appointment.patientName,
            beneficiaryRelationship: appointment.beneficiaryRelationship ?? null,
            canceledByUserId: appointment.canceledByUserId ? appointment.canceledByUserId.toString() : null,
            canceledAt: appointment.canceledAt ? appointment.canceledAt.toISOString() : null,
            cancelReason: appointment.cancelReason ?? null,
            rescheduledFromAppointmentId: appointment.rescheduledFromAppointmentId ? appointment.rescheduledFromAppointmentId.toString() : null,
            rescheduledToAppointmentId: appointment.rescheduledToAppointmentId ? appointment.rescheduledToAppointmentId.toString() : null,
            createdAt: appointment.createdAt.toISOString(),
            updatedAt: appointment.updatedAt.toISOString()
          },
          'appointment_reminder',
          'Recordatorio de turno',
          `Tenés un turno en ${rule.offsetValue} ${rule.offsetUnit === 'minutes' ? 'minutos' : 'días'}.`,
          `${appointment._id.toString()}:reminder:${rule._id.toString()}`
        );
        generated += 1;
      }
    }

    return { generated };
  }

  private toDto(row: { _id: { toString(): string }; organizationId: { toString(): string }; offsetValue: number; offsetUnit: 'minutes' | 'days'; channel: 'in_app' | 'email' | 'push'; status: 'active' | 'inactive'; createdAt: Date; updatedAt: Date }) {
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
