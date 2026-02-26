import { Request, Response } from "express";
import { fail, ok } from "../utils/http";
import { NotificationUserType } from "../models/Notification";
import { getUnreadCount, listNotifications, markAllRead, markRead } from "../services/notifications/notificationService";

function getAuthUser(req: Request) {
  if (!req.auth?.id || !req.auth?.type) return null;
  return { userId: req.auth.id, userType: req.auth.type as NotificationUserType };
}

export async function listInAppNotifications(req: Request, res: Response) {
  const authUser = getAuthUser(req);
  if (!authUser) return fail(res, "No autorizado", 401);

  const query = (res.locals.validated?.query ?? req.query) as { page?: number; limit?: number };
  const params: { userId: string; userType: NotificationUserType; page?: number; limit?: number } = {
    userId: authUser.userId,
    userType: authUser.userType,
  };
  if (query.page) params.page = query.page;
  if (query.limit) params.limit = query.limit;

  const result = await listNotifications(params);

  return ok(res, result);
}

export async function getInAppUnreadCount(req: Request, res: Response) {
  const authUser = getAuthUser(req);
  if (!authUser) return fail(res, "No autorizado", 401);

  return ok(res, await getUnreadCount(authUser));
}

export async function markInAppRead(req: Request, res: Response) {
  const authUser = getAuthUser(req);
  if (!authUser) return fail(res, "No autorizado", 401);

  const params = (res.locals.validated?.params ?? req.params) as { id: string };
  const result = await markRead({ ...authUser, notificationId: params.id });

  if (!result.updated) return fail(res, "Notificación no encontrada", 404);
  return ok(res, result.notification);
}

export async function markInAppReadAll(req: Request, res: Response) {
  const authUser = getAuthUser(req);
  if (!authUser) return fail(res, "No autorizado", 401);

  return ok(res, await markAllRead(authUser));
}
