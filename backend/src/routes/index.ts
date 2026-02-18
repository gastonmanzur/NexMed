import { Router } from "express";
import authRoutes from "./authRoutes";
import clinicRoutes from "./clinicRoutes";
import publicRoutes from "./publicRoutes";
import appointmentRoutes from "./appointmentRoutes";
import patientClinicRoutes from "./patientClinicRoutes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/clinics", clinicRoutes);
router.use("/clinic", clinicRoutes);
router.use("/public", publicRoutes);
router.use("/appointments", appointmentRoutes);
router.use("/patient/clinics", patientClinicRoutes);

export default router;
