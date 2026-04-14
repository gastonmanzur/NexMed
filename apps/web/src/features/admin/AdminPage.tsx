import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { adminApi, type AdminSummary } from './admin-api';

const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

const subscriptionBadgeClass = (status: string): string => {
  if (status === 'active') return 'nx-badge';
  if (status === 'trial') return 'nx-badge';
  if (status === 'past_due' || status === 'suspended') return 'nx-badge nx-badge--danger';
  return 'nx-badge';
};

export const AdminPage = (): ReactElement => {
  const { accessToken } = useAuth();
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    const load = async (): Promise<void> => {
      setLoading(true);
      setError('');
      try {
        setSummary(await adminApi.getSummary(accessToken));
      } catch (cause) {
        setError((cause as Error).message);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [accessToken]);

  return (
    <main className="nx-page">
      <Card title="Inicio · Admin global" subtitle="Visión ejecutiva inicial de la operación SaaS de NexMed.">
        {loading ? <p>Cargando KPIs globales...</p> : null}
        {error ? <p className="nx-state nx-state--error">{error}</p> : null}
        {summary ? (
          <div className="nx-kpis">
            <div className="nx-kpi"><span>Organizaciones totales</span><p>{summary.totalOrganizations}</p></div>
            <div className="nx-kpi"><span>Organizaciones activas</span><p>{summary.activeOrganizations}</p></div>
            <div className="nx-kpi"><span>En trial</span><p>{summary.trialOrganizations}</p></div>
            <div className="nx-kpi"><span>Pagando</span><p>{summary.paidOrganizations}</p></div>
            <div className="nx-kpi"><span>Vencidas / suspendidas</span><p>{summary.suspendedOrPastDueOrganizations}</p></div>
            <div className="nx-kpi"><span>Ingreso mensual estimado</span><p>{money.format(summary.estimatedMonthlyRevenue)}</p></div>
          </div>
        ) : null}
      </Card>

      <Card title="Organizaciones recientes">
        <div className="nx-table-wrap">
          <table className="nx-table">
            <thead>
              <tr><th>Organización</th><th>Estado org</th><th>Estado comercial</th><th>Alta</th><th /></tr>
            </thead>
            <tbody>
              {summary?.recentOrganizations.map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td><span className="nx-badge">{row.status}</span></td>
                  <td><span className={subscriptionBadgeClass(row.subscriptionStatus)}>{row.subscriptionStatus}</span></td>
                  <td>{new Date(row.createdAt).toLocaleDateString('es-AR')}</td>
                  <td><Link className="nx-btn-secondary" to={`/admin/organizations/${row.id}`}>Ver detalle</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Trials próximos a vencer">
        <div className="nx-table-wrap">
          <table className="nx-table">
            <thead><tr><th>Organización</th><th>Vence</th><th>Días restantes</th><th /></tr></thead>
            <tbody>
              {summary?.expiringTrials.map((row) => (
                <tr key={row.organizationId}>
                  <td>{row.organizationName}</td>
                  <td>{row.expiresAt ? new Date(row.expiresAt).toLocaleDateString('es-AR') : '-'}</td>
                  <td>{row.daysRemaining ?? '-'}</td>
                  <td><Link className="nx-btn-secondary" to={`/admin/organizations/${row.organizationId}`}>Ver detalle</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Suscripciones problemáticas">
        <div className="nx-table-wrap">
          <table className="nx-table">
            <thead><tr><th>Organización</th><th>Estado</th><th>Vencimiento</th><th /></tr></thead>
            <tbody>
              {summary?.problematicSubscriptions.map((row) => (
                <tr key={`${row.organizationId}-${row.status}`}>
                  <td>{row.organizationName}</td>
                  <td><span className={subscriptionBadgeClass(row.status)}>{row.status}</span></td>
                  <td>{row.expiresAt ? new Date(row.expiresAt).toLocaleDateString('es-AR') : '-'}</td>
                  <td><Link className="nx-btn-secondary" to={`/admin/organizations/${row.organizationId}`}>Ver detalle</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
};
