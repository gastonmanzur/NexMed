import { Router } from "express";
import { cancelAppointment, listAppointments } from "../controllers/appointmentController";
import { authRequired } from "../middlewares/auth";
import { validateQuery } from "../middlewares/validate";
import { listAppointmentsQuerySchema } from "../schemas/appointmentSchemas";

const router = Router();

router.get("/", authRequired, validateQuery(listAppointmentsQuerySchema), listAppointments);
router.patch("/:id/cancel", authRequired, cancelAppointment);

export default router;
