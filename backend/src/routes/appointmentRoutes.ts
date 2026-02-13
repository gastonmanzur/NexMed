import { Router } from "express";
import { cancelAppointment, listAppointments } from "../controllers/appointmentController";
import { authRequired, clinicOnly } from "../middlewares/auth";
import { validateQuery } from "../middlewares/validate";
import { listAppointmentsQuerySchema } from "../schemas/appointmentSchemas";

const router = Router();

router.get("/", authRequired, clinicOnly, validateQuery(listAppointmentsQuerySchema), listAppointments);
router.patch("/:id/cancel", authRequired, clinicOnly, cancelAppointment);

export default router;
