import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { organizationApi } from './organization-api';

export const OrganizationReminderRulesPage = (): ReactElement => {
  const { accessToken, activeOrganizationId } = useAuth();
  const [rows, setRows] = useState<Array<{ id: string; offsetValue: number; offsetUnit: 'minutes' | 'hours' | 'days'; channel: 'in_app' | 'email' | 'push'; status: 'active' | 'inactive' }>>([]);
  const [offsetValue, setOffsetValue] = useState('1');
  const [offsetUnit, setOffsetUnit] = useState<'minutes' | 'hours' | 'days'>('hours');
  const [channel, setChannel] = useState<'in_app'>('in_app');
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
      await organizationApi.createReminderRule(accessToken, activeOrganizationId, { offsetValue: Number(offsetValue), offsetUnit, channel });
      setOffsetValue('1');
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
          <label>Anticipación<input type="number" min={1} value={offsetValue} onChange={(e) => setOffsetValue(e.target.value)} required /></label>
          <label>Unidad<select value={offsetUnit} onChange={(e) => setOffsetUnit(e.target.value as "minutes" | "days")}><option value="days">días</option><option value="minutes">minutos</option></select></label>
          <label>Canal<select value={channel} disabled><option value="in_app">in_app</option></select></label>
          <button type="submit" disabled={!canUse}>Agregar</button>
        </form>
        {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
        <ul style={{ listStyle: 'none', padding: 0, marginTop: 10, display: 'grid', gap: 8 }}>
          {rows.map((row) => <li key={row.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10 }}>{row.offsetValue} {row.offsetUnit === 'minutes' ? 'min' : row.offsetUnit === 'hours' ? 'h' : 'd'} — {row.channel} — {row.status} <button type="button" onClick={() => void toggle(row.id, row.status)}>{row.status === 'active' ? 'Desactivar' : 'Activar'}</button></li>)}
        </ul>
      </Card>
    </main>
  );
};
