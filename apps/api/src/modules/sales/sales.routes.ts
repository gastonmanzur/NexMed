import { Router } from "express";
import { asyncHandler } from "../../core/async-handler.js";
import { requireAuth } from "../auth/middleware/auth.middleware.js";
import { salesController } from "./controllers/sales.controller.js";

export const salesRouter = Router();
export const publicSalesRouter = Router();
publicSalesRouter.get(
  "/invitations/:token",
  asyncHandler(salesController.invitation),
);
salesRouter.use(requireAuth);
salesRouter.post(
  "/invitations/:token/accept",
  asyncHandler(salesController.accept),
);
salesRouter.get("/dashboard", asyncHandler(salesController.dashboard));
