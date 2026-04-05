import { getFirebaseApp } from '../../lib/firebase-client';
import { getMessaging, getToken, isSupported, onMessage, type MessagePayload } from 'firebase/messaging';

const vapidKey = import.meta.env.VITE_FIREBASE_WEB_PUSH_VAPID_KEY;
const firebaseMessagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
const firebaseApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const firebaseAuthDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
const firebaseProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const firebaseAppId = import.meta.env.VITE_FIREBASE_APP_ID;

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

let foregroundListenerInitialized = false;
let serviceWorkerRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

const registerMessagingServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  const configParams = new URLSearchParams({
    apiKey: firebaseApiKey,
    authDomain: firebaseAuthDomain,
    projectId: firebaseProjectId,
    messagingSenderId: firebaseMessagingSenderId,
    appId: firebaseAppId
  });

  return navigator.serviceWorker.register(`/firebase-messaging-sw.js?${configParams.toString()}`);
};

const getMessagingServiceWorkerRegistration = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!serviceWorkerRegistrationPromise) {
    serviceWorkerRegistrationPromise = registerMessagingServiceWorker();
  }

  return serviceWorkerRegistrationPromise;
};

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
  if (!vapidKey) {
    throw new Error('Web push VAPID key is missing');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notifications permission denied');
  }

  const messaging = await getFirebaseMessaging();
  const serviceWorkerRegistration = await getMessagingServiceWorkerRegistration();
  const token = await getToken(messaging, {
    vapidKey,
    ...(serviceWorkerRegistration ? { serviceWorkerRegistration } : {})
  });
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
  await getMessagingServiceWorkerRegistration();
  onMessage(messaging, (payload: MessagePayload) => {
    const title = payload.notification?.title ?? 'Notification';
    const body = payload.notification?.body ?? '';

    if (Notification.permission === 'granted') {
      void new Notification(title, { body, data: payload.data });
    }
  });

  foregroundListenerInitialized = true;
};

export const onForegroundPushMessage = async (handler: (payload: MessagePayload) => void): Promise<(() => void) | null> => {
  const messaging = await getFirebaseMessaging();
  await getMessagingServiceWorkerRegistration();
  return onMessage(messaging, handler);
};
