import mongoose from 'mongoose';
import { AppointmentModel } from '../../appointments/models/appointment.model.js';
import { ProfessionalModel } from '../../professionals/models/professional.model.js';
import { SpecialtyModel } from '../../professionals/models/specialty.model.js';
import { NotificationModel } from '../../notifications/models/notification.model.js';
import { ReminderDispatchModel } from '../../reminders/models/reminder-dispatch.model.js';

interface AnalyticsFilters { from: Date; to: Date; professionalId?: string; specialtyId?: string; }

const oid = (id: string) => new mongoose.Types.ObjectId(id);

export class AnalyticsService {
  async getOrganizationAnalytics(organizationId: string, filters: AnalyticsFilters) {
    const match: Record<string, unknown> = {
      organizationId: oid(organizationId),
      startAt: { $gte: filters.from, $lte: filters.to }
    };
    if (filters.professionalId) match.professionalId = oid(filters.professionalId);
    if (filters.specialtyId) match.specialtyId = oid(filters.specialtyId);

    const [statusRows, byProfessional, bySpecialty, timeline, upcoming, uniquePatients, newPatients, notifications, reminders] = await Promise.all([
      AppointmentModel.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      AppointmentModel.aggregate([{ $match: match }, { $group: { _id: '$professionalId', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      AppointmentModel.aggregate([{ $match: match }, { $group: { _id: '$specialtyId', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      AppointmentModel.aggregate([{ $match: match }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$startAt' } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      AppointmentModel.countDocuments({ organizationId: oid(organizationId), status: 'booked', startAt: { $gte: new Date(), $lte: filters.to } }),
      AppointmentModel.aggregate([{ $match: { ...match, status: 'completed', patientProfileId: { $ne: null } } }, { $group: { _id: '$patientProfileId' } }, { $count: 'count' }]),
      AppointmentModel.aggregate([{ $match: { ...match, patientProfileId: { $ne: null } } }, { $group: { _id: '$patientProfileId', firstSeen: { $min: '$createdAt' } } }, { $match: { firstSeen: { $gte: filters.from, $lte: filters.to } } }, { $count: 'count' }]),
      NotificationModel.countDocuments({ organizationId: oid(organizationId), createdAt: { $gte: filters.from, $lte: filters.to } }),
      ReminderDispatchModel.countDocuments({ organizationId: oid(organizationId), status: 'sent', sentAt: { $gte: filters.from, $lte: filters.to } })
    ]);

    const statusMap = new Map<string, number>(statusRows.map((row) => [String(row._id), Number(row.count)]));
    const totalAppointments = statusRows.reduce((acc, row) => acc + Number(row.count), 0);
    const canceled = (statusMap.get('canceled_by_staff') ?? 0) + (statusMap.get('canceled_by_patient') ?? 0);
    const reprogrammed = statusMap.get('rescheduled') ?? 0;
    const completed = statusMap.get('completed') ?? 0;
    const uniqueAttendedPatients = uniquePatients[0]?.count ?? 0;
    const newPatientsCount = newPatients[0]?.count ?? 0;

    const profIds = byProfessional.map((row) => row._id).filter(Boolean);
    const specIds = bySpecialty.map((row) => row._id).filter(Boolean);
    const [profs, specs] = await Promise.all([
      ProfessionalModel.find({ _id: { $in: profIds } }).select('_id firstName lastName displayName').lean(),
      SpecialtyModel.find({ _id: { $in: specIds } }).select('_id name').lean()
    ]);
    const profMap = new Map(profs.map((p) => [String(p._id), p.displayName || `${p.firstName} ${p.lastName}`]));
    const specMap = new Map(specs.map((s) => [String(s._id), s.name]));

    return {
      filters: { from: filters.from.toISOString(), to: filters.to.toISOString(), professionalId: filters.professionalId ?? null, specialtyId: filters.specialtyId ?? null },
      kpis: {
        totalAppointments,
        bookedAppointments: statusMap.get('booked') ?? 0,
        canceledAppointments: canceled,
        rescheduledAppointments: reprogrammed,
        completedAppointments: completed,
        uniqueAttendedPatients,
        newPatients: newPatientsCount,
        recurringPatients: Math.max(uniqueAttendedPatients - newPatientsCount, 0),
        cancellationRate: totalAppointments ? canceled / totalAppointments : 0,
        rescheduleRate: totalAppointments ? reprogrammed / totalAppointments : 0,
        upcomingAppointments: upcoming,
        notificationsSent: notifications,
        remindersSent: reminders
      },
      byProfessional: byProfessional.map((row) => ({ professionalId: String(row._id), label: profMap.get(String(row._id)) ?? 'Profesional', count: Number(row.count) })),
      bySpecialty: bySpecialty.map((row) => ({ specialtyId: row._id ? String(row._id) : null, label: row._id ? specMap.get(String(row._id)) ?? 'Especialidad' : 'Sin especialidad', count: Number(row.count) })),
      timelineDaily: timeline.map((row) => ({ date: String(row._id), count: Number(row.count) })),
      statusBreakdown: {
        booked: statusMap.get('booked') ?? 0,
        completed,
        canceledByStaff: statusMap.get('canceled_by_staff') ?? 0,
        canceledByPatient: statusMap.get('canceled_by_patient') ?? 0,
        rescheduled: reprogrammed,
        noShow: statusMap.get('no_show') ?? 0
      },
      coverage: {
        supported: ['turnos_totales','turnos_confirmados_reservados','turnos_cancelados','turnos_reprogramados','pacientes_atendidos','pacientes_nuevos','pacientes_recurrentes','turnos_por_profesional','turnos_por_especialidad','distribucion_diaria','tasa_cancelacion','tasa_reprogramacion','proximos_turnos','recordatorios_enviados','notificaciones_enviadas'],
        notSupportedYet: ['ocupacion_agenda','turnos_con_recordatorios_configurados','impacto_recordatorios']
      }
    };
  }
}
