import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { patientApi } from './patient-api';

export const PatientReschedulePage = (): ReactElement => {
  const { appointmentId = '' } = useParams(); const { accessToken } = useAuth(); const navigate = useNavigate();
  const [appointmentDate, setAppointmentDate] = useState(''); const [newStartAt, setNewStartAt] = useState(''); const [error, setError] = useState('');
  useEffect(() => { if (!accessToken) return; void patientApi.getAppointment(accessToken, appointmentId).then((appointment) => { const local = new Date(appointment.startAt); setAppointmentDate(local.toISOString().slice(0, 16)); setNewStartAt(local.toISOString().slice(0, 16)); }).catch((cause) => setError((cause as Error).message)); }, [accessToken, appointmentId]);
  return <main style={{ maxWidth: 680, margin: '2rem auto', padding: '1rem' }}><Card title="Reprogramar turno">{error ? <p style={{ color: 'crimson' }}>{error}</p> : null}<p>Turno actual: {appointmentDate ? appointmentDate.replace('T', ' ') : '-'}</p><label>Nuevo inicio<input type="datetime-local" value={newStartAt} onChange={(event) => setNewStartAt(event.target.value)} /></label><button type="button" onClick={async () => { if (!accessToken) return; try { setError(''); await patientApi.rescheduleAppointment(accessToken, appointmentId, { newStartAt: new Date(newStartAt).toISOString() }); navigate('/patient/appointments'); } catch (cause) { setError((cause as Error).message); } }}>Confirmar reprogramación</button></Card></main>;
};
