import { Router } from "express";
import { getMe, updateSettings } from "../controllers/clinicController";
import { authRequired, clinicOnly } from "../middlewares/auth";
import { validateBody } from "../middlewares/validate";
import { updateSettingsSchema } from "../schemas/clinicSchemas";

const router = Router();

router.get("/me", authRequired, clinicOnly, getMe);
router.put("/me/settings", authRequired, clinicOnly, validateBody(updateSettingsSchema), updateSettings);

export default router;
