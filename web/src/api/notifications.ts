import { apiFetch } from "./client";
import { NotificationItem, NotificationListResponse } from "../types";

export const listNotifications = (token: string, page = 1, limit = 50, unreadOnly?: boolean) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (unreadOnly !== undefined) {
    params.set("unreadOnly", unreadOnly ? "1" : "0");
  }

  return apiFetch<NotificationListResponse>(`/notifications?${params.toString()}`, {}, token);
};

export const getUnreadCount = (token: string) => apiFetch<{ unreadCount: number }>(`/notifications/unread-count`, {}, token);

export const markNotificationRead = (token: string, id: string) =>
  apiFetch<NotificationItem>(`/notifications/${id}/read`, { method: "POST" }, token);

export const markAllRead = (token: string) => apiFetch<{ modifiedCount: number }>(`/notifications/read-all`, { method: "POST" }, token);
