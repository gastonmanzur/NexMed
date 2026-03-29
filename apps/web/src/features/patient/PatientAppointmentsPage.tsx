import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AppointmentDto } from '@starter/shared-types';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { patientApi } from './patient-api';

export const PatientAppointmentsPage = (): ReactElement => {
  const { accessToken } = useAuth();
  const [upcoming, setUpcoming] = useState<AppointmentDto[]>([]);
  const [history, setHistory] = useState<AppointmentDto[]>([]);
  const [error, setError] = useState('');
  const reload = async (): Promise<void> => { if (!accessToken) return; const data = await patientApi.listAppointments(accessToken); setUpcoming(data.upcoming); setHistory(data.history); };
  useEffect(() => { void reload().catch((cause) => setError((cause as Error).message)); }, [accessToken]);
  return <main style={{ maxWidth: 980, margin: '2rem auto', padding: '1rem' }}><Card title="Mis turnos">{error ? <p style={{ color: 'crimson' }}>{error}</p> : null}<h3>Próximos</h3>{upcoming.length === 0 ? <p>No tenés turnos próximos.</p> : null}<ul>{upcoming.map((item) => <li key={item.id} style={{ marginBottom: '0.75rem' }}>{new Date(item.startAt).toLocaleString('es-AR', { hour12: false })} · estado: {item.status} · <button type="button" onClick={async () => { if (!accessToken) return; try { await patientApi.cancelAppointment(accessToken, item.id, 'Cancelado por paciente'); await reload(); } catch (cause) { setError((cause as Error).message); } }}>Cancelar</button> · <Link to={`/patient/appointments/${item.id}/reschedule`}>Reprogramar</Link></li>)}</ul><h3>Historial</h3><ul>{history.map((item) => <li key={item.id}>{new Date(item.startAt).toLocaleString('es-AR', { hour12: false })} · estado: {item.status}</li>)}</ul></Card></main>;
};
