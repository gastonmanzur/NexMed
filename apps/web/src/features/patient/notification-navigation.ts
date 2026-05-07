import type { NotificationDto } from '@starter/shared-types';

const FALLBACK_NOTIFICATIONS_URL = '/patient/notifications';

const isSafeInternalPath = (value: string): boolean => value.startsWith('/') && !value.startsWith('//');

export const resolveNotificationTargetUrl = (notification: NotificationDto): string => {
  if (notification.actionUrl && isSafeInternalPath(notification.actionUrl)) {
    return notification.actionUrl;
  }
  return FALLBACK_NOTIFICATIONS_URL;
};
