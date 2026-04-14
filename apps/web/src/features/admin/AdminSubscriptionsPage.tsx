import type { ChangeEvent, ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { adminApi, type AdminSubscriptionItem, type CommercialStatus } from './admin-api';

const statuses: CommercialStatus[] = ['trial', 'active', 'past_due', 'suspended', 'canceled'];

const statusClass = (status: string): string => {
  if (status === 'past_due' || status === 'suspended') return 'nx-badge nx-badge--danger';
  return 'nx-badge';
};

export const AdminSubscriptionsPage = (): ReactElement => {
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<AdminSubscriptionItem[]>([]);

  useEffect(() => {
    if (!accessToken) return;
    const load = async (): Promise<void> => {
      setLoading(true);
      setError('');
      try {
        const query = new URLSearchParams({ page: '1', limit: '100' });
        if (status) query.set('status', status);
        if (search.trim()) query.set('search', search.trim());
        setRows((await adminApi.listSubscriptions(accessToken, query)).items);
      } catch (cause) {
        setError((cause as Error).message);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [accessToken, search, status]);

  return (
    <main className="nx-page">
      <Card title="Suscripciones" subtitle="Estado comercial por organización.">
        <div className="nx-form-grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
          <label className="nx-field">
            Buscar organización
            <input value={search} onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)} placeholder="Buscar por nombre" />
          </label>
          <label className="nx-field">
            Estado
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">Todos</option>
              {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </div>
      </Card>

      <Card title="Listado de suscripciones">
        {loading ? <p>Cargando suscripciones...</p> : null}
        {error ? <p className="nx-state nx-state--error">{error}</p> : null}
        <div className="nx-table-wrap">
          <table className="nx-table">
            <thead>
              <tr>
                <th>Organización</th>
                <th>Plan</th>
                <th>Estado</th>
                <th>Monto mensual</th>
                <th>Inicio</th>
                <th>Renovación / vencimiento</th>
                <th>Provider</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id}>
                  <td>{item.organizationName}</td>
                  <td>{item.planName ?? '-'}</td>
                  <td><span className={statusClass(item.status)}>{item.status}</span></td>
                  <td>{item.monthlyAmount !== null ? `${item.monthlyAmount} ${item.currency ?? ''}` : '-'}</td>
                  <td>{item.startedAt ? new Date(item.startedAt).toLocaleDateString('es-AR') : '-'}</td>
                  <td>{item.renewalOrExpiryAt ? new Date(item.renewalOrExpiryAt).toLocaleDateString('es-AR') : '-'}</td>
                  <td>{item.provider}</td>
                  <td><Link className="nx-btn-secondary" to={`/admin/organizations/${item.organizationId}`}>Ver organización</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
};
