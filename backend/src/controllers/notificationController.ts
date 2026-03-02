import { Request, Response } from "express";
import { fail, ok } from "../utils/http";
import { getUnreadCount, listNotifications, markAllRead, markRead } from "../services/notificationService";

export async function getNotifications(req: Request, res: Response) {
  const auth = req.auth;
  if (!auth) return fail(res, "No autorizado", 401);

  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 50);
  const unreadOnly = ["1", "true"].includes(String(req.query.unreadOnly ?? "0"));

  const data = await listNotifications({
    userId: auth.id,
    userType: auth.type,
    page,
    limit,
    unreadOnly,
  });

  return ok(res, data);
}

export async function getNotificationUnreadCount(req: Request, res: Response) {
  const auth = req.auth;
  if (!auth) return fail(res, "No autorizado", 401);

  const data = await getUnreadCount({ userId: auth.id, userType: auth.type });
  return ok(res, data);
}

export async function markNotificationRead(req: Request, res: Response) {
  const auth = req.auth;
  if (!auth) return fail(res, "No autorizado", 401);

  const data = await markRead({
    userId: auth.id,
    userType: auth.type,
    notificationId: String(req.params.id),
  });

  if (!data) return fail(res, "Notificación no encontrada", 404);
  return ok(res, data);
}

export async function markAllNotificationsRead(req: Request, res: Response) {
  const auth = req.auth;
  if (!auth) return fail(res, "No autorizado", 401);

  const data = await markAllRead({ userId: auth.id, userType: auth.type });
  return ok(res, data);
}
