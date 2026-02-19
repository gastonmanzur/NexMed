import { Router } from "express";
import { getProfile, updateProfile } from "../controllers/profileController";
import { authRequired } from "../middlewares/auth";
import { validateBody } from "../middlewares/validate";
import { updateClinicProfileSchema, updatePatientProfileSchema } from "../schemas/profileSchemas";

const router = Router();

router.get("/", authRequired, getProfile);
router.put("/", authRequired, (req, res, next) => {
  if (req.auth?.type === "clinic") {
    return validateBody(updateClinicProfileSchema)(req, res, next);
  }
  if (req.auth?.type === "patient") {
    return validateBody(updatePatientProfileSchema)(req, res, next);
  }
  return res.status(403).json({ ok: false, error: "No autorizado" });
}, updateProfile);

export default router;
