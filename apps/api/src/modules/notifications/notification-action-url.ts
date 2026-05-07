import type { notificationTypes } from './models/notification.model.js';

const APPOINTMENTS_PATH = '/patient/appointments';
const WAITLIST_PATH = '/patient/waitlist';
const NOTIFICATIONS_PATH = '/patient/notifications';

export const resolveNotificationActionUrl = (input: {
  type: (typeof notificationTypes)[number];
  relatedEntityType?: string | null;
}): string => {
  if (input.relatedEntityType === 'waitlist') {
    return WAITLIST_PATH;
  }

  switch (input.type) {
    case 'appointment_booked':
    case 'appointment_reminder':
    case 'appointment_rescheduled':
    case 'appointment_canceled':
      return APPOINTMENTS_PATH;
    case 'availability_alert':
      return WAITLIST_PATH;
    default:
      return NOTIFICATIONS_PATH;
  }
};
