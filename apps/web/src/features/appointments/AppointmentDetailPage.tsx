import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { appointmentsApi } from './appointments-api';
import type { AppointmentDto, AppointmentStatus } from '@starter/shared-types';
import { centerStatusActions, isPendingClosure, statusLabel } from './appointment-status';

const formatDateTime = (value: string): string => new Date(value).toLocaleString();

export const AppointmentDetailPage = (): ReactElement => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { user, accessToken, activeOrganizationId } = useAuth();

  const [appointment, setAppointment] = useState<AppointmentDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState('');

  const load = async (): Promise<void> => {
    if (!accessToken || !activeOrganizationId || !appointmentId) return;
    setLoading(true);
    setError('');
    try {
      const data = await appointmentsApi.getById(accessToken, activeOrganizationId, appointmentId);
      setAppointment(data);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [accessToken, activeOrganizationId, appointmentId]);

  const updateStatus = async (status: AppointmentStatus, note?: string): Promise<void> => {
    if (!appointment || !accessToken || !activeOrganizationId) return;
    setUpdatingStatus(status);
    setError('');
    try {
      const updated = await appointmentsApi.updateStatus(accessToken, activeOrganizationId, appointment.id, { status, ...(note ? { note } : {}) });
      setAppointment(updated);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setUpdatingStatus('');
    }
  };


  if (!user) return <Navigate to="/login" replace />;
  if (!activeOrganizationId) return <Navigate to="/post-login" replace />;
  if (!appointmentId) return <Navigate to="/app/appointments" replace />;

  return (
    <main style={{ maxWidth: 800, margin: '2rem auto', padding: '1rem' }}>
      <Card title="Detalle de turno">
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/app/appointments">Volver al listado</Link>
          {appointment && ['booked', 'confirmed_by_patient'].includes(appointment.status) ? <Link to={`/app/appointments/${appointment.id}/reschedule`}>Reprogramar</Link> : null}
        </div>

        {loading ? <p>Cargando turno...</p> : null}
        {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}

        {appointment ? (
          <dl style={{ display: 'grid', gap: '0.5rem', marginTop: '1rem' }}>
            <div><dt>ID</dt><dd>{appointment.id}</dd></div>
            <div><dt>Paciente</dt><dd>{appointment.patientName}</dd></div>
            <div><dt>Email</dt><dd>{appointment.patientEmail ?? '-'}</dd></div>
            <div><dt>Teléfono</dt><dd>{appointment.patientPhone ?? '-'}</dd></div>
            <div><dt>Inicio</dt><dd>{formatDateTime(appointment.startAt)}</dd></div>
            <div><dt>Fin</dt><dd>{formatDateTime(appointment.endAt)}</dd></div>
            <div><dt>Estado</dt><dd><strong>{statusLabel(appointment.status)}</strong></dd></div>
            {isPendingClosure(appointment.status, appointment.endAt) ? <div><dt>Cierre</dt><dd><strong>Pendiente de cierre</strong></dd></div> : null}
            <div><dt>Origen</dt><dd>{appointment.source}</dd></div>
            <div><dt>Creado por</dt><dd>{appointment.createdByUserId}</dd></div>
            <div><dt>Cancelado por</dt><dd>{appointment.canceledByUserId ?? '-'}</dd></div>
            <div><dt>Cancelado en</dt><dd>{appointment.canceledAt ? formatDateTime(appointment.canceledAt) : '-'}</dd></div>
            <div><dt>Motivo cancelación</dt><dd>{appointment.cancelReason ?? '-'}</dd></div>
            <div><dt>Reprogramado desde</dt><dd>{appointment.rescheduledFromAppointmentId ?? '-'}</dd></div>
            <div><dt>Reprogramado hacia</dt><dd>{appointment.rescheduledToAppointmentId ?? '-'}</dd></div>
            <div><dt>Notas</dt><dd>{appointment.notes ?? '-'}</dd></div>
            <div><dt>Actualizado por</dt><dd>{appointment.statusUpdatedByUserId ?? '-'} {appointment.statusUpdatedByRole ? `(${appointment.statusUpdatedByRole})` : ''}</dd></div>
            <div><dt>Actualizado en</dt><dd>{appointment.statusUpdatedAt ? formatDateTime(appointment.statusUpdatedAt) : '-'}</dd></div>
            {centerStatusActions(appointment.status).length > 0 ? (
              <div><dt>Acciones operativas</dt><dd style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {centerStatusActions(appointment.status).map((action) => (
                  <button key={action.status} type="button" disabled={updatingStatus === action.status} onClick={() => void updateStatus(action.status, action.note)}>
                    {isPendingClosure(appointment.status, appointment.endAt) && action.status === 'completed' ? 'Marcar atendido' : isPendingClosure(appointment.status, appointment.endAt) && action.status === 'no_show' ? 'Marcar no asistió' : action.label}
                  </button>
                ))}
              </dd></div>
            ) : null}
          </dl>
        ) : null}
      </Card>
    </main>
  );
};
