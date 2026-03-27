import type { ChangeEvent, ReactElement } from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@starter/ui';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import { authApi } from '../auth/auth-api';
import { WebPushCard } from '../notifications/WebPushCard';
import { MonetizationCard } from '../payments/MonetizationCard';
import { resolveAvatarUrl } from '../../lib/resolve-avatar-url';

const MAX_SIZE_BYTES = 2_097_152;

export const DashboardPage = (): ReactElement => {
  const { t } = useTranslation();
  const { user, accessToken, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isGoogleUser = user?.provider === 'google';
  const avatarUrl = user?.avatar?.url ? resolveAvatarUrl(user.avatar.url) : null;

  const onAvatarChange = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError(t('profile.avatar.invalidType'));
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setError(t('profile.avatar.invalidSize'));
      return;
    }

    if (!accessToken || !user) {
      return;
    }

    setLoading(true);
    setError(null);
    setFeedback(null);

    try {
      await authApi.uploadMyAvatar(accessToken, file);
      const refreshedUser = await authApi.me(accessToken);
      updateUser(refreshedUser);
      setFeedback(t('profile.avatar.uploadSuccess'));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : t('profile.avatar.unexpectedError'));
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  const onDeleteAvatar = async (): Promise<void> => {
    if (!accessToken || !user) {
      return;
    }

    setLoading(true);
    setError(null);
    setFeedback(null);

    try {
      await authApi.deleteMyAvatar(accessToken);
      const refreshedUser = await authApi.me(accessToken);
      updateUser(refreshedUser);
      setFeedback(t('profile.avatar.deleteSuccess'));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : t('profile.avatar.unexpectedError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 760, margin: '2rem auto', padding: '1rem' }}>
      <Card title={t('profile.title')}>
        <p>{t('profile.greeting', { email: user?.email ?? '-' })}</p>
        <p>{t('profile.role', { role: user?.role ?? '-' })}</p>

        <section>
          <h3>{t('profile.avatar.title')}</h3>

          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={t('profile.avatar.alt')}
              width={96}
              height={96}
              style={{ borderRadius: '50%', objectFit: 'cover', border: '1px solid #ddd' }}
            />
          ) : (
            <p>{t('profile.avatar.empty')}</p>
          )}

          {isGoogleUser ? (
            <p>{t('profile.avatar.googleManaged')}</p>
          ) : (
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={onAvatarChange}
                disabled={loading}
              />
              <button type="button" onClick={onDeleteAvatar} disabled={loading || !user?.avatar?.url}>
                {t('profile.avatar.delete')}
              </button>
            </div>
          )}

          {loading ? <p>{t('profile.avatar.loading')}</p> : null}
          {feedback ? <p style={{ color: 'green' }}>{feedback}</p> : null}
          {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
        </section>

        {accessToken ? <WebPushCard accessToken={accessToken} /> : null}
        {accessToken ? <MonetizationCard accessToken={accessToken} /> : null}

        <Link to="/change-password">{t('profile.changePassword')}</Link>
      </Card>
    </main>
  );
};