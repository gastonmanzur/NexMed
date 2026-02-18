import { Router } from "express";
import { joinClinic, listMyClinics } from "../controllers/patientClinicController";
import { authRequired, patientOnly } from "../middlewares/auth";
import { validateBody } from "../middlewares/validate";
import { joinClinicSchema } from "../schemas/patientClinicSchemas";

const router = Router();

router.post("/join", authRequired, patientOnly, validateBody(joinClinicSchema), joinClinic);
router.get("/", authRequired, patientOnly, listMyClinics);

export default router;
