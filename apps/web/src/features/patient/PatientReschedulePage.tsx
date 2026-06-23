import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import type { PatientAppointmentDetailDto, PatientAppointmentSlotDto } from '@starter/shared-types';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { patientApi } from './patient-api';
import { addDaysToDateKey, formatArgentinaDate, formatArgentinaTimeRange, getTodayArgentinaDateKey } from '../../lib/argentina-date-time';

export const PatientReschedulePage = (): ReactElement => {
  const { appointmentId = '' } = useParams();
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState<PatientAppointmentDetailDto | null>(null);
  const [dateFrom, setDateFrom] = useState(getTodayArgentinaDateKey());
  const [slots, setSlots] = useState<PatientAppointmentSlotDto[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  if (!appointmentId) return <Navigate to="/patient/appointments" replace />;

  const load = async (): Promise<void> => {
    if (!accessToken) return;
    setLoading(true); setError('');
    try {
      const detail = await patientApi.getAppointment(accessToken, appointmentId);
      setAppointment(detail);
      const availability = await patientApi.getAppointmentAvailableSlots(accessToken, appointmentId, { dateFrom, dateTo: addDaysToDateKey(dateFrom, 14) });
      setSlots(availability.days.flatMap((day) => day.slots));
    } catch (cause) { setError((cause as Error).message || 'No pudimos cargar disponibilidad.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [accessToken, appointmentId, dateFrom]);

  const confirm = async (): Promise<void> => {
    if (!accessToken || !appointment || !selected) return;
    const slot = slots.find((item) => item.startAt === selected);
    if (!slot) return;
    setSaving(true); setError('');
    try {
      const result = await patientApi.rescheduleAppointment(accessToken, appointment.id, { newStartAt: slot.startAt, newEndAt: slot.endAt });
      navigate(`/patient/appointments/${result.replacement.id}`);
    } catch (cause) { setError((cause as Error).message || 'El horario seleccionado acaba de ser reservado.'); }
    finally { setSaving(false); }
  };

  return <main className="nx-page nx-page--appointments"><Card title="Reprogramar turno" subtitle="Elegí una nueva fecha y horario disponible.">
    {error ? <p className="nx-form-error">{error}</p> : null}
    {loading ? <p role="status">Cargando disponibilidad...</p> : null}
    {appointment ? <div className="nx-appointment-list"><article className="nx-appointment-item"><div><strong>Turno actual</strong><p>{formatArgentinaDate(appointment.startAt)} — {formatArgentinaTimeRange(appointment.startAt, appointment.endAt ?? appointment.startAt)}</p><p>{appointment.organization.name} · {appointment.professional?.fullName ?? 'Profesional a confirmar'}</p></div></article></div> : null}
    <label>Seleccionar nueva fecha<input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label>
    <label>Seleccionar horario<select value={selected} onChange={(event) => setSelected(event.target.value)}><option value="">Elegí un horario</option>{slots.map((slot) => <option key={slot.startAt} value={slot.startAt}>{formatArgentinaDate(slot.startAt)} — {formatArgentinaTimeRange(slot.startAt, slot.endAt)}</option>)}</select></label>
    {selected ? <p>Nueva fecha y hora: {formatArgentinaDate(selected)} — {formatArgentinaTimeRange(selected, slots.find((slot) => slot.startAt === selected)?.endAt ?? selected)}</p> : null}
    <div className="nx-appointment-item__actions"><Link className="nx-btn-secondary" to={appointment ? `/patient/appointments/${appointment.id}` : '/patient/appointments'}>Volver</Link><button className="nx-btn" type="button" disabled={!selected || saving} onClick={() => void confirm()}>{saving ? 'Confirmando...' : 'Confirmar reprogramación'}</button></div>
  </Card></main>;
};
