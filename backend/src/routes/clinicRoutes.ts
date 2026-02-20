import { Router } from "express";
import { getMe, updateSettings } from "../controllers/clinicController";
import {
  getClinicNotificationSettings,
  previewClinicNotificationSchedule,
  updateClinicNotificationSettings,
} from "../controllers/notificationController";
import {
  createProfessional,
  createProfessionalTimeOff,
  createSpecialty,
  deleteProfessional,
  deleteProfessionalTimeOff,
  deleteSpecialty,
  getProfessionalAvailability,
  listProfessionalTimeOff,
  listProfessionals,
  listSpecialties,
  putProfessionalAvailability,
  updateProfessional,
  updateSpecialty,
} from "../controllers/clinicManagementController";
import { authRequired, clinicOnly } from "../middlewares/auth";
import { validateBody, validateParams, validateQuery } from "../middlewares/validate";
import { updateSettingsSchema } from "../schemas/clinicSchemas";
import { notificationPreviewQuerySchema, updateNotificationSettingsSchema } from "../schemas/notificationSchemas";
import {
  createProfessionalSchema,
  createSpecialtySchema,
  createTimeOffSchema,
  idParamSchema,
  putAvailabilitySchema,
  professionalIdParamSchema,
  updateProfessionalSchema,
  updateSpecialtySchema,
} from "../schemas/clinicManagementSchemas";

const router = Router();

router.get("/me", authRequired, clinicOnly, getMe);
router.put("/me/settings", authRequired, clinicOnly, validateBody(updateSettingsSchema), updateSettings);
router.get("/notifications/settings", authRequired, clinicOnly, getClinicNotificationSettings);
router.put("/notifications/settings", authRequired, clinicOnly, validateBody(updateNotificationSettingsSchema), updateClinicNotificationSettings);
router.get("/notifications/preview", authRequired, clinicOnly, validateQuery(notificationPreviewQuerySchema), previewClinicNotificationSchedule);
router.get("/specialties", authRequired, clinicOnly, listSpecialties);
router.post("/specialties", authRequired, clinicOnly, validateBody(createSpecialtySchema), createSpecialty);
router.put("/specialties/:id", authRequired, clinicOnly, validateParams(idParamSchema), validateBody(updateSpecialtySchema), updateSpecialty);
router.delete("/specialties/:id", authRequired, clinicOnly, validateParams(idParamSchema), deleteSpecialty);

router.get("/professionals", authRequired, clinicOnly, listProfessionals);
router.post("/professionals", authRequired, clinicOnly, validateBody(createProfessionalSchema), createProfessional);
router.put(
  "/professionals/:id",
  authRequired,
  clinicOnly,
  validateParams(idParamSchema),
  validateBody(updateProfessionalSchema),
  updateProfessional
);
router.delete("/professionals/:id", authRequired, clinicOnly, validateParams(idParamSchema), deleteProfessional);

router.get("/professionals/:id/availability", authRequired, clinicOnly, validateParams(idParamSchema), getProfessionalAvailability);
router.put(
  "/professionals/:id/availability",
  authRequired,
  clinicOnly,
  validateParams(idParamSchema),
  validateBody(putAvailabilitySchema),
  putProfessionalAvailability
);
router.get("/professionals/:id/timeoff", authRequired, clinicOnly, validateParams(idParamSchema), listProfessionalTimeOff);
router.post(
  "/professionals/:id/timeoff",
  authRequired,
  clinicOnly,
  validateParams(idParamSchema),
  validateBody(createTimeOffSchema),
  createProfessionalTimeOff
);
router.delete(
  "/professionals/:id/timeoff/:timeoffId",
  authRequired,
  clinicOnly,
  validateParams(professionalIdParamSchema),
  deleteProfessionalTimeOff
);

export default router;
