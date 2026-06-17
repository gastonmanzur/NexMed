import type { AppointmentStatus } from '@starter/shared-types';

export const appointmentStatuses: AppointmentStatus[] = [
  'booked',
  'confirmed_by_patient',
  'arrived',
  'in_progress',
  'completed',
  'no_show',
  'canceled_by_patient',
  'canceled_by_staff',
  'rescheduled'
];

export const pendingClosureStatuses: AppointmentStatus[] = ['booked', 'confirmed_by_patient', 'arrived'];

export const statusLabel = (status: AppointmentStatus): string => {
  const labels: Record<AppointmentStatus, string> = {
    booked: 'Reservado',
    confirmed_by_patient: 'Confirmado por paciente',
    arrived: 'Llegó',
    in_progress: 'En atención',
    completed: 'Atendido',
    no_show: 'No asistió',
    canceled_by_patient: 'Cancelado por paciente',
    canceled_by_staff: 'Cancelado por el centro',
    rescheduled: 'Reprogramado'
  };
  return labels[status];
};

export const statusTone = (status: AppointmentStatus): string => {
  const tones: Record<AppointmentStatus, string> = {
    booked: 'booked',
    confirmed_by_patient: 'confirmed-by-patient',
    arrived: 'arrived',
    in_progress: 'in-progress',
    completed: 'completed',
    no_show: 'no-show',
    canceled_by_patient: 'canceled',
    canceled_by_staff: 'canceled',
    rescheduled: 'rescheduled'
  };
  return tones[status];
};

export const isPendingClosure = (status: AppointmentStatus, endAt: string): boolean =>
  pendingClosureStatuses.includes(status) && new Date(endAt).getTime() < Date.now();

export const centerStatusActions = (status: AppointmentStatus): Array<{ status: AppointmentStatus; label: string; note?: string }> => {
  if (status === 'booked' || status === 'confirmed_by_patient') {
    return [
      { status: 'arrived', label: 'Llegó' },
      { status: 'completed', label: 'Atendido' },
      { status: 'no_show', label: 'No asistió' },
      { status: 'canceled_by_staff', label: 'Cancelar', note: 'Cancelado por el centro' }
    ];
  }
  if (status === 'arrived') {
    return [
      { status: 'completed', label: 'Atendido' },
      { status: 'no_show', label: 'No asistió' },
      { status: 'canceled_by_staff', label: 'Cancelar', note: 'Cancelado por el centro' }
    ];
  }
  return [];
};
