import { Router } from "express";
import {
  createPublicAppointment,
  getClinicAvailability,
  getClinicAvailabilityById,
  listMyAppointments,
  listPublicProfessionals,
  listPublicSpecialties,
  rescheduleMyAppointment,
} from "../controllers/publicController";
import { authOptional, authRequired, patientOnly } from "../middlewares/auth";
import { validateBody, validateQuery } from "../middlewares/validate";
import { availabilityQuerySchema, createPublicAppointmentSchema, rescheduleMyAppointmentSchema } from "../schemas/appointmentSchemas";
import { publicPeopleQuerySchema } from "../schemas/clinicManagementSchemas";

const router = Router();

router.get("/clinics/:slug/availability", validateQuery(availabilityQuerySchema), getClinicAvailability);
router.get("/clinics/by-id/:clinicId/availability", validateQuery(availabilityQuerySchema), getClinicAvailabilityById);
router.get("/clinics/:slug/specialties", listPublicSpecialties);
router.get("/clinics/:slug/professionals", validateQuery(publicPeopleQuerySchema), listPublicProfessionals);
router.post("/clinics/:slug/appointments", authOptional, validateBody(createPublicAppointmentSchema), createPublicAppointment);
router.get("/me/appointments", authRequired, patientOnly, listMyAppointments);
router.post("/me/appointments/:id/reschedule", authRequired, patientOnly, validateBody(rescheduleMyAppointmentSchema), rescheduleMyAppointment);

export default router;
