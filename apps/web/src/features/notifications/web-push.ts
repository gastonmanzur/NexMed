import { getFirebaseApp } from '../../lib/firebase-client';
import { getMessaging, getToken, isSupported, onMessage, type MessagePayload } from 'firebase/messaging';

const vapidKey = import.meta.env.VITE_FIREBASE_WEB_PUSH_VAPID_KEY;

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

let foregroundListenerInitialized = false;

const getFirebaseMessaging = async () => {
  const supported = await isSupported();
  if (!supported) {
    throw new Error('Web push is not supported in this browser');
  }

  const app = getFirebaseApp();
  return getMessaging(app);
};

export const getWebNotificationPermission = (): NotificationPermissionState => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
};

export const requestWebPushToken = async (): Promise<string> => {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notifications permission denied');
  }

  const messaging = await getFirebaseMessaging();
  const token = await getToken(messaging, { vapidKey });
  if (!token) {
    throw new Error('Could not obtain web push token');
  }

  return token;
};

export const initForegroundPushNotifications = async (): Promise<void> => {
  if (foregroundListenerInitialized || typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  const messaging = await getFirebaseMessaging();
  onMessage(messaging, (payload: MessagePayload) => {
    const title = payload.notification?.title ?? 'Notification';
    const body = payload.notification?.body ?? '';

    if (Notification.permission === 'granted') {
      void new Notification(title, { body, data: payload.data });
    }
  });

  foregroundListenerInitialized = true;
};
