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

router.post("/invites", authRequired, clinicOnly, validateBody(createClinicInviteSchema), createClinicInvite);
router.get("/invites", authRequired, clinicOnly, listClinicInvites);
router.put("/invites/:id", authRequired, clinicOnly, validateParams(idParamSchema), validateBody(updateClinicInviteSchema), updateClinicInvite);
router.post("/invites/default", authRequired, clinicOnly, ensureDefaultClinicInvite);

export default router;
