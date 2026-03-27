/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDH9zplIVYxvRZ7zdLfgONXIkFt-Sfh0bI",
  authDomain: "nexmed-55345.firebaseapp.com",
  projectId: "nexmed-55345",
  messagingSenderId: "121854653946",
  appId: "1:121854653946:web:be666a66dd3f98563be043"
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
