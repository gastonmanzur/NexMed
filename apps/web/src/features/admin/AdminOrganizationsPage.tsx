import type { ChangeEvent, ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { adminApi, type AdminOrganizationItem, type CommercialStatus } from './admin-api';

const subscriptionStatuses: CommercialStatus[] = ['trial', 'active', 'past_due', 'suspended', 'canceled'];

const statusBadge = (value: string): string => {
  if (value === 'past_due' || value === 'suspended') return 'nx-badge nx-badge--danger';
  return 'nx-badge';
};

export const AdminOrganizationsPage = (): ReactElement => {
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState('');
  const [organizations, setOrganizations] = useState<AdminOrganizationItem[]>([]);

  useEffect(() => {
    if (!accessToken) return;
    const load = async (): Promise<void> => {
      setLoading(true);
      setError('');
      try {
        const query = new URLSearchParams({ page: '1', limit: '100' });
        if (search.trim()) query.set('search', search.trim());
        if (subscriptionStatus) query.set('subscriptionStatus', subscriptionStatus);
        const rows = await adminApi.listOrganizations(accessToken, query);
        setOrganizations(rows.items);
      } catch (cause) {
        setError((cause as Error).message);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [accessToken, search, subscriptionStatus]);

  const planOptions = useMemo(() => {
    const map = new Map<string, string>();
    organizations.forEach((row) => {
      if (row.subscriptionPlanId && row.subscriptionPlanName) {
        map.set(row.subscriptionPlanId, row.subscriptionPlanName);
      }
    });
    return Array.from(map.entries());
  }, [organizations]);
  const [selectedPlanId, setSelectedPlanId] = useState('');

  const filteredRows = useMemo(
    () => organizations.filter((row) => (!selectedPlanId ? true : row.subscriptionPlanId === selectedPlanId)),
    [organizations, selectedPlanId]
  );

  return (
    <main className="nx-page">
      <Card title="Organizaciones" subtitle="Listado comercial y operativo para seguimiento global.">
        <div className="nx-form-grid nx-form-grid--admin-filters-3">
          <label className="nx-field">
            Buscar por nombre
            <input value={search} onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)} placeholder="Ej: Centro Med Norte" />
          </label>
          <label className="nx-field">
            Estado comercial
            <select value={subscriptionStatus} onChange={(event) => setSubscriptionStatus(event.target.value)}>
              <option value="">Todos</option>
              {subscriptionStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label className="nx-field">
            Plan
            <select value={selectedPlanId} onChange={(event) => setSelectedPlanId(event.target.value)}>
              <option value="">Todos</option>
              {planOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </label>
        </div>
      </Card>

      <Card title="Resultados">
        {loading ? <p>Cargando organizaciones...</p> : null}
        {error ? <p className="nx-state nx-state--error">{error}</p> : null}
        <div className="nx-table-wrap">
          <table className="nx-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Estado</th>
                <th>Plan actual</th>
                <th>Trial / Suscripción</th>
                <th>Profesionales</th>
                <th>Pacientes</th>
                <th>Alta</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((organization) => (
                <tr key={organization.id}>
                  <td>{organization.name}</td>
                  <td><span className="nx-badge">{organization.status}</span></td>
                  <td>{organization.subscriptionPlanName ?? '-'}</td>
                  <td>
                    <span className={statusBadge(organization.subscriptionStatus)}>{organization.subscriptionStatus}</span>
                    {organization.subscriptionStatus === 'trial' && organization.trialDaysRemaining !== null ? (
                      <small style={{ display: 'block', color: '#64748b' }}>Quedan {organization.trialDaysRemaining} días</small>
                    ) : null}
                  </td>
                  <td>{organization.professionalsCount}</td>
                  <td>{organization.patientsCount}</td>
                  <td>{new Date(organization.createdAt).toLocaleDateString('es-AR')}</td>
                  <td><Link className="nx-btn-secondary" to={`/admin/organizations/${organization.id}`}>Ver detalle</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
};
