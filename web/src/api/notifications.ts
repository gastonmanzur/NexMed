import { InAppNotification, PaginatedNotifications } from "../types";
import { apiFetch } from "./client";

export const listNotifications = (token: string, params?: { page?: number; limit?: number; unreadOnly?: boolean }) => {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.unreadOnly) query.set("unreadOnly", "1");
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch<PaginatedNotifications>(`/notifications${suffix}`, {}, token);
};

export const getUnreadNotificationsCount = (token: string) => apiFetch<{ unreadCount: number }>("/notifications/unread-count", {}, token);

export const markNotificationRead = (token: string, id: string) =>
  apiFetch<InAppNotification>(`/notifications/${encodeURIComponent(id)}/read`, { method: "POST" }, token);

export const markAllNotificationsRead = (token: string) =>
  apiFetch<{ updated: number }>("/notifications/read-all", { method: "POST" }, token);
