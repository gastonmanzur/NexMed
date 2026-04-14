import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@starter/ui';
import { notificationsApi } from './notifications-api';
import { getWebNotificationPermission, initForegroundPushNotifications, requestWebPushToken } from './web-push';

interface Props {
  accessToken: string;
}

const WEB_PUSH_TOKEN_STORAGE_KEY = 'starter_web_push_token';

const readStoredToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(WEB_PUSH_TOKEN_STORAGE_KEY);
};

const storeToken = (token: string): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(WEB_PUSH_TOKEN_STORAGE_KEY, token);
};

const clearStoredToken = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(WEB_PUSH_TOKEN_STORAGE_KEY);
};

export const WebPushCard = ({ accessToken }: Props): ReactElement => {
  const { t } = useTranslation();
  const [permission, setPermission] = useState(getWebNotificationPermission());
  const [token, setToken] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resolveActiveWebToken = async (): Promise<string | null> => {
    const storedToken = readStoredToken();
    if (storedToken) {
      return storedToken;
    }

    const devices = await notificationsApi.listMyDevices(accessToken);
    const webDevice = devices.find((device) => device.platform === 'web' && device.channel === 'web_push' && device.status === 'active') ?? null;

    if (!webDevice) {
      return null;
    }

    storeToken(webDevice.token);
    return webDevice.token;
  };

  useEffect(() => {
    const restoreToken = async (): Promise<void> => {
      try {
        await initForegroundPushNotifications();
      } catch {
        // Ignore foreground push listener init errors to avoid blocking dashboard rendering.
      }

      try {
        const activeToken = await resolveActiveWebToken();
        setToken(activeToken);
      } catch {
        setToken(null);
      }
    };

    void restoreToken();
  }, [accessToken]);

  const onEnable = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const nextToken = await requestWebPushToken();
      await notificationsApi.registerDevice(accessToken, { token: nextToken, platform: 'web', channel: 'web_push' });
      storeToken(nextToken);
      setToken(nextToken);
      setPermission(getWebNotificationPermission());
      setMessage(t('profile.push.enabled'));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('profile.push.error'));
      setPermission(getWebNotificationPermission());
    } finally {
      setLoading(false);
    }
  };

  const onDisable = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const tokenToDisable = token ?? (await resolveActiveWebToken());
      if (!tokenToDisable) {
        setMessage(t('profile.push.disabled'));
        clearStoredToken();
        setToken(null);
        return;
      }

      await notificationsApi.unregisterDevice(accessToken, tokenToDisable);
      clearStoredToken();
      setToken(null);
      setMessage(t('profile.push.disabled'));
    } catch (disableError) {
      setError(disableError instanceof Error ? disableError.message : t('profile.push.error'));
    } finally {
      setLoading(false);
    }
  };



  return (
    <Card title={t('profile.push.title')}>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="nx-btn"
          onClick={() => void onEnable()}
          disabled={loading || permission === 'unsupported'}
        >
          {t('profile.push.enable')}
        </button>
        <button
          type="button"
          className="nx-btn-secondary"
          onClick={() => void onDisable()}
          disabled={loading}
        >
          {t('profile.push.disable')}
        </button>
      </div>
      {message ? <p style={{ color: 'green' }}>{message}</p> : null}
      {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
    </Card>
  );
};
