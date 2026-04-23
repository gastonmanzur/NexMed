import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
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

type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'suspended' | 'canceled';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const getTrialDaysRemaining = (expiresAt: string | null): number | null => {
  if (!expiresAt) return null;
  const expiresMs = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresMs)) return null;

  return Math.ceil((expiresMs - Date.now()) / DAY_IN_MS);
};

export const OrganizationSubscriptionPage = (): ReactElement => {
  const { accessToken, activeOrganizationId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [summary, setSummary] = useState<{
    subscription: {
      id: string;
      status: SubscriptionStatus;
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

  const trialDaysRemaining = useMemo(
    () => getTrialDaysRemaining(summary?.subscription.expiresAt ?? null),
    [summary?.subscription.expiresAt]
  );

  const hasExpiredTrial = summary?.subscription.status === 'trial' && trialDaysRemaining !== null && trialDaysRemaining <= 0;

  const requiresSubscription = !!summary && (
    hasExpiredTrial
    || ['past_due', 'suspended', 'canceled'].includes(summary.subscription.status)
  );

  const statusMeta: { label: string; tone: 'active' | 'warn' | 'danger'; message: string } = (() => {
    if (!summary) {
      return {
        label: 'Sin datos',
        tone: 'warn',
        message: 'No pudimos cargar el estado de la suscripción de tu organización.'
      };
    }

    if (summary.subscription.status === 'active') {
      return {
        label: 'Suscripción activa',
        tone: 'active',
        message: `Tu organización opera con el plan ${summary.plan.name}.`
      };
    }

    if (hasExpiredTrial) {
      return {
        label: 'Prueba gratuita vencida',
        tone: 'danger',
        message: 'Tu prueba gratuita terminó. Elegí un plan pago para continuar sin restricciones.'
      };
    }

    if (summary.subscription.status === 'trial') {
      return {
        label: 'Prueba gratuita activa',
        tone: 'active',
        message: trialDaysRemaining === null
          ? 'Tu organización está en prueba gratuita.'
          : `Te quedan ${trialDaysRemaining} día${trialDaysRemaining === 1 ? '' : 's'} de prueba gratuita.`
      };
    }

    if (summary.subscription.status === 'past_due') {
      return {
        label: 'Pago pendiente',
        tone: 'danger',
        message: 'Hay un pago pendiente. Actualizá tu plan para recuperar el estado activo.'
      };
    }

    if (summary.subscription.status === 'suspended') {
      return {
        label: 'Suscripción suspendida',
        tone: 'danger',
        message: 'Tu suscripción está suspendida. Elegí un plan para reactivar la cuenta.'
      };
    }

    return {
      label: 'Suscripción cancelada',
      tone: 'warn',
      message: 'Tu suscripción fue cancelada. Elegí un plan pago para continuar.'
    };
  })();

  return (
    <main className="nx-page nx-subscription-page">
      <Card title="Suscripción del centro" subtitle="Sin plan gratuito permanente: tu centro necesita una suscripción paga para operar sin restricciones.">
        {loading ? <p>Cargando estado de suscripción...</p> : null}
        {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}

        {summary ? (
          <section className={`nx-subscription-status nx-subscription-status--${statusMeta.tone}`}>
            <div>
              <span className="nx-subscription-status__badge">{statusMeta.label}</span>
              <p className="nx-subscription-status__message">{statusMeta.message}</p>
              <p><strong>Plan actual:</strong> {summary.plan.name}</p>
              <p><strong>Estado:</strong> {summary.subscription.status}</p>
              <p><strong>Límite de profesionales activos:</strong> {summary.limits.maxProfessionalsActive}</p>
              {summary.subscription.expiresAt ? <p><strong>Vence:</strong> {new Date(summary.subscription.expiresAt).toLocaleDateString('es-AR')}</p> : null}
            </div>
            {requiresSubscription ? (
              <button type="button" className="nx-btn" onClick={() => {
                const target = document.getElementById('planes-disponibles');
                target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}>
                Suscribirme ahora
              </button>
            ) : (
              <button type="button" className="nx-btn-secondary" onClick={() => void loadData()}>
                Actualizar estado
              </button>
            )}
          </section>
        ) : null}
      </Card>

      <Card title="Planes disponibles" subtitle="Todos los planes son pagos y se activan al iniciar la suscripción.">
        <div id="planes-disponibles" className="nx-subscription-grid">
          {plans.map((plan) => {
            const isCurrent = summary?.plan.id === plan.id;
            const isRecommended = plan.code === 'growth';
            const isStarter = plan.code === 'starter';

            return (
              <Card key={plan.id} title={plan.name} className="nx-subscription-plan-card">
                <div className="nx-subscription-plan-badges">
                  {isCurrent ? <span className="nx-badge">Plan actual</span> : null}
                  {isRecommended ? <span className="nx-badge">Recomendado</span> : null}
                  {isStarter ? <span className="nx-badge">Ideal para consultorios</span> : null}
                </div>
                <p className="nx-subscription-price">{plan.price} {plan.currency}<span>/mes</span></p>
                <p>{plan.description ?? 'Plan para gestionar la operación de tu centro.'}</p>
                <ul className="nx-subscription-benefits">
                  <li>Hasta {plan.maxProfessionalsActive} profesionales activos</li>
                  <li>Gestión de turnos y agenda</li>
                  <li>Soporte de suscripción</li>
                </ul>
                <button
                  type="button"
                  className={isCurrent ? 'nx-btn-secondary' : 'nx-btn'}
                  onClick={() => void startCheckout(plan.id)}
                >
                  {isCurrent ? 'Gestionar plan actual' : 'Elegir este plan'}
                </button>
              </Card>
            );
          })}
        </div>
      </Card>
    </main>
  );
};
