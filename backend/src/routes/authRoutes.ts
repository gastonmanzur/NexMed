import { Router } from "express";
import { loginClinic, registerClinic } from "../controllers/authController";
import { validateBody } from "../middlewares/validate";
import { loginSchema, registerSchema } from "../schemas/authSchemas";

const router = Router();

router.post("/register", validateBody(registerSchema), registerClinic);
router.post("/login", validateBody(loginSchema), loginClinic);

export default router;
