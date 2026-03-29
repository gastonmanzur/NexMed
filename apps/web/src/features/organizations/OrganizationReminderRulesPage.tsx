import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { organizationApi } from './organization-api';

export const OrganizationReminderRulesPage = (): ReactElement => {
  const { accessToken, activeOrganizationId } = useAuth();
  const [rows, setRows] = useState<Array<{ id: string; triggerHoursBefore: number; channel: 'in_app' | 'email' | 'push'; status: 'active' | 'inactive' }>>([]);
  const [hours, setHours] = useState('24');
  const [channel, setChannel] = useState<'in_app' | 'email' | 'push'>('in_app');
  const [error, setError] = useState('');

  const canUse = useMemo(() => Boolean(accessToken && activeOrganizationId), [accessToken, activeOrganizationId]);

  const load = async () => {
    if (!accessToken || !activeOrganizationId) return;
    try {
      setRows(await organizationApi.listReminderRules(accessToken, activeOrganizationId));
      setError('');
    } catch (cause) {
      setError((cause as Error).message);
    }
  };

  useEffect(() => { void load(); }, [accessToken, activeOrganizationId]);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!accessToken || !activeOrganizationId) return;
    try {
      await organizationApi.createReminderRule(accessToken, activeOrganizationId, { triggerHoursBefore: Number(hours), channel });
      setHours('24');
      await load();
    } catch (cause) {
      setError((cause as Error).message);
    }
  };

  const toggle = async (id: string, status: 'active' | 'inactive') => {
    if (!accessToken || !activeOrganizationId) return;
    await organizationApi.updateReminderRuleStatus(accessToken, activeOrganizationId, id, status === 'active' ? 'inactive' : 'active');
    await load();
  };

  return (
    <main style={{ maxWidth: 760, margin: '2rem auto', padding: '1rem' }}>
      <Card title="Reglas de recordatorio">
        {!canUse ? <p>Necesitás una organización activa.</p> : null}
        <form onSubmit={create} style={{ display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap' }}>
          <label>Horas antes<input type="number" min={1} max={720} value={hours} onChange={(e) => setHours(e.target.value)} required /></label>
          <label>Canal<select value={channel} onChange={(e) => setChannel(e.target.value as 'in_app' | 'email' | 'push')}><option value="in_app">in_app</option><option value="email">email</option><option value="push">push</option></select></label>
          <button type="submit" disabled={!canUse}>Agregar</button>
        </form>
        {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
        <ul style={{ listStyle: 'none', padding: 0, marginTop: 10, display: 'grid', gap: 8 }}>
          {rows.map((row) => <li key={row.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10 }}>{row.triggerHoursBefore}h — {row.channel} — {row.status} <button type="button" onClick={() => void toggle(row.id, row.status)}>{row.status === 'active' ? 'Desactivar' : 'Activar'}</button></li>)}
        </ul>
      </Card>
    </main>
  );
};
