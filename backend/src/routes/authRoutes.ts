import { Router } from "express";
import { googleLogin, login, me, register } from "../controllers/authController";
import { authRequired } from "../middlewares/auth";
import { validateBody } from "../middlewares/validate";
import { googleLoginSchema, loginSchema, registerSchema } from "../schemas/authSchemas";

const router = Router();

router.post("/register", validateBody(registerSchema), register);
router.post("/login", validateBody(loginSchema), login);
router.post("/google", validateBody(googleLoginSchema), googleLogin);
router.get("/me", authRequired, me);

export default router;
