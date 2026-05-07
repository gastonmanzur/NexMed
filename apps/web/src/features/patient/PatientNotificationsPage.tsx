import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { NotificationDto } from '@starter/shared-types';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { useNotifications } from '../notifications/NotificationsContext';
import { patientApi } from './patient-api';
import { resolveNotificationTargetUrl } from './notification-navigation';
import { useNavigate, useSearchParams } from 'react-router-dom';

export const PatientNotificationsPage = (): ReactElement => {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshUnreadCount, markOneAsReadLocally } = useNotifications();
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const focusNotificationId = searchParams.get('focus');

  const focusedItemId = useMemo(
    () => (focusNotificationId && items.some((item) => item.id === focusNotificationId) ? focusNotificationId : null),
    [focusNotificationId, items]
  );

  const load = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      setItems(await patientApi.listNotifications(accessToken));
      await refreshUnreadCount();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [accessToken]);

  useEffect(() => {
    if (!focusedItemId) {
      return;
    }
    const row = document.getElementById(`notification-${focusedItemId}`);
    row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focusedItemId]);

  const markRead = async (id: string) => {
    if (!accessToken) return;
    await patientApi.markNotificationRead(accessToken, id);
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, readAt: new Date().toISOString() } : item))
    );
    markOneAsReadLocally();
    await refreshUnreadCount();
  };

  const openNotification = async (item: NotificationDto) => {
    if (!accessToken) return;
    if (!item.readAt) {
      await markRead(item.id);
    }
    navigate(resolveNotificationTargetUrl(item));
  };

  return (
    <main style={{ maxWidth: 800, margin: '2rem auto', padding: '1rem' }}>
      <Card title="Notificaciones">
        {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
        {loading ? <p>Cargando...</p> : null}
        {!loading && items.length === 0 ? <p>Sin notificaciones por ahora.</p> : null}
        <ul style={{ display: 'grid', gap: 10, listStyle: 'none', padding: 0 }}>
          {items.map((item) => (
            <li id={`notification-${item.id}`} key={item.id} style={{ border: focusedItemId === item.id ? '2px solid #2563eb' : '1px solid #ddd', borderRadius: 8, padding: 12, background: item.readAt ? '#fff' : '#f4f8ff', boxShadow: focusedItemId === item.id ? '0 0 0 3px rgba(37,99,235,0.15)' : 'none' }}>
              <strong>{item.title}</strong>
              <p style={{ margin: '6px 0' }}>{item.message}</p>
              <small>{new Date(item.createdAt).toLocaleString('es-AR', { hour12: false })}</small>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button type="button" onClick={() => void openNotification(item)}>Abrir</button>
                {!item.readAt ? <button type="button" onClick={() => void markRead(item.id)}>Marcar como leída</button> : null}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </main>
  );
};
