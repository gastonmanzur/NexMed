import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { organizationApi } from '../organizations/organization-api';

interface PlanItem {
  id: string;
  code: string;
  name: string;
  price: number;
  currency: string;
  maxProfessionalsActive: number;
  status: 'active' | 'inactive';
  description: string | null;
}

export const OrganizationSubscriptionPage = (): ReactElement => {
  const { accessToken, activeOrganizationId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [summary, setSummary] = useState<{
    subscription: {
      id: string;
      status: 'trial' | 'active' | 'past_due' | 'suspended' | 'canceled';
      provider: string;
      startedAt: string | null;
      expiresAt: string | null;
      autoRenew: boolean;
    };
    plan: PlanItem;
    limits: { maxProfessionalsActive: number };
  } | null>(null);

  const loadData = async (): Promise<void> => {
    if (!accessToken || !activeOrganizationId) return;
    setLoading(true);
    setError('');
    try {
      const [plansResult, subscriptionResult] = await Promise.all([
        organizationApi.listPlans(accessToken),
        organizationApi.getSubscription(accessToken, activeOrganizationId)
      ]);
      setPlans(plansResult);
      setSummary(subscriptionResult);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, activeOrganizationId]);

  const startCheckout = async (planId: string): Promise<void> => {
    if (!accessToken || !activeOrganizationId) return;
    setError('');
    try {
      await organizationApi.checkoutSubscription(accessToken, activeOrganizationId, planId);
      await loadData();
    } catch (cause) {
      setError((cause as Error).message);
    }
  };

  return (
    <main style={{ maxWidth: 980, margin: '2rem auto', padding: '1rem', display: 'grid', gap: '1rem' }}>
      <Card title="Plan y suscripción">
        {loading ? <p>Cargando estado de suscripción...</p> : null}
        {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
        {summary ? (
          <>
            <p><strong>Plan actual:</strong> {summary.plan.name}</p>
            <p><strong>Precio:</strong> {summary.plan.price} {summary.plan.currency}</p>
            <p><strong>Estado:</strong> {summary.subscription.status}</p>
            <p><strong>Límite de profesionales activos:</strong> {summary.limits.maxProfessionalsActive}</p>
            <p><strong>Proveedor:</strong> {summary.subscription.provider}</p>
            <p><strong>Renovación automática:</strong> {summary.subscription.autoRenew ? 'Sí' : 'No'}</p>
            {summary.subscription.expiresAt ? <p><strong>Vence:</strong> {new Date(summary.subscription.expiresAt).toLocaleDateString('es-AR')}</p> : null}
            {['past_due', 'suspended', 'canceled'].includes(summary.subscription.status) ? (
              <p style={{ color: '#9a6700' }}>Tu organización tiene una restricción comercial. Elegí un plan para continuar.</p>
            ) : null}
          </>
        ) : null}
      </Card>

      <Card title="Planes disponibles">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '0.75rem' }}>
          {plans.map((plan) => (
            <Card key={plan.id} title={plan.name}>
              <p>{plan.description ?? 'Sin descripción.'}</p>
              <p><strong>{plan.price} {plan.currency}</strong></p>
              <p>Profesionales activos: {plan.maxProfessionalsActive}</p>
              <button type="button" onClick={() => void startCheckout(plan.id)}>
                {summary?.plan.id === plan.id ? 'Gestionar plan actual' : 'Elegir este plan'}
              </button>
            </Card>
          ))}
        </div>
      </Card>
    </main>
  );
};
