import { Router } from "express";

import { cancelMyAppointment, listMyAppointmentHistory, listMyAppointments, rescheduleMyAppointment } from "../controllers/publicController";
import { authRequired, patientOnly } from "../middlewares/auth";
import { validateBody, validateQuery } from "../middlewares/validate";
import { patientAppointmentHistoryQuerySchema, rescheduleMyAppointmentSchema } from "../schemas/appointmentSchemas";

const router = Router();

router.get("/", authRequired, patientOnly, listMyAppointments);
router.get("/history", authRequired, patientOnly, validateQuery(patientAppointmentHistoryQuerySchema), listMyAppointmentHistory);
router.patch("/:id/cancel", authRequired, patientOnly, cancelMyAppointment);
router.post("/:id/reschedule", authRequired, patientOnly, validateBody(rescheduleMyAppointmentSchema), rescheduleMyAppointment);

export default router;
