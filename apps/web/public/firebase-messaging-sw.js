/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: new URL(self.location.href).searchParams.get('apiKey') ?? "AIzaSyDH9zplIVYxvRZ7zdLfgONXIkFt-Sfh0bI",
  authDomain: new URL(self.location.href).searchParams.get('authDomain') ?? "nexmed-55345.firebaseapp.com",
  projectId: new URL(self.location.href).searchParams.get('projectId') ?? "nexmed-55345",
  messagingSenderId: new URL(self.location.href).searchParams.get('messagingSenderId') ?? "121854653946",
  appId: new URL(self.location.href).searchParams.get('appId') ?? "1:121854653946:web:be666a66dd3f98563be043"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? "Notification";
  const notificationId = payload.data?.notificationId ?? '';
  const focusPath = `/patient/notifications?focus=${encodeURIComponent(notificationId)}`;

  const options = {
    body: payload.notification?.body ?? "",
    data: {
      ...payload.data,
      notificationId,
      focusPath,
      deepLink: payload.data?.deepLink ?? '/patient/notifications'
    }
  };

  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const focusPath = event.notification.data?.focusPath ?? '/patient/notifications';
  const destinationUrl = new URL(focusPath, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({ type: 'nexmed:push-focus', focusPath });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(destinationUrl);
      }
      return undefined;
    })
  );
});
