import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import type { UserEventDto } from '@starter/shared-types';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { patientApi } from './patient-api';

export const PatientNotificationsPage = (): ReactElement => {
  const { accessToken } = useAuth(); const [events, setEvents] = useState<UserEventDto[]>([]); const [error, setError] = useState('');
  useEffect(() => { if (!accessToken) return; void patientApi.listEvents(accessToken).then(setEvents).catch((cause) => setError((cause as Error).message)); }, [accessToken]);
  return <main style={{ maxWidth: 720, margin: '2rem auto', padding: '1rem' }}><Card title="Notificaciones">{error ? <p style={{ color: 'crimson' }}>{error}</p> : null}{events.length === 0 ? <p>Sin notificaciones por ahora.</p> : null}<ul>{events.map((event) => <li key={event.id}><strong>{event.title}</strong>{event.body ? ` — ${event.body}` : ''}</li>)}</ul></Card></main>;
};
