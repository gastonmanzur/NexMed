import { Router } from "express";
import { dedupAppointments, listDuplicateAppointments } from "../controllers/devAppointmentsController";

const router = Router();

router.get("/appointments/duplicates", listDuplicateAppointments);
router.post("/appointments/dedup", dedupAppointments);

export default router;
