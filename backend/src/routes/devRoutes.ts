import { Router } from "express";
import { triggerAppointmentRemindersNow } from "../controllers/notificationController";
import { dedupAppointments, listDuplicateAppointments } from "../controllers/devAppointmentsController";
import { validateParams } from "../middlewares/validate";
import { triggerAppointmentRemindersNowParamsSchema } from "../schemas/notificationSchemas";

const router = Router();

router.post("/reminders/trigger-now/:appointmentId", validateParams(triggerAppointmentRemindersNowParamsSchema), triggerAppointmentRemindersNow);
router.get("/appointments/duplicates", listDuplicateAppointments);
router.post("/appointments/dedup", dedupAppointments);

export default router;
