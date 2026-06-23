import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import type { PatientAppointmentDetailDto } from '@starter/shared-types';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { patientApi } from './patient-api';
import { EmptyState, ErrorState, LoadingState } from '../../components/AsyncState';
import { formatArgentinaDate, formatArgentinaTimeRange } from '../../lib/argentina-date-time';

const downloadIcs = (appointment: PatientAppointmentDetailDto): void => {
  const dt = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const location = [appointment.organization.address, appointment.organization.city].filter(Boolean).join(', ');
  const description = `Turno con ${appointment.professional?.fullName ?? 'profesional'}${appointment.specialty?.name ? ` — ${appointment.specialty.name}` : ''}`;
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//NexMed//Mis turnos//ES', 'BEGIN:VEVENT', `UID:${appointment.id}@nexmedturnos.pro`, `SUMMARY:Turno en ${appointment.organization.name}`, `DTSTART:${dt(appointment.startAt)}`, `DTEND:${dt(appointment.endAt ?? appointment.startAt)}`, `LOCATION:${location}`, `DESCRIPTION:${description}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = 'turno-nexmed.ics'; a.click(); URL.revokeObjectURL(url);
};

export const PatientAppointmentDetailPage = (): ReactElement => {
  const { appointmentId = '' } = useParams();
  const { accessToken } = useAuth();
  const [appointment, setAppointment] = useState<PatientAppointmentDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  if (!appointmentId) return <Navigate to="/patient/appointments" replace />;

  const load = async (): Promise<void> => {
    if (!accessToken) return;
    setLoading(true); setError('');
    try { setAppointment(await patientApi.getAppointment(accessToken, appointmentId)); }
    catch { setError('No encontramos este turno.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [accessToken, appointmentId]);

  const cancel = async (): Promise<void> => {
    if (!accessToken || !appointment || !window.confirm('¿Querés cancelar este turno?\nEsta acción puede liberar el horario para otro paciente.')) return;
    try { await patientApi.cancelAppointment(accessToken, appointment.id, 'Cancelado por paciente'); setMessage('Turno cancelado.'); await load(); }
    catch (cause) { setError((cause as Error).message || 'No es posible cancelar este turno.'); }
  };

  return <main className="nx-page nx-page--appointments"><Card title="Detalle del turno" subtitle="Información operativa del turno.">
    {loading ? <LoadingState message="Cargando turno..." /> : null}
    {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
    {message ? <p className="nx-form-success">{message}</p> : null}
    {!loading && !error && !appointment ? <EmptyState title="No encontramos este turno." description="Verificá el enlace o volvé a Mis turnos." icon="🗓️" /> : null}
    {appointment ? <section className="nx-appointment-list">
      <article className="nx-appointment-item"><div>
        <p className="nx-appointment-item__date">{formatArgentinaDate(appointment.startAt)} — {formatArgentinaTimeRange(appointment.startAt, appointment.endAt ?? appointment.startAt)}</p>
        <p className="nx-appointment-item__status">Estado: {appointment.patientStatusLabel}</p>
        <p className="nx-appointment-item__status">Centro: {appointment.organization.name}</p>
        <p className="nx-appointment-item__status">Profesional: {appointment.professional?.fullName ?? 'A confirmar'}</p>
        <p className="nx-appointment-item__status">Especialidad: {appointment.specialty?.name ?? appointment.serviceName ?? 'A confirmar'}</p>
        <p className="nx-appointment-item__status">Ubicación: {[appointment.organization.address, appointment.organization.city].filter(Boolean).join(', ') || 'A confirmar'}</p>
        {appointment.organization.phone ? <p className="nx-appointment-item__status">Teléfono: {appointment.organization.phone}</p> : null}
        {appointment.organization.email ? <p className="nx-appointment-item__status">Email: {appointment.organization.email}</p> : null}
        {appointment.instructions ? <p className="nx-appointment-item__status">Indicaciones: {appointment.instructions}</p> : null}
      </div><div className="nx-appointment-item__actions">
        {appointment.canCancel ? <button className="nx-btn-secondary" type="button" onClick={() => void cancel()}>Cancelar turno</button> : null}
        {appointment.canReschedule ? <Link className="nx-btn-secondary" to={`/patient/appointments/${appointment.id}/reschedule`}>Reprogramar</Link> : null}
        <button className="nx-btn-secondary" type="button" onClick={() => downloadIcs(appointment)}>Agregar al calendario</button>
        <Link className="nx-btn-secondary" to="/patient/appointments">Volver a mis turnos</Link>
      </div></article>
    </section> : null}
  </Card></main>;
};
