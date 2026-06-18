import type { ReactElement } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { InternalMessagesCard } from './InternalMessagesCard';
import { organizationApi, type InternalMessageDto } from './organization-api';

type Filter = 'unread' | 'all' | 'resolved';

export const InternalMessagesPage = (): ReactElement => {
  const { accessToken, activeOrganizationId } = useAuth();
  const [filter, setFilter] = useState<Filter>('unread');
  const [messages, setMessages] = useState<InternalMessageDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!accessToken || !activeOrganizationId) return;
    setLoading(true);
    try {
      const query = filter === 'all' ? { limit: 100 } : { status: filter, limit: 100 };
      const result = await organizationApi.listInternalMessages(accessToken, activeOrganizationId, query);
      setMessages(result.items);
      setUnreadCount(result.unreadCount);
      setError('');
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  }, [accessToken, activeOrganizationId, filter]);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => { void load(); }, 12000);
    return () => window.clearInterval(interval);
  }, [load]);

  if (!accessToken || !activeOrganizationId) return <Navigate to="/post-login" replace />;

  return <main style={{ display: 'grid', gap: '1rem' }}>
    <Card title={`Mensajes internos${unreadCount ? ` (${unreadCount})` : ''}`} subtitle="Bandeja bidireccional entre profesionales y secretaría.">
      <div className="nx-internal-filters" role="tablist" aria-label="Filtrar mensajes internos">
        {(['unread', 'all', 'resolved'] as Filter[]).map((item) => {
          const active = filter === item;
          const label = item === 'unread' ? 'No leídos' : item === 'resolved' ? 'Resueltos' : 'Todos';
          return <button key={item} className={`nx-internal-filter${active ? ' nx-internal-filter--active' : ''}`} type="button" role="tab" aria-selected={active} onClick={() => setFilter(item)}>{label}</button>;
        })}
      </div>
    </Card>
    <InternalMessagesCard accessToken={accessToken} organizationId={activeOrganizationId} messages={messages} loading={loading} error={error} onRefresh={load} allowReply />
  </main>;
};
