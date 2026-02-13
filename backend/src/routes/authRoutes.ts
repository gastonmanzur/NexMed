import { Router } from "express";
import { login, me, register } from "../controllers/authController";
import { authRequired } from "../middlewares/auth";
import { validateBody } from "../middlewares/validate";
import { loginSchema, registerSchema } from "../schemas/authSchemas";

const router = Router();

router.post("/register", validateBody(registerSchema), register);
router.post("/login", validateBody(loginSchema), login);
router.get("/me", authRequired, me);

export default router;
