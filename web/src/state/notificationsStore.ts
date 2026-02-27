import { getUnreadNotificationsCount, listNotifications } from "../api/notifications";
import { InAppNotification } from "../types";

type NotificationsState = {
  unreadCount: number;
  lastSeenNotificationId: string | null;
};

type Subscriber = (state: NotificationsState) => void;

const state: NotificationsState = {
  unreadCount: 0,
  lastSeenNotificationId: null,
};

const subscribers = new Set<Subscriber>();

function notify() {
  for (const subscriber of subscribers) {
    subscriber({ ...state });
  }
}

export function subscribeNotificationsStore(subscriber: Subscriber) {
  subscribers.add(subscriber);
  subscriber({ ...state });
  return () => subscribers.delete(subscriber);
}

export function getNotificationsState() {
  return { ...state };
}

export function setUnreadCount(unreadCount: number) {
  state.unreadCount = Math.max(0, unreadCount);
  notify();
}

export function setLastSeenNotificationId(notificationId: string | null) {
  state.lastSeenNotificationId = notificationId;
  notify();
}

export async function refreshUnreadCount(token: string) {
  const data = await getUnreadNotificationsCount(token);
  setUnreadCount(data.unreadCount);
  return data.unreadCount;
}

export async function fetchLatestNotifications(token: string, limit = 5) {
  const data = await listNotifications(token, { page: 1, limit });
  const latest = data.items[0];
  if (latest?._id && !state.lastSeenNotificationId) {
    state.lastSeenNotificationId = latest._id;
    notify();
  }
  return data.items as InAppNotification[];
}
