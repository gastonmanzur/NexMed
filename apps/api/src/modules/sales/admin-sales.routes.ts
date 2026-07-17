import { Router } from "express";
import { asyncHandler } from "../../core/async-handler.js";
import {
  requireAuth,
  requireGlobalRole,
} from "../auth/middleware/auth.middleware.js";
import { adminSalesController } from "./controllers/admin-sales.controller.js";

export const adminSalesRouter = Router();
adminSalesRouter.use(requireAuth, requireGlobalRole("super_admin"));
adminSalesRouter.get("/", asyncHandler(adminSalesController.list));
adminSalesRouter.post("/", asyncHandler(adminSalesController.create));
adminSalesRouter.get("/:sellerId", asyncHandler(adminSalesController.detail));
adminSalesRouter.patch("/:sellerId", asyncHandler(adminSalesController.update));
adminSalesRouter.post(
  "/:sellerId/invitation",
  asyncHandler(adminSalesController.renewInvitation),
);
