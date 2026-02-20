import { Router } from "express";
import { listPatientNotifications } from "../controllers/notificationController";
import { authRequired, patientOnly } from "../middlewares/auth";

const router = Router();

router.get("/", authRequired, patientOnly, listPatientNotifications);

export default router;
