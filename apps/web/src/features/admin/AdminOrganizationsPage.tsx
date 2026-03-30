import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { adminApi } from './admin-api';

export const AdminOrganizationsPage = (): ReactElement => {
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<{
    organizationsTotal: number;
    organizationsActive: number;
    onboardingPending: number;
    usersTotal: number;
    subscriptionsByStatus: Record<string, number>;
  } | null>(null);
  const [organizations, setOrganizations] = useState<Array<{
    id: string;
    name: string;
    status: 'onboarding' | 'active' | 'inactive' | 'suspended' | 'blocked';
    onboardingCompleted: boolean;
    betaEnabled: boolean;
    subscriptionStatus: 'trial' | 'active' | 'past_due' | 'suspended' | 'canceled';
    createdAt: string;
  }>>([]);

  const load = async (): Promise<void> => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const [summaryResult, orgsResult] = await Promise.all([
        adminApi.getSummary(accessToken),
        adminApi.listOrganizations(accessToken, new URLSearchParams({ page: '1', limit: '50' }))
      ]);

      setSummary(summaryResult);
      setOrganizations(orgsResult.items);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const updateStatus = async (organizationId: string, status: 'onboarding' | 'active' | 'inactive' | 'suspended' | 'blocked'): Promise<void> => {
    if (!accessToken) return;
    setError('');
    try {
      await adminApi.updateOrganizationStatus(accessToken, organizationId, { status });
      setOrganizations((current) => current.map((item) => (item.id === organizationId ? { ...item, status } : item)));
    } catch (cause) {
      setError((cause as Error).message);
    }
  };

  return (
    <main style={{ maxWidth: 1100, margin: '2rem auto', padding: '1rem', display: 'grid', gap: '1rem' }}>
      <Card title="Admin global · Organizaciones">
        {loading ? <p>Cargando resumen global...</p> : null}
        {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
        {summary ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '0.75rem' }}>
            <Card title="Org totales"><p>{summary.organizationsTotal}</p></Card>
            <Card title="Org activas"><p>{summary.organizationsActive}</p></Card>
            <Card title="Onboarding pendiente"><p>{summary.onboardingPending}</p></Card>
            <Card title="Usuarios totales"><p>{summary.usersTotal}</p></Card>
          </div>
        ) : null}
      </Card>

      <Card title="Listado de organizaciones">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
            <thead>
              <tr>
                <th align="left">Organización</th>
                <th align="left">Estado</th>
                <th align="left">Suscripción</th>
                <th align="left">Beta</th>
                <th align="left">Onboarding</th>
                <th align="left">Acción</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((organization) => (
                <tr key={organization.id}>
                  <td>{organization.name}</td>
                  <td>{organization.status}</td>
                  <td>{organization.subscriptionStatus}</td>
                  <td>{organization.betaEnabled ? 'Sí' : 'No'}</td>
                  <td>{organization.onboardingCompleted ? 'Completo' : 'Pendiente'}</td>
                  <td>
                    <select value={organization.status} onChange={(event) => { void updateStatus(organization.id, event.target.value as 'onboarding' | 'active' | 'inactive' | 'suspended' | 'blocked'); }}>
                      <option value="onboarding">onboarding</option>
                      <option value="active">active</option>
                      <option value="inactive">inactive</option>
                      <option value="suspended">suspended</option>
                      <option value="blocked">blocked</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
};
