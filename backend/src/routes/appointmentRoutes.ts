import { Router } from "express";
import { cancelAppointment, confirmAppointment, listAppointments } from "../controllers/appointmentController";
import { authRequired, clinicOnly } from "../middlewares/auth";
import { validateParams, validateQuery } from "../middlewares/validate";
import { appointmentIdParamSchema, listAppointmentsQuerySchema } from "../schemas/appointmentSchemas";

const router = Router();

router.get("/", authRequired, clinicOnly, validateQuery(listAppointmentsQuerySchema), listAppointments);
router.post("/:id/confirm", authRequired, clinicOnly, validateParams(appointmentIdParamSchema), confirmAppointment);
router.patch("/:id/cancel", authRequired, clinicOnly, validateParams(appointmentIdParamSchema), cancelAppointment);

export default router;
