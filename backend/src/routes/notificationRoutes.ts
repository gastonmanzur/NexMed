import { Router } from "express";
import {
  getNotifications,
  getNotificationUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "../controllers/notificationController";
import { authRequired } from "../middlewares/auth";

const router = Router();

router.get("/", authRequired, getNotifications);
router.get("/unread-count", authRequired, getNotificationUnreadCount);
router.post("/:id/read", authRequired, markNotificationRead);
router.post("/read-all", authRequired, markAllNotificationsRead);

export default router;
