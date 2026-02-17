import { Router } from "express";
import {
  createPublicAppointment,
  getClinicAvailability,
  getClinicAvailabilityById,
  listMyAppointments,
  rescheduleMyAppointment,
} from "../controllers/publicController";
import { authRequired, patientOnly } from "../middlewares/auth";
import { validateBody, validateQuery } from "../middlewares/validate";
import { availabilityQuerySchema, createPublicAppointmentSchema, rescheduleMyAppointmentSchema } from "../schemas/appointmentSchemas";

const router = Router();

router.get("/clinics/:slug/availability", validateQuery(availabilityQuerySchema), getClinicAvailability);
router.get("/clinics/by-id/:clinicId/availability", validateQuery(availabilityQuerySchema), getClinicAvailabilityById);
router.post("/clinics/:slug/appointments", validateBody(createPublicAppointmentSchema), createPublicAppointment);
router.get("/me/appointments", authRequired, patientOnly, listMyAppointments);
router.post("/me/appointments/:id/reschedule", authRequired, patientOnly, validateBody(rescheduleMyAppointmentSchema), rescheduleMyAppointment);

export default router;
