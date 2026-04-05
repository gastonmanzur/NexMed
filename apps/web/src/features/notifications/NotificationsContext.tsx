import type { ReactElement, ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { patientApi } from '../patient/patient-api';

interface NotificationsContextValue {
  unreadCount: number;
  loadingUnread: boolean;
  refreshUnreadCount: () => Promise<void>;
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

  const value = useMemo<NotificationsContextValue>(
    () => ({ unreadCount, loadingUnread, refreshUnreadCount }),
    [loadingUnread, refreshUnreadCount, unreadCount]
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
