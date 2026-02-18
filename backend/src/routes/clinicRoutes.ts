import { Router } from "express";
import { createInvite, getMe, listInvites, updateSettings } from "../controllers/clinicController";
import { authRequired, clinicOnly } from "../middlewares/auth";
import { validateBody } from "../middlewares/validate";
import { createInviteSchema, updateSettingsSchema } from "../schemas/clinicSchemas";

const router = Router();

router.get("/me", authRequired, clinicOnly, getMe);
router.put("/me/settings", authRequired, clinicOnly, validateBody(updateSettingsSchema), updateSettings);
router.post("/invites", authRequired, clinicOnly, validateBody(createInviteSchema), createInvite);
router.get("/invites", authRequired, clinicOnly, listInvites);

export default router;
