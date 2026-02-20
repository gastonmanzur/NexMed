import { Router } from "express";
import { triggerAppointmentRemindersNow } from "../controllers/notificationController";
import { validateParams } from "../middlewares/validate";
import { triggerAppointmentRemindersNowParamsSchema } from "../schemas/notificationSchemas";

const router = Router();

router.post("/reminders/trigger-now/:appointmentId", validateParams(triggerAppointmentRemindersNowParamsSchema), triggerAppointmentRemindersNow);

export default router;
