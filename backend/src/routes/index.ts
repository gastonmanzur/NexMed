import { Router } from "express";
const router = Router();

router.get("/public/app-config", (_req, res) => {
  res.json({ ok: true, name: "NexMed Turnos", version: "0.1.0" });
});

export default router;
