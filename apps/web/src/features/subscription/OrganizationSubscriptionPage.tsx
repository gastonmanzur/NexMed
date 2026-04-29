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

type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'suspended' | 'canceled';

export const OrganizationSubscriptionPage = (): ReactElement => {
  const { accessToken, activeOrganizationId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checkoutLoadingPlanId, setCheckoutLoadingPlanId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
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

  const loadData = async (options?: { forceSync?: boolean }): Promise<void> => {
    if (!accessToken || !activeOrganizationId) return;
    setLoading(true);
    setError('');
    try {
      const [plansResult, subscriptionResult] = await Promise.all([
        organizationApi.listPlans(accessToken),
        organizationApi.getSubscription(accessToken, activeOrganizationId, {
          sync: options?.forceSync ?? false
        })
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

  useEffect(() => {
    if (!accessToken || !activeOrganizationId) return;

    const params = new URLSearchParams(window.location.search);
    const checkoutStatus = params.get('status');
    const preapprovalId = params.get('preapproval_id');
    const cameFromCheckout = checkoutStatus === 'success' || checkoutStatus === 'pending' || Boolean(preapprovalId);

    if (!cameFromCheckout) return;

    let isMounted = true;
    const startedAt = Date.now();
    const maxDurationMs = 60_000;
    const pollEveryMs = 4_000;

    const poll = async (): Promise<void> => {
      if (!isMounted) return;

      setIsConfirmingPayment(true);
      setMessage('Estamos confirmando tu pago con Mercado Pago...');

      try {
        const next = await organizationApi.getSubscription(accessToken, activeOrganizationId, { sync: true });
        if (!isMounted) return;

        setSummary(next);

        if (next.subscription.status !== 'past_due') {
          setIsConfirmingPayment(false);
          setMessage(next.subscription.status === 'active' ? '¡Pago confirmado! Tu suscripción ya está activa.' : 'Actualizamos el estado de tu suscripción.');
          return;
        }

        if (Date.now() - startedAt >= maxDurationMs) {
          setIsConfirmingPayment(false);
          setMessage('Seguimos esperando la confirmación final del pago. Podés usar "Actualizar estado" en unos segundos.');
          return;
        }

        window.setTimeout(() => {
          void poll();
        }, pollEveryMs);
      } catch (cause) {
        if (!isMounted) return;
        setIsConfirmingPayment(false);
        setError((cause as Error).message);
      }
    };

    void poll();

    return () => {
      isMounted = false;
    };
  }, [accessToken, activeOrganizationId]);

  const startCheckout = async (planId: string): Promise<void> => {
    if (!accessToken || !activeOrganizationId) return;
    setError('');
    setMessage('');
    setCheckoutLoadingPlanId(planId);
    try {
      const result = await organizationApi.checkoutSubscription(accessToken, activeOrganizationId, planId);
      const checkoutUrl = [result.checkoutUrl, result.url, result.initPoint]
        .find((value): value is string => typeof value === 'string' && /^https?:\/\//i.test(value.trim()));

      if (!checkoutUrl) {
        throw new Error('No se pudo obtener una URL de checkout válida desde el backend. Contactá soporte para revisar Mercado Pago.');
      }

      setMessage('Redirigiendo a Mercado Pago...');
      window.location.href = checkoutUrl;
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setCheckoutLoadingPlanId(null);
    }
  };

  const requiresSubscription = !!summary && ['trial', 'past_due', 'suspended', 'canceled'].includes(summary.subscription.status);

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

    if (summary.subscription.status === 'trial') {
      return {
        label: 'Suscripción pendiente de activación',
        tone: 'warn',
        message: 'Esta organización requiere un plan pago para operar sin restricciones.'
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
        {message ? <p style={{ color: '#1f6f43' }}>{message}</p> : null}

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
            {isConfirmingPayment ? <p style={{ color: '#7a5d00' }}>Estamos confirmando tu pago...</p> : null}
            {requiresSubscription ? (
              <button type="button" className="nx-btn" onClick={() => {
                const target = document.getElementById('planes-disponibles');
                target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}>
                Suscribirme ahora
              </button>
            ) : (
              <button type="button" className="nx-btn-secondary" onClick={() => void loadData({ forceSync: true })}>
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
                  disabled={checkoutLoadingPlanId !== null}
                  onClick={() => void startCheckout(plan.id)}
                >
                  {checkoutLoadingPlanId === plan.id
                    ? 'Iniciando checkout...'
                    : isCurrent
                      ? 'Renovar / actualizar plan'
                      : 'Elegir este plan'}
                </button>
              </Card>
            );
          })}
        </div>
      </Card>
    </main>
  );
};
