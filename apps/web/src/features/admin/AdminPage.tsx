import type { CSSProperties, ChangeEvent, ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@starter/ui';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import { adminApi, type AdminAvatarItem, type AdminDashboardSummary, type AdminPaymentItem, type AdminSubscriptionItem, type AdminUserItem, type MonetizationConfig } from './admin-api';

type AdminSection = 'dashboard' | 'users' | 'payments' | 'subscriptions' | 'notifications' | 'avatars' | 'monetization';

const tableWrapper: CSSProperties = { overflowX: 'auto', width: '100%' };
const tableStyle: CSSProperties = { width: '100%', borderCollapse: 'collapse', minWidth: 640 };

export const AdminPage = (): ReactElement => {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const [section, setSection] = useState<AdminSection>('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [dashboard, setDashboard] = useState<AdminDashboardSummary | null>(null);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [payments, setPayments] = useState<AdminPaymentItem[]>([]);
  const [subscriptions, setSubscriptions] = useState<AdminSubscriptionItem[]>([]);
  const [avatars, setAvatars] = useState<AdminAvatarItem[]>([]);
  const [monetizationConfig, setMonetizationConfig] = useState<MonetizationConfig | null>(null);
  const [notificationForm, setNotificationForm] = useState({ targetUserId: '', title: '', body: '' });

  const sections = useMemo<Array<{ id: AdminSection; label: string }>>(
    () => [
      { id: 'dashboard', label: t('admin.navigation.dashboard') },
      { id: 'users', label: t('admin.navigation.users') },
      { id: 'payments', label: t('admin.navigation.payments') },
      { id: 'subscriptions', label: t('admin.navigation.subscriptions') },
      { id: 'notifications', label: t('admin.navigation.notifications') },
      { id: 'avatars', label: t('admin.navigation.avatars') },
      { id: 'monetization', label: t('admin.navigation.monetization') }
    ],
    [t]
  );

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    const loadSection = async (): Promise<void> => {
      setLoading(true);
      setError(null);
      setSuccess(null);
      try {
        if (section === 'dashboard') setDashboard(await adminApi.getDashboard(accessToken));
        if (section === 'users') setUsers((await adminApi.listUsers(accessToken, new URLSearchParams({ page: '1', limit: '20' }))).items);
        if (section === 'payments') setPayments((await adminApi.listPayments(accessToken, new URLSearchParams({ page: '1', limit: '20' }))).items);
        if (section === 'subscriptions') {
          setSubscriptions((await adminApi.listSubscriptions(accessToken, new URLSearchParams({ page: '1', limit: '20' }))).items);
        }
        if (section === 'avatars') setAvatars((await adminApi.listAvatars(accessToken, new URLSearchParams({ page: '1', limit: '20', hasAvatar: 'true' }))).items);
        if (section === 'monetization') setMonetizationConfig(await adminApi.getMonetizationConfig(accessToken));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : t('admin.common.loadError'));
      } finally {
        setLoading(false);
      }
    };

    void loadSection();
  }, [accessToken, section, t]);

  const updateNotificationField =
    (field: 'targetUserId' | 'title' | 'body') =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
      setNotificationForm((current) => ({ ...current, [field]: event.target.value }));
    };

  const onSendNotification = async (): Promise<void> => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await adminApi.sendNotification(accessToken, notificationForm);
      setSuccess(t('admin.notifications.success'));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t('admin.notifications.error'));
    } finally {
      setLoading(false);
    }
  };

  const onRoleChange = async (userId: string, role: 'admin' | 'user'): Promise<void> => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await adminApi.updateUserRole(accessToken, userId, role);
      setUsers((current) => current.map((user) => (user.id === userId ? { ...user, role } : user)));
      setSuccess(t('admin.users.roleUpdated'));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : t('admin.common.actionError'));
    } finally {
      setLoading(false);
    }
  };

  const onDeleteAvatar = async (userId: string): Promise<void> => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await adminApi.deleteAvatar(accessToken, userId);
      setAvatars((current) => current.filter((item) => item.userId !== userId));
      setSuccess(t('admin.avatars.deleted'));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : t('admin.common.actionError'));
    } finally {
      setLoading(false);
    }
  };

  const onUpdateMonetization = async (next: MonetizationConfig): Promise<void> => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await adminApi.updateMonetizationConfig(accessToken, next);
      setMonetizationConfig(updated);
      setSuccess(t('admin.monetization.updated'));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : t('admin.common.actionError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 1100, margin: '1.5rem auto', padding: '1rem' }}>
      <Card title={t('admin.title')}>
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '220px 1fr' }}>
          <nav style={{ display: 'grid', gap: '0.5rem' }}>
            {sections.map((item) => (
              <button key={item.id} type="button" onClick={() => setSection(item.id)} disabled={loading}>
                {item.label}
              </button>
            ))}
          </nav>
          <section>
            {loading ? <p>{t('admin.common.loading')}</p> : null}
            {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
            {success ? <p style={{ color: 'green' }}>{success}</p> : null}

            {section === 'dashboard' && dashboard ? (
              <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))' }}>
                <Card title={t('admin.dashboard.totalUsers')}><p>{dashboard.users}</p></Card>
                <Card title={t('admin.dashboard.adminUsers')}><p>{dashboard.adminUsers}</p></Card>
                <Card title={t('admin.dashboard.payments')}><p>{dashboard.payments}</p></Card>
                <Card title={t('admin.dashboard.subscriptions')}><p>{dashboard.subscriptions}</p></Card>
                <Card title={t('admin.dashboard.pushDevices')}><p>{dashboard.pushDevices}</p></Card>
                <Card title={t('admin.dashboard.usersWithAvatar')}><p>{dashboard.usersWithAvatar}</p></Card>
              </div>
            ) : null}

            {section === 'users' ? (
              <div style={tableWrapper}><table style={tableStyle}><thead><tr><th>{t('admin.users.email')}</th><th>{t('admin.users.role')}</th><th>{t('admin.users.provider')}</th><th>{t('admin.users.verified')}</th><th>{t('admin.users.actions')}</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td>{user.email}</td><td>{user.role}</td><td>{user.provider}</td><td>{user.emailVerified ? t('admin.common.yes') : t('admin.common.no')}</td><td><button type="button" onClick={() => void onRoleChange(user.id, user.role === 'admin' ? 'user' : 'admin')}>{t('admin.users.toggleRole')}</button></td></tr>)}</tbody></table></div>
            ) : null}

            {section === 'payments' ? (
              <div style={tableWrapper}><table style={tableStyle}><thead><tr><th>ID</th><th>{t('admin.payments.user')}</th><th>{t('admin.payments.type')}</th><th>{t('admin.payments.status')}</th><th>{t('admin.payments.amount')}</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id}><td>{payment.id}</td><td>{payment.userEmail ?? payment.userId}</td><td>{payment.type}</td><td>{payment.status}</td><td>{payment.amount} {payment.currency}</td></tr>)}</tbody></table></div>
            ) : null}

            {section === 'subscriptions' ? (
              <div style={tableWrapper}><table style={tableStyle}><thead><tr><th>ID</th><th>{t('admin.subscriptions.user')}</th><th>{t('admin.subscriptions.period')}</th><th>{t('admin.subscriptions.status')}</th><th>{t('admin.subscriptions.externalReference')}</th></tr></thead><tbody>{subscriptions.map((item) => <tr key={item.id}><td>{item.id}</td><td>{item.userEmail ?? item.userId}</td><td>{item.period}</td><td>{item.status}</td><td>{item.externalReference}</td></tr>)}</tbody></table></div>
            ) : null}

            {section === 'notifications' ? (
              <div style={{ display: 'grid', gap: '0.5rem', maxWidth: 520 }}>
                <input placeholder={t('admin.notifications.targetUserPlaceholder')} value={notificationForm.targetUserId} onChange={updateNotificationField('targetUserId')} />
                <input placeholder={t('admin.notifications.titlePlaceholder')} value={notificationForm.title} onChange={updateNotificationField('title')} />
                <textarea placeholder={t('admin.notifications.bodyPlaceholder')} value={notificationForm.body} onChange={updateNotificationField('body')} />
                <button type="button" onClick={() => void onSendNotification()} disabled={loading}>{t('admin.notifications.submit')}</button>
              </div>
            ) : null}

            {section === 'avatars' ? (
              <div style={tableWrapper}><table style={tableStyle}><thead><tr><th>{t('admin.avatars.user')}</th><th>{t('admin.avatars.avatar')}</th><th>{t('admin.avatars.actions')}</th></tr></thead><tbody>{avatars.map((item) => <tr key={item.userId}><td>{item.email}</td><td>{item.avatarUrl ? <img src={item.avatarUrl} alt={t('admin.avatars.imageAlt')} width={52} height={52} style={{ borderRadius: '50%' }} /> : t('admin.avatars.noAvatar')}</td><td><button type="button" onClick={() => void onDeleteAvatar(item.userId)}>{t('admin.avatars.delete')}</button></td></tr>)}</tbody></table></div>
            ) : null}

            {section === 'monetization' && monetizationConfig ? (
              <div style={{ display: 'grid', gap: '0.5rem', maxWidth: 420 }}>
                <label>
                  {t('admin.monetization.mode')}
                  <select value={monetizationConfig.monetizationMode} onChange={(event) => setMonetizationConfig((current) => current ? { ...current, monetizationMode: event.target.value as MonetizationConfig['monetizationMode'] } : current)}>
                    <option value="one_time_only">one_time_only</option>
                    <option value="subscriptions_only">subscriptions_only</option>
                    <option value="both">both</option>
                  </select>
                </label>
                <label>
                  {t('admin.monetization.periodMode')}
                  <select value={monetizationConfig.subscriptionPeriodMode} onChange={(event) => setMonetizationConfig((current) => current ? { ...current, subscriptionPeriodMode: event.target.value as MonetizationConfig['subscriptionPeriodMode'] } : current)}>
                    <option value="monthly">monthly</option>
                    <option value="yearly">yearly</option>
                    <option value="both">both</option>
                  </select>
                </label>
                <button type="button" onClick={() => void onUpdateMonetization(monetizationConfig)}>{t('admin.monetization.save')}</button>
              </div>
            ) : null}
          </section>
        </div>
      </Card>
    </main>
  );
};
