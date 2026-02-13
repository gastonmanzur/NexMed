import { Router } from "express";
import authRoutes from "./authRoutes";
import clinicRoutes from "./clinicRoutes";
import publicRoutes from "./publicRoutes";
import appointmentRoutes from "./appointmentRoutes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/clinics", clinicRoutes);
router.use("/public", publicRoutes);
router.use("/appointments", appointmentRoutes);

export default router;
