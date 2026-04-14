import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { adminApi, type AdminOrganizationDetail } from './admin-api';

const commercialBadge = (status: string): string => {
  if (status === 'past_due' || status === 'suspended') return 'nx-badge nx-badge--danger';
  return 'nx-badge';
};

export const AdminOrganizationDetailPage = (): ReactElement => {
  const { organizationId = '' } = useParams();
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<AdminOrganizationDetail | null>(null);

  useEffect(() => {
    if (!accessToken || !organizationId) return;
    const load = async (): Promise<void> => {
      setLoading(true);
      setError('');
      try {
        setData(await adminApi.getOrganization(accessToken, organizationId));
      } catch (cause) {
        setError((cause as Error).message);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [accessToken, organizationId]);

  return (
    <main className="nx-page">
      <Card title="Detalle de organización" subtitle="Ficha administrativa global.">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.6rem', alignItems: 'center' }}>
          <div>
            <h3 style={{ marginBottom: 4 }}>{data?.organization.displayName ?? data?.organization.name ?? 'Organización'}</h3>
            <small style={{ color: '#64748b' }}>ID: {organizationId}</small>
          </div>
          <Link className="nx-btn-secondary" to="/admin/organizations">Volver al listado</Link>
        </div>
      </Card>

      {loading ? <p>Cargando detalle...</p> : null}
      {error ? <p className="nx-state nx-state--error">{error}</p> : null}

      {data ? (
        <>
          <Card title="1) Resumen general">
            <div className="nx-kpis">
              <div className="nx-kpi"><span>Nombre legal</span><p>{data.organization.name}</p></div>
              <div className="nx-kpi"><span>Nombre comercial</span><p>{data.organization.displayName ?? '-'}</p></div>
              <div className="nx-kpi"><span>Rubro / tipo</span><p>{data.organization.type}</p></div>
              <div className="nx-kpi"><span>Estado org</span><p>{data.organization.status}</p></div>
            </div>
          </Card>

          <Card title="2) Datos comerciales / estado">
            <div className="nx-kpis">
              <div className="nx-kpi"><span>Estado comercial</span><p><span className={commercialBadge(data.commercial.subscriptionStatus)}>{data.commercial.subscriptionStatus}</span></p></div>
              <div className="nx-kpi"><span>Proveedor</span><p>{data.commercial.provider ?? '-'}</p></div>
              <div className="nx-kpi"><span>Vencimiento trial/período</span><p>{data.commercial.trialEndsAt ? new Date(data.commercial.trialEndsAt).toLocaleDateString('es-AR') : '-'}</p></div>
              <div className="nx-kpi"><span>Días de trial restantes</span><p>{data.commercial.trialDaysRemaining ?? '-'}</p></div>
            </div>
          </Card>

          <Card title="3) Suscripción actual">
            <div className="nx-table-wrap">
              <table className="nx-table">
                <thead><tr><th>Plan</th><th>Monto</th><th>Estado</th><th>Inicio</th><th>Vencimiento</th><th>Provider Ref</th></tr></thead>
                <tbody>
                  <tr>
                    <td>{data.subscription?.plan?.name ?? '-'}</td>
                    <td>{data.subscription?.plan ? `${data.subscription.plan.price} ${data.subscription.plan.currency}` : '-'}</td>
                    <td>{data.subscription ? <span className={commercialBadge(data.subscription.status)}>{data.subscription.status}</span> : '-'}</td>
                    <td>{data.subscription?.startedAt ? new Date(data.subscription.startedAt).toLocaleDateString('es-AR') : '-'}</td>
                    <td>{data.subscription?.expiresAt ? new Date(data.subscription.expiresAt).toLocaleDateString('es-AR') : '-'}</td>
                    <td>{data.subscription?.providerReference ?? '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="4) Métricas básicas de uso">
            <div className="nx-kpis">
              <div className="nx-kpi"><span>Profesionales</span><p>{data.usage.professionalsCount}</p></div>
              <div className="nx-kpi"><span>Pacientes</span><p>{data.usage.patientsCount}</p></div>
              <div className="nx-kpi"><span>Turnos</span><p>{data.usage.appointmentsCount}</p></div>
              <div className="nx-kpi"><span>Owner/Admin principal</span><p>{data.owner?.email ?? '-'}</p></div>
            </div>
          </Card>

          <Card title="Acciones admin básicas">
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button type="button" className="nx-btn-secondary" disabled={!data.actions.canSuspendOrReactivate}>Suspender / Reactivar</button>
              <button type="button" className="nx-btn-secondary" disabled={!data.actions.canUpdateCommercialStatus}>Cambiar estado comercial</button>
              <button type="button" className="nx-btn-secondary" disabled={!data.actions.canExtendTrial}>Extender trial</button>
            </div>
            <p style={{ color: '#64748b' }}>{data.actions.pendingActionsNote}</p>
          </Card>
        </>
      ) : null}
    </main>
  );
};
