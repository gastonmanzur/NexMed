import type { ReactElement } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { paymentsApi } from './payments-api';

type SubscriptionStatus = 'pending' | 'authorized' | 'paused' | 'cancelled' | 'ended';

interface Props {
  accessToken: string;
}

export const MonetizationCard = ({ accessToken }: Props): ReactElement => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [syncingStatus, setSyncingStatus] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [lastStatus, setLastStatus] = useState<string | null>(null);
  const [lastSubscriptionId, setLastSubscriptionId] = useState<string | null>(null);
  const [lastSubscriptionPeriod, setLastSubscriptionPeriod] = useState<'monthly' | 'yearly' | null>(null);
  const [lastSubscriptionStatus, setLastSubscriptionStatus] = useState<SubscriptionStatus | null>(null);

  const openCheckout = (url: string): void => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const onBuy = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const result = await paymentsApi.createOneTime(accessToken, {
        title: 'Compra única Starter',
        amount: 2990,
        currency: 'ARS'
      });
      setLastOrderId(result.orderId);
      setLastStatus(result.status);
      setMessage(t('payments.pending'));
      openCheckout(result.checkoutUrl);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('payments.error'));
    } finally {
      setLoading(false);
    }
  };

  const onSubscribe = async (period: 'monthly' | 'yearly'): Promise<void> => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const result = await paymentsApi.createSubscription(accessToken, {
        planCode: `starter_${period}`,
        title: period === 'monthly' ? 'Starter mensual' : 'Starter anual',
        amount: period === 'monthly' ? 1990 : 19900,
        currency: 'ARS',
        period
      });
      setLastSubscriptionId(result.subscriptionId);
      setLastSubscriptionPeriod(period);
      setLastSubscriptionStatus(result.status as SubscriptionStatus);
      setMessage(t('payments.pending'));
      openCheckout(result.checkoutUrl);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('payments.error'));
    } finally {
      setLoading(false);
    }
  };

  const onRefreshStatus = async (): Promise<void> => {
    if (!lastOrderId) {
      return;
    }

    setSyncingStatus(true);
    setError(null);
    setMessage(null);
    try {
      const result = await paymentsApi.getOrderStatus(accessToken, lastOrderId, true);
      setLastStatus(result.status);
      setMessage(t('payments.statusUpdated'));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('payments.error'));
    } finally {
      setSyncingStatus(false);
    }
  };

  const onRefreshSubscription = async (): Promise<void> => {
    if (!lastSubscriptionId) {
      return;
    }

    setSyncingStatus(true);
    setError(null);
    setMessage(null);
    try {
      const result = await paymentsApi.getMySubscriptionStatus(accessToken, {
        subscriptionId: lastSubscriptionId,
        ...(lastSubscriptionPeriod ? { period: lastSubscriptionPeriod } : {}),
        sync: true
      });
      setLastSubscriptionStatus(result.status);
      setMessage(t('payments.statusUpdated'));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('payments.error'));
    } finally {
      setSyncingStatus(false);
    }
  };

  return (
    <section style={{ marginTop: '1rem', borderTop: '1px solid #ddd', paddingTop: '1rem' }}>
      <h3>{t('payments.title')}</h3>
      <p>{t('payments.subtitle')}</p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button type="button" onClick={onBuy} disabled={loading}>
          {t('payments.buyOneTime')}
        </button>
        <button type="button" onClick={() => void onSubscribe('monthly')} disabled={loading}>
          {t('payments.subscribeMonthly')}
        </button>
        <button type="button" onClick={() => void onSubscribe('yearly')} disabled={loading}>
          {t('payments.subscribeYearly')}
        </button>
        <button type="button" onClick={() => void onRefreshStatus()} disabled={syncingStatus || !lastOrderId}>
          {t('payments.refreshStatus')}
        </button>
        <button type="button" onClick={() => void onRefreshSubscription()} disabled={syncingStatus || !lastSubscriptionId}>
          {t('payments.refreshSubscriptionStatus')}
        </button>
      </div>
      {lastOrderId ? (
        <p>
          {t('payments.lastOrder')}: <code>{lastOrderId}</code>
          <br />
          {t('payments.currentStatus')}: <strong>{lastStatus ?? t('payments.unknown')}</strong>
        </p>
      ) : null}
      {lastSubscriptionId ? (
        <p>
          {t('payments.lastSubscription')}: <code>{lastSubscriptionId}</code>
          <br />
          {t('payments.currentSubscriptionStatus')}: <strong>{lastSubscriptionStatus ?? t('payments.unknown')}</strong>
        </p>
      ) : null}
      {message ? <p style={{ color: 'green' }}>{message}</p> : null}
      {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
    </section>
  );
};
