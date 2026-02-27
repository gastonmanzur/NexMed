import { Router } from "express";
import { authRequired } from "../middlewares/auth";
import { validateParams, validateQuery } from "../middlewares/validate";
import {
  getInAppUnreadCount,
  listInAppNotifications,
  markInAppRead,
  markInAppReadAll,
} from "../controllers/inAppNotificationController";
import { listNotificationsQuerySchema, notificationIdParamSchema } from "../schemas/notificationApiSchemas";

const router = Router();

router.use((req, _res, next) => {
  if (process.env.NODE_ENV !== "production") {
    console.info("[notifications.api] hit", { method: req.method, path: req.originalUrl, userId: req.auth?.id, userType: req.auth?.type });
  }
  next();
});

router.get("/", authRequired, validateQuery(listNotificationsQuerySchema), listInAppNotifications);
router.get("/unread-count", authRequired, getInAppUnreadCount);
router.post("/:id/read", authRequired, validateParams(notificationIdParamSchema), markInAppRead);
router.post("/read-all", authRequired, markInAppReadAll);

export default router;
