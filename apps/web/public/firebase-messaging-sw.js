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

  const options = {
    body: payload.notification?.body ?? "",
    data: payload.data
  };

  self.registration.showNotification(title, options);
});
