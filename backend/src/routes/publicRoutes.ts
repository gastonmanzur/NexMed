import { Router } from "express";
import { createPublicAppointment, getClinicAvailability } from "../controllers/publicController";
import { validateBody, validateQuery } from "../middlewares/validate";
import { availabilityQuerySchema, createPublicAppointmentSchema } from "../schemas/appointmentSchemas";

const router = Router();

router.get("/clinics/:slug/availability", validateQuery(availabilityQuerySchema), getClinicAvailability);
router.post("/clinics/:slug/appointments", validateBody(createPublicAppointmentSchema), createPublicAppointment);

export default router;
