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

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export const NotificationsProvider = ({ children }: { children: ReactNode }): ReactElement => {
  const { accessToken } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingUnread, setLoadingUnread] = useState(false);

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
    void onForegroundPushMessage(() => {
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
