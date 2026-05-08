import type { CSSProperties, KeyboardEvent, ReactElement } from 'react';
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

  const handleNotificationKeyDown = (event: KeyboardEvent<HTMLElement>, item: NotificationDto) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      void openNotification(item);
    }
  };

  const getNotificationCardStyle = (item: NotificationDto): CSSProperties => ({
    width: '100%',
    textAlign: 'left',
    border: focusedItemId === item.id ? '2px solid #2563eb' : '1px solid #d7deea',
    borderRadius: 10,
    padding: 12,
    background: item.readAt ? '#fff' : '#f4f8ff',
    boxShadow: focusedItemId === item.id ? '0 0 0 3px rgba(37,99,235,0.15)' : '0 1px 2px rgba(16,24,40,0.04)',
    cursor: 'pointer',
    transition: 'background-color 140ms ease, box-shadow 140ms ease, border-color 140ms ease, transform 120ms ease'
  });

  return (
    <main style={{ maxWidth: 800, margin: '2rem auto', padding: '1rem' }}>
      <Card title="Notificaciones">
        {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
        {loading ? <p>Cargando...</p> : null}
        {!loading && items.length === 0 ? <p>Sin notificaciones por ahora.</p> : null}
        <ul style={{ display: 'grid', gap: 10, listStyle: 'none', padding: 0 }}>
          {items.map((item) => (
            <li id={`notification-${item.id}`} key={item.id}>
              <article
                role="button"
                tabIndex={0}
                aria-label={`Abrir notificación: ${item.title}`}
                style={getNotificationCardStyle(item)}
                onClick={() => void openNotification(item)}
                onKeyDown={(event) => handleNotificationKeyDown(event, item)}
                onMouseEnter={(event) => {
                  event.currentTarget.style.backgroundColor = item.readAt ? '#f9fbff' : '#eaf2ff';
                  event.currentTarget.style.borderColor = '#9bb8f6';
                  event.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.12)';
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.backgroundColor = item.readAt ? '#fff' : '#f4f8ff';
                  event.currentTarget.style.borderColor = focusedItemId === item.id ? '#2563eb' : '#d7deea';
                  event.currentTarget.style.boxShadow = focusedItemId === item.id ? '0 0 0 3px rgba(37,99,235,0.15)' : '0 1px 2px rgba(16,24,40,0.04)';
                }}
                onFocus={(event) => {
                  event.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.25)';
                }}
                onBlur={(event) => {
                  event.currentTarget.style.boxShadow = focusedItemId === item.id ? '0 0 0 3px rgba(37,99,235,0.15)' : '0 1px 2px rgba(16,24,40,0.04)';
                }}
                onMouseDown={(event) => {
                  event.currentTarget.style.transform = 'scale(0.995)';
                }}
                onMouseUp={(event) => {
                  event.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <strong>{item.title}</strong>
                <p style={{ margin: '6px 0' }}>{item.message}</p>
                <small>{new Date(item.createdAt).toLocaleString('es-AR', { hour12: false })}</small>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  {!item.readAt ? <button type="button" onClick={(event) => { event.stopPropagation(); void markRead(item.id); }}>Marcar como leída</button> : null}
                </div>
              </article>
            </li>
          ))}
        </ul>
      </Card>
    </main>
  );
};
