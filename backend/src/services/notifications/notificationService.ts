export {
  createNotificationIdempotent,
  listNotifications,
  unreadCount,
  markAllRead,
  markRead,
} from "../notificationService";

export { createNotificationIdempotent as createNotification } from "../notificationService";
export { unreadCount as getUnreadCount } from "../notificationService";
