import { Router } from "express";
import authRoutes from "./authRoutes";
import clinicRoutes from "./clinicRoutes";
import publicRoutes from "./publicRoutes";
import appointmentRoutes from "./appointmentRoutes";
import patientClinicRoutes from "./patientClinicRoutes";
import patientAppointmentRoutes from "./patientAppointmentRoutes";
import profileRoutes from "./profileRoutes";
import clinicInviteRoutes from "./clinicInviteRoutes";
import devRoutes from "./devRoutes";
import notificationRoutes from "./notificationRoutes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/clinics", clinicRoutes);
router.use("/clinic", clinicRoutes);
router.use("/public", publicRoutes);
router.use("/appointments", appointmentRoutes);
router.use("/notifications", notificationRoutes);
router.use("/patient/clinics", patientClinicRoutes);
router.use("/patient/appointments", patientAppointmentRoutes);
router.use("/profile", profileRoutes);
router.use("/clinic", clinicInviteRoutes);
if (process.env.NODE_ENV !== "production") {
  router.use("/dev", devRoutes);
}

export default router;
