import { Router } from "express";
import {
  createClinicInvite,
  ensureDefaultClinicInvite,
  listClinicInvites,
  updateClinicInvite,
} from "../controllers/clinicInvitesController";
import { authRequired, clinicOnly } from "../middlewares/auth";
import { validateBody, validateParams } from "../middlewares/validate";
import { createClinicInviteSchema, idParamSchema, updateClinicInviteSchema } from "../schemas/profileSchemas";

const router = Router();

router.post("/", authRequired, clinicOnly, validateBody(createClinicInviteSchema), createClinicInvite);
router.get("/", authRequired, clinicOnly, listClinicInvites);
router.put("/:id", authRequired, clinicOnly, validateParams(idParamSchema), validateBody(updateClinicInviteSchema), updateClinicInvite);
router.post("/default", authRequired, clinicOnly, ensureDefaultClinicInvite);

export default router;
