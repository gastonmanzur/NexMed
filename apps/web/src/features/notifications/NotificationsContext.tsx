import type { ReactElement, ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { patientApi } from '../patient/patient-api';
import { initForegroundPushNotifications, onForegroundPushMessage } from './web-push';

interface NotificationsContextValue {
  unreadCount: number;
  loadingUnread: boolean;
  refreshUnreadCount: () => Promise<void>;
  markOneAsReadLocally: () => void;
  markManyAsReadLocally: (amount: number) => void;
}

interface ForegroundBanner {
  title: string;
  body: string;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export const NotificationsProvider = ({ children }: { children: ReactNode }): ReactElement => {
  const { accessToken } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingUnread, setLoadingUnread] = useState(false);
  const [foregroundBanner, setForegroundBanner] = useState<ForegroundBanner | null>(null);

  const refreshUnreadCount = useCallback(async (): Promise<void> => {
    if (!accessToken) {
      setUnreadCount(0);
      return;
    }

    setLoadingUnread(true);
    try {
      const unreadItems = await patientApi.listNotifications(accessToken, 'unread');
      setUnreadCount(unreadItems.length);
    } catch {
      setUnreadCount(0);
    } finally {
      setLoadingUnread(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void refreshUnreadCount();
  }, [refreshUnreadCount]);

  const markOneAsReadLocally = useCallback((): void => {
    setUnreadCount((current) => (current > 0 ? current - 1 : 0));
  }, []);

  const markManyAsReadLocally = useCallback((amount: number): void => {
    if (amount <= 0) {
      return;
    }
    setUnreadCount((current) => Math.max(current - amount, 0));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !accessToken) {
      return;
    }

    const onFocus = () => {
      void refreshUnreadCount();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshUnreadCount();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [accessToken, refreshUnreadCount]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    const interval = window.setInterval(() => {
      void refreshUnreadCount();
    }, 60_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [accessToken, refreshUnreadCount]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    void initForegroundPushNotifications().catch(() => undefined);

    let unsubscribe: (() => void) | null = null;
    void onForegroundPushMessage((payload) => {
      const title = payload.notification?.title ?? 'Nueva notificación';
      const body = payload.notification?.body ?? 'Tenés una nueva actualización.';
      setForegroundBanner({ title, body });
      void refreshUnreadCount();
    })
      .then((listener) => {
        unsubscribe = listener;
      })
      .catch(() => {
        unsubscribe = null;
      });

    return () => {
      unsubscribe?.();
    };
  }, [accessToken, refreshUnreadCount]);

  useEffect(() => {
    if (!foregroundBanner) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setForegroundBanner(null);
    }, 5000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [foregroundBanner]);

  const value = useMemo<NotificationsContextValue>(
    () => ({
      unreadCount,
      loadingUnread,
      refreshUnreadCount,
      markOneAsReadLocally,
      markManyAsReadLocally
    }),
    [loadingUnread, markManyAsReadLocally, markOneAsReadLocally, refreshUnreadCount, unreadCount]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      {foregroundBanner ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            right: '1rem',
            top: '1rem',
            zIndex: 2000,
            maxWidth: '320px',
            background: '#0f172a',
            color: '#f8fafc',
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            boxShadow: '0 8px 20px rgba(15, 23, 42, 0.35)'
          }}
        >
          <strong style={{ display: 'block', marginBottom: '0.25rem' }}>{foregroundBanner.title}</strong>
          <span style={{ fontSize: '0.9rem' }}>{foregroundBanner.body}</span>
        </div>
      ) : null}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = (): NotificationsContextValue => {
  const value = useContext(NotificationsContext);
  if (!value) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return value;
};
