import type { AppointmentDto, AppointmentStatus, ProfessionalDashboardDto, ProfessionalPanelMeDto } from '@starter/shared-types';
import { AppError } from '../../../core/errors.js';
import { AppointmentRepository } from '../../appointments/repositories/appointment.repository.js';
import type { AppointmentDocument } from '../../appointments/models/appointment.model.js';
import { OrganizationRepository } from '../../organizations/repositories/organization.repository.js';
import { ProfessionalsService } from '../../professionals/services/professionals.service.js';

const startOfToday = (): Date => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
};

const endOfToday = (): Date => {
  const start = startOfToday();
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1, 0, 0, 0, -1);
};

export class ProfessionalPanelService {
  constructor(
    private readonly appointments = new AppointmentRepository(),
    private readonly organizations = new OrganizationRepository(),
    private readonly professionals = new ProfessionalsService()
  ) {}

  async me(organizationId: string, professionalId: string): Promise<ProfessionalPanelMeDto> {
    const [organization, professional] = await Promise.all([
      this.organizations.findById(organizationId),
      this.professionals.getProfessional(organizationId, professionalId)
    ]);

    if (!organization) throw new AppError('ORGANIZATION_NOT_FOUND', 404, 'Organization not found');

    return {
      organizationId,
      professionalId,
      organizationName: organization.displayName ?? organization.name,
      professional
    };
  }

  async appointmentsForToday(organizationId: string, professionalId: string): Promise<AppointmentDto[]> {
    const rows = await this.appointments.listByOrganization(organizationId, {
      professionalId,
      from: startOfToday(),
      to: endOfToday()
    });

    return rows.sort((a, b) => a.startAt.getTime() - b.startAt.getTime()).map((row) => this.toAppointmentDto(row));
  }

  async startAppointment(organizationId: string, professionalId: string, appointmentId: string, actorUserId: string): Promise<AppointmentDto> {
    const appointment = await this.appointments.findByIdInOrganization(organizationId, appointmentId);
    if (!appointment || appointment.professionalId.toString() !== professionalId) throw new AppError('APPOINTMENT_NOT_FOUND', 404, 'Appointment not found');
    if (appointment.status !== 'arrived') throw new AppError('INVALID_APPOINTMENT_STATE', 409, 'Appointment must be arrived to start care');
    const now = new Date();
    const updated = await this.appointments.updateByIdInOrganization(organizationId, appointmentId, {
      status: 'in_progress',
      startedAt: now,
      startedByUserId: actorUserId,
      statusUpdatedAt: now,
      statusUpdatedByUserId: actorUserId,
      statusUpdatedByRole: 'professional'
    }, { status: 'in_progress', changedAt: now, changedByUserId: actorUserId, changedByRole: 'professional', note: 'Atención iniciada' });
    if (!updated) throw new AppError('APPOINTMENT_NOT_FOUND', 404, 'Appointment not found');
    return this.toAppointmentDto(updated);
  }

  async completeAppointment(organizationId: string, professionalId: string, appointmentId: string, actorUserId: string): Promise<AppointmentDto> {
    const appointment = await this.appointments.findByIdInOrganization(organizationId, appointmentId);
    if (!appointment || appointment.professionalId.toString() !== professionalId) throw new AppError('APPOINTMENT_NOT_FOUND', 404, 'Appointment not found');
    if (appointment.status !== 'in_progress') throw new AppError('INVALID_APPOINTMENT_STATE', 409, 'Appointment must be in progress to complete care');
    const now = new Date();
    const updated = await this.appointments.updateByIdInOrganization(organizationId, appointmentId, {
      status: 'completed',
      completedAt: now,
      completedByUserId: actorUserId,
      statusUpdatedAt: now,
      statusUpdatedByUserId: actorUserId,
      statusUpdatedByRole: 'professional'
    }, { status: 'completed', changedAt: now, changedByUserId: actorUserId, changedByRole: 'professional', note: 'Atención finalizada' });
    if (!updated) throw new AppError('APPOINTMENT_NOT_FOUND', 404, 'Appointment not found');
    return this.toAppointmentDto(updated);
  }

  async waitingRoom(organizationId: string, professionalId: string): Promise<AppointmentDto[]> {
    const rows = await this.appointments.listByOrganization(organizationId, {
      professionalId,
      status: 'arrived',
      from: startOfToday(),
      to: endOfToday()
    });

    return rows
      .sort((a, b) => {
        const byStart = a.startAt.getTime() - b.startAt.getTime();
        if (byStart !== 0) return byStart;
        return (a.arrivedAt?.getTime() ?? a.statusUpdatedAt?.getTime() ?? 0) - (b.arrivedAt?.getTime() ?? b.statusUpdatedAt?.getTime() ?? 0);
      })
      .map((row) => this.toAppointmentDto(row));
  }

  async dashboard(organizationId: string, professionalId: string): Promise<ProfessionalDashboardDto> {
    const [me, todayAppointments, waitingRoom] = await Promise.all([
      this.me(organizationId, professionalId),
      this.appointmentsForToday(organizationId, professionalId),
      this.waitingRoom(organizationId, professionalId)
    ]);

    const pendingStatuses: AppointmentStatus[] = ['booked', 'confirmed_by_patient', 'arrived'];
    const nextAppointment = todayAppointments.find((appointment) => pendingStatuses.includes(appointment.status)) ?? null;

    return {
      me,
      today: new Date().toISOString(),
      nextAppointment,
      waitingRoom,
      todayAppointments,
      stats: {
        waiting: waitingRoom.length,
        pendingToday: todayAppointments.filter((appointment) => pendingStatuses.includes(appointment.status)).length,
        completedToday: todayAppointments.filter((appointment) => appointment.status === 'completed').length,
        noShowToday: todayAppointments.filter((appointment) => appointment.status === 'no_show').length,
        canceledToday: todayAppointments.filter((appointment) => appointment.status === 'canceled_by_patient' || appointment.status === 'canceled_by_staff').length
      }
    };
  }

  private toAppointmentDto(document: AppointmentDocument): AppointmentDto {
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
      startedAt: document.startedAt ? document.startedAt.toISOString() : null,
      startedByUserId: document.startedByUserId ? document.startedByUserId.toString() : null,
      completedAt: document.completedAt ? document.completedAt.toISOString() : null,
      completedByUserId: document.completedByUserId ? document.completedByUserId.toString() : null,
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
