import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import type { NotificationDto } from '@starter/shared-types';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { patientApi } from './patient-api';

export const PatientNotificationsPage = (): ReactElement => {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      setItems(await patientApi.listNotifications(accessToken));
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [accessToken]);

  const markRead = async (id: string) => {
    if (!accessToken) return;
    await patientApi.markNotificationRead(accessToken, id);
    await load();
  };

  return (
    <main style={{ maxWidth: 800, margin: '2rem auto', padding: '1rem' }}>
      <Card title="Notificaciones">
        {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
        {loading ? <p>Cargando...</p> : null}
        {!loading && items.length === 0 ? <p>Sin notificaciones por ahora.</p> : null}
        <ul style={{ display: 'grid', gap: 10, listStyle: 'none', padding: 0 }}>
          {items.map((item) => (
            <li key={item.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, background: item.readAt ? '#fff' : '#f4f8ff' }}>
              <strong>{item.title}</strong>
              <p style={{ margin: '6px 0' }}>{item.message}</p>
              <small>{new Date(item.createdAt).toLocaleString('es-AR', { hour12: false })}</small>
              {!item.readAt ? (
                <div>
                  <button type="button" onClick={() => void markRead(item.id)} style={{ marginTop: 8 }}>Marcar como leída</button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </Card>
    </main>
  );
};
