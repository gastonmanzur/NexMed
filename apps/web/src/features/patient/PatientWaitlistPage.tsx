import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { PatientOrganizationSummaryDto, WaitlistRequestDto } from '@starter/shared-types';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { patientApi } from './patient-api';

export const PatientWaitlistPage = (): ReactElement => {
  const { accessToken } = useAuth();
  const [rows, setRows] = useState<WaitlistRequestDto[]>([]);
  const [organizations, setOrganizations] = useState<PatientOrganizationSummaryDto[]>([]);
  const [error, setError] = useState('');
  const [params] = useSearchParams();
  const organizationId = params.get('organizationId') ?? '';

  const load = async () => {
    if (!accessToken) return;
    try {
      const [list, orgs] = await Promise.all([patientApi.listWaitlist(accessToken), patientApi.listOrganizations(accessToken)]);
      setRows(list);
      setOrganizations(orgs);
    } catch (cause) {
      setError((cause as Error).message);
    }
  };

  useEffect(() => { void load(); }, [accessToken]);

  const orgById = useMemo(() => new Map(organizations.map((o) => [o.organization.id, o.organization.displayName ?? o.organization.name])), [organizations]);

  const cancel = async (id: string) => {
    if (!accessToken) return;
    await patientApi.cancelWaitlist(accessToken, id);
    await load();
  };

  return (
    <main style={{ maxWidth: 880, margin: '2rem auto', padding: '1rem' }}>
      <Card title="Mis alertas de disponibilidad">
        {organizationId ? <Link to={`/patient/waitlist/new?organizationId=${organizationId}`}>Crear nueva alerta</Link> : <Link to="/patient/waitlist/new">Crear nueva alerta</Link>}
        {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
        {rows.length === 0 ? <p>No tenés alertas activas.</p> : null}
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 10, marginTop: 12 }}>
          {rows.map((row) => (
            <li key={row.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
              <strong>{orgById.get(row.organizationId) ?? row.organizationId}</strong>
              <p style={{ margin: '4px 0' }}>{row.startDate} → {row.endDate} {row.timeWindowStart && row.timeWindowEnd ? `(${row.timeWindowStart}-${row.timeWindowEnd})` : ''}</p>
              <small>Estado: {row.status}</small>
              {row.status === 'active' || row.status === 'matched' ? <div><button type="button" onClick={() => void cancel(row.id)} style={{ marginTop: 8 }}>Cancelar</button></div> : null}
            </li>
          ))}
        </ul>
      </Card>
    </main>
  );
};
