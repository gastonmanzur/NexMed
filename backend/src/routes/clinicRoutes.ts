import { Router } from "express";
import { createInvite, getMe, listInvites, updateSettings } from "../controllers/clinicController";
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
import { validateBody, validateParams } from "../middlewares/validate";
import { createInviteSchema, updateSettingsSchema } from "../schemas/clinicSchemas";
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
router.post("/invites", authRequired, clinicOnly, validateBody(createInviteSchema), createInvite);
router.get("/invites", authRequired, clinicOnly, listInvites);

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
