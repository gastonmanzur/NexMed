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

interface AppliedDiscount {
  valid: true;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  currency: string;
  message: string;
}

export const OrganizationSubscriptionPage = (): ReactElement => {
  const { accessToken, activeOrganizationId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checkoutLoadingPlanId, setCheckoutLoadingPlanId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [didRunPastDueFallbackSync, setDidRunPastDueFallbackSync] = useState(false);
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [discountCode, setDiscountCode] = useState('');
  const [discountLoading, setDiscountLoading] = useState(false);
  const [discountMessage, setDiscountMessage] = useState('');
  const [discountError, setDiscountError] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscount | null>(null);
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

  useEffect(() => {
    if (!accessToken || !activeOrganizationId || !summary) return;
    if (didRunPastDueFallbackSync) return;
    if (summary.subscription.provider !== 'mercadopago' || summary.subscription.status !== 'past_due') return;

    setDidRunPastDueFallbackSync(true);
    setMessage('Verificando estado de tu suscripción con Mercado Pago...');
    void loadData({ forceSync: true });
  }, [accessToken, activeOrganizationId, didRunPastDueFallbackSync, summary]);

  const money = (amount: number, currency: string): string => new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(amount);

  const resetDiscount = (): void => {
    setDiscountCode('');
    setAppliedDiscount(null);
    setDiscountMessage('Código removido. El precio vuelve al valor original.');
    setDiscountError('');
  };

  const applyDiscount = async (planId: string): Promise<void> => {
    if (!accessToken || !activeOrganizationId) return;
    const code = discountCode.trim();
    if (!code) {
      setDiscountError('Ingresá un código para validarlo.');
      setAppliedDiscount(null);
      return;
    }

    setSelectedPlanId(planId);
    setDiscountLoading(true);
    setDiscountError('');
    setDiscountMessage('');
    setAppliedDiscount(null);

    try {
      const result = await organizationApi.validateSubscriptionDiscount(accessToken, activeOrganizationId, planId, code);
      if (!result.valid || !result.code || !result.discountType || result.discountValue === undefined || result.originalAmount === undefined || result.discountAmount === undefined || result.finalAmount === undefined || !result.currency) {
        setDiscountError(result.message || 'El código no es válido o ya expiró.');
        return;
      }

      setAppliedDiscount({
        valid: true,
        code: result.code,
        discountType: result.discountType,
        discountValue: result.discountValue,
        originalAmount: result.originalAmount,
        discountAmount: result.discountAmount,
        finalAmount: result.finalAmount,
        currency: result.currency,
        message: result.message
      });
      setDiscountMessage(result.message);
    } catch (cause) {
      setDiscountError((cause as Error).message);
    } finally {
      setDiscountLoading(false);
    }
  };

  const startCheckout = async (planId: string): Promise<void> => {
    if (!accessToken || !activeOrganizationId) return;
    setError('');
    setMessage('');
    setCheckoutLoadingPlanId(planId);
    try {
      const result = await organizationApi.checkoutSubscription(accessToken, activeOrganizationId, planId, selectedPlanId === planId ? appliedDiscount?.code : undefined);

      if (result.requiresPayment === false) {
        setMessage(result.message ?? 'Suscripción activada correctamente.');
        await loadData({ forceSync: true });
        window.history.replaceState(null, '', result.redirectUrl ?? '/app/subscription');
        return;
      }
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
                <p className="nx-subscription-price">{money(plan.price, plan.currency)}<span>/mes</span></p>
                <p>{plan.description ?? 'Plan para gestionar la operación de tu centro.'}</p>
                <ul className="nx-subscription-benefits">
                  <li>Hasta {plan.maxProfessionalsActive} profesionales activos</li>
                  <li>Gestión de turnos y agenda</li>
                  <li>Soporte de suscripción</li>
                </ul>
                {selectedPlanId === plan.id ? (
                  <section className="nx-discount-box" aria-label="Código de descuento">
                    <div className="nx-discount-box__header">
                      <strong>Código de descuento</strong>
                      {appliedDiscount ? <span className="nx-badge">Aplicado</span> : null}
                    </div>
                    <div className="nx-discount-box__actions">
                      <input
                        type="text"
                        value={discountCode}
                        disabled={discountLoading || !!appliedDiscount}
                        placeholder="Ej: CODIGO30"
                        onChange={(event) => setDiscountCode(event.target.value.toUpperCase())}
                      />
                      {appliedDiscount ? (
                        <button type="button" className="nx-btn-secondary" onClick={resetDiscount}>Quitar</button>
                      ) : (
                        <button type="button" className="nx-btn-secondary" disabled={discountLoading} onClick={() => void applyDiscount(plan.id)}>
                          {discountLoading ? 'Validando...' : 'Aplicar'}
                        </button>
                      )}
                    </div>
                    {discountMessage ? <p className="nx-discount-box__success">{discountMessage}</p> : null}
                    {discountError ? <p className="nx-discount-box__error">{discountError}</p> : null}
                    <div className="nx-discount-summary">
                      <span>Precio original</span><strong>{money(appliedDiscount?.originalAmount ?? plan.price, plan.currency)}</strong>
                      <span>Descuento aplicado</span><strong>-{money(appliedDiscount?.discountAmount ?? 0, plan.currency)}</strong>
                      <span>Total a pagar</span><strong>{money(appliedDiscount?.finalAmount ?? plan.price, plan.currency)}</strong>
                    </div>
                    {appliedDiscount?.finalAmount === 0 ? <p className="nx-discount-box__free">Tu suscripción se activará sin pago y sin redirección a Mercado Pago.</p> : null}
                  </section>
                ) : (
                  <button type="button" className="nx-btn-secondary" onClick={() => { setSelectedPlanId(plan.id); setDiscountCode(''); setAppliedDiscount(null); setDiscountError(''); setDiscountMessage(''); }}>
                    Tengo un código de descuento
                  </button>
                )}
                <button
                  type="button"
                  className={isCurrent ? 'nx-btn-secondary' : 'nx-btn'}
                  disabled={checkoutLoadingPlanId !== null}
                  onClick={() => void startCheckout(plan.id)}
                >
                  {checkoutLoadingPlanId === plan.id
                    ? (appliedDiscount?.finalAmount === 0 && selectedPlanId === plan.id ? 'Activando plan...' : 'Iniciando checkout...')
                    : appliedDiscount?.finalAmount === 0 && selectedPlanId === plan.id
                      ? 'Activar suscripción'
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
